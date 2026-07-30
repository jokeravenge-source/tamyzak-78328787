import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STUDY_CHARS = 180000;
// Most capable PDF/document-reading models first, then fallbacks.
// Available to every user (no premium gating) — the client may request one
// explicitly, otherwise we try each in order until one succeeds.
const AI_MODELS = [
  "google/gemini-2.5-pro",
  "openai/gpt-5.6-sol",
  "google/gemini-3.5-flash",
  "openai/gpt-5.4-mini",
] as const;
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_PAGE_IMAGES = 20;

const cleanExtractedText = (value: unknown) => {
  if (typeof value !== "string") return "";
  return value
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, MAX_STUDY_CHARS);
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { text, pageImages, fileData, fileName, count, language, model: requestedModel } = await req.json();
    const lang0 = language === "ar" ? "ar" : "en";
    const ent = await claimFeature(req, "mcq");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), { status: ent.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const images = Array.isArray(pageImages) ? pageImages.filter((image) => typeof image === "string" && image.startsWith("data:image/")).slice(0, MAX_PAGE_IMAGES) : [];
    const pdfData = typeof fileData === "string" && fileData.startsWith("data:application/pdf;base64,")
      ? fileData
      : "";
    const content = cleanExtractedText(text);
    if (!content && !images.length && !pdfData) {
      return new Response(JSON.stringify({ error: "Missing study material" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const n = Math.max(1, Math.min(100, Number(count) || 10));
    const lang = language === "ar" ? "Arabic" : "English";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are an expert science/academic quiz generator. Generate exactly ${n} high-quality multiple choice questions in ${lang} based STRICTLY and EXCLUSIVELY on the scientific content of the attached PDF / provided study material. Treat the source as the single source of truth.

STRICT SOURCE-GROUNDING RULES:
- Every question, every correct answer, and every explanation MUST be directly traceable to a specific sentence, formula, diagram, table, reaction, or numeric value that appears in the source. If a fact is not in the source, do NOT ask about it.
- Do NOT use outside knowledge, prior training, common textbook facts, or "well-known" information that is not explicitly stated in the source — even if you know it is true.
- Do NOT paraphrase into general science trivia. Stay on the exact scientific topics, terminology, and level of the uploaded material.
- Focus EXCLUSIVELY on the scientific/technical content: definitions, laws, formulas, constants, mechanisms, reactions, processes, terminology, cause-and-effect, numeric problems, diagrams, classifications, and specific facts stated in the source.
- Do NOT write general knowledge, common-sense, opinion, motivational, historical trivia, current-events, or vague/generic questions.
- Do NOT ask meta questions about the document itself (title, author, chapter number, page numbers, "what is this chapter about", "what does the book discuss").
- Distractors must be plausible, same-topic, same-scientific-domain wrong answers — ideally other terms/values that also appear in the source. Never random or off-topic.
- If the readable scientific content is insufficient to produce ${n} strictly-grounded questions, produce fewer rather than inventing content. Never fabricate.

Each question must have 4 distinct choices, one correct answer, a short helpful hint (without revealing the answer), and a clear explanation whose reasoning is drawn from the source. Return ONLY valid JSON, no markdown.`;

    const hasPdf = Boolean(pdfData);
    const userPrompt = `Study material text extracted from the file:\n\n${content || "(No reliable selectable text. Read the attached original PDF or page images.)"}\n\n${hasPdf ? "The original PDF is attached. Read it directly, including Arabic text, scanned pages, diagrams, equations, and tables, and use it as the primary source." : images.length ? `Attached are ${images.length} rendered page images. Perform OCR and use all readable scientific content.` : ""}\n\nGenerate exactly ${n} scientific MCQs in ${lang} strictly about topics present in the source. If part of the source is unreadable, use the readable scientific content; do not invent unrelated facts.`;
    const userContent = hasPdf
      ? [
          { type: "text", text: userPrompt },
          {
            type: "file",
            file: {
              filename: typeof fileName === "string" && fileName.toLowerCase().endsWith(".pdf") ? fileName.slice(0, 200) : "study-material.pdf",
              file_data: pdfData,
            },
          },
        ]
      : images.length
        ? [
            { type: "text", text: userPrompt },
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
          ]
        : userPrompt;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_mcqs",
              description: "Submit generated multiple choice questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        choices: { type: "array", items: { type: "string" }, minItems: 4, maxItems: 4 },
                        answer_index: { type: "integer", minimum: 0, maximum: 3 },
                        hint: { type: "string" },
                        explanation: { type: "string" },
                      },
                      required: ["question", "choices", "answer_index", "hint", "explanation"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_mcqs" } },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const data = await res.json();
    const msg = data.choices?.[0]?.message;
    const toolCall = msg?.tool_calls?.[0];
    let parsed: any = null;
    const rawArgs = toolCall?.function?.arguments;
    if (rawArgs) {
      if (typeof rawArgs === "string") {
        try { parsed = JSON.parse(rawArgs); } catch (e) {
          console.error("generate-mcq: tool args JSON.parse failed", String(e), rawArgs.slice(0, 300));
          const s = rawArgs.indexOf("{");
          const en = rawArgs.lastIndexOf("}");
          if (s !== -1 && en !== -1) {
            try { parsed = JSON.parse(rawArgs.slice(s, en + 1)); } catch { /* ignore */ }
          }
        }
      } else if (typeof rawArgs === "object") {
        parsed = rawArgs;
      }
    }
    if (!parsed && typeof msg?.content === "string") {
      const raw = msg.content.trim();
      // Strip markdown code fences (```json ... ``` or ``` ``` `json ... ` ` ` variants)
      const cleaned = raw
        .replace(/^`+\s*`*\s*`*\s*json/i, "")
        .replace(/^```json/i, "")
        .replace(/^```/, "")
        .replace(/```$/, "")
        .replace(/`+\s*$/, "")
        .trim();
      const start = cleaned.indexOf("{");
      const end = cleaned.lastIndexOf("}");
      if (start !== -1 && end !== -1) {
        try { parsed = JSON.parse(cleaned.slice(start, end + 1)); } catch { /* ignore */ }
      }
    }
    if (!parsed || !Array.isArray(parsed.questions) || !parsed.questions.length) {
      console.error("generate-mcq: no parseable questions", JSON.stringify(data).slice(0, 500));
      return new Response(JSON.stringify({
        error: "No readable scientific content was found in the file. Try a clearer PDF or a PDF with selectable text.",
      }), { status: 422, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Shuffle choices per question so the correct answer is not biased to a single position
    if (parsed && Array.isArray(parsed.questions)) {
      parsed.questions = parsed.questions.map((q: any) => {
        if (!q || !Array.isArray(q.choices) || q.choices.length !== 4) return q;
        const correct = q.choices[q.answer_index];
        const indices = [0, 1, 2, 3];
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const shuffled = indices.map((idx) => q.choices[idx]);
        return { ...q, choices: shuffled, answer_index: shuffled.indexOf(correct) };
      });
    }
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});