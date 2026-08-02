import { protect } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STUDY_CHARS = 180000;
const AI_MODEL = "google/gemini-2.5-flash";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const MAX_PAGE_IMAGES = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "essay-coach", { max: 8, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const body = await req.json();
    const mode = body.mode as "generate" | "grade";
    const language = body.language === "ar" ? "Arabic" : "English";
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "generate") {
      const ent = await claimFeature(req, "essay");
      if (!ent.ok) {
        return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), { status: ent.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const text = String(body.text || "").slice(0, MAX_STUDY_CHARS);
      const images = Array.isArray(body.pageImages) ? body.pageImages.filter((image) => typeof image === "string" && image.startsWith("data:image/")).slice(0, MAX_PAGE_IMAGES) : [];
      const n = Math.max(1, Math.min(10, Number(body.count) || 5));
      if ((!text || text.trim().length < 50) && !images.length) {
        return new Response(JSON.stringify({ error: "Not enough text" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const systemPrompt = `You are an expert science exam writer. Generate exactly ${n} open-ended SCIENTIFIC essay questions in ${language} based STRICTLY and ONLY on the provided study material. ABSOLUTE RULES:\n- Do NOT introduce any facts, examples, definitions, names, formulas, or concepts that are not explicitly present in the material.\n- Every question MUST be answerable using ONLY the material provided.\n- Focus on scientific reasoning: explanations of phenomena, causes/effects, processes, mechanisms, comparisons, definitions, derivations, applications, and analysis of scientific concepts found in the material.\n- Each question must require an explanatory paragraph answer (not yes/no, not one word).\n- The reference_answer MUST be derived word-for-meaning from the material only, with no outside information.\nReturn ONLY via the tool call.`;
      const userPrompt = `Study material text extracted from the file (use ONLY this content and the attached page images, nothing else):\n\n${text || "No selectable text was extracted. Use the attached page images."}\n\n${images.length ? "Attached page images are sampled from the PDF. Read/OCR them and use them together with the extracted text." : ""}\n\nGenerate ${n} scientific essay questions in ${language} grounded strictly in the provided material.`;
      const userContent = images.length
        ? [
            { type: "text", text: userPrompt },
            ...images.map((url) => ({ type: "image_url", image_url: { url } })),
          ]
        : userPrompt;
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userContent },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_questions",
              description: "Submit essay questions",
              parameters: {
                type: "object",
                properties: {
                  questions: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        reference_answer: { type: "string", description: "Model answer derived strictly from the material" },
                      },
                      required: ["question", "reference_answer"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["questions"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_questions" } },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        const status = res.status === 429 || res.status === 402 ? res.status : 500;
        return new Response(JSON.stringify({ error: errText }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) return new Response(JSON.stringify({ error: "No questions" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const parsed = JSON.parse(tc.function.arguments);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "grade") {
      const question = String(body.question || "");
      const reference = String(body.reference || "");
      const answer = String(body.answer || "");
      const systemPrompt = `You are a strict but fair exam grader. Rate the student's answer from 1 to 10 based on accuracy, completeness, and clarity, comparing it against the reference answer and the question. Respond ONLY via tool call in ${language}.`;
      const userPrompt = `Question:\n${question}\n\nReference answer:\n${reference}\n\nStudent answer:\n${answer}\n\nGrade from 1 to 10 and give brief feedback.`;
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_grade",
              description: "Submit a grade",
              parameters: {
                type: "object",
                properties: {
                  score: { type: "integer", minimum: 1, maximum: 10 },
                  feedback: { type: "string" },
                },
                required: ["score", "feedback"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_grade" } },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        const status = res.status === 429 || res.status === 402 ? res.status : 500;
        return new Response(JSON.stringify({ error: errText }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) return new Response(JSON.stringify({ error: "No grade" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const parsed = JSON.parse(tc.function.arguments);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "correct") {
      const ent = await claimFeature(req, "essay");
      if (!ent.ok) {
        return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), { status: ent.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const studentText = String(body.studentText || "").slice(0, MAX_STUDY_CHARS);
      const keyText = String(body.keyText || "").slice(0, MAX_STUDY_CHARS);
      const studentImages = Array.isArray(body.studentImages) ? body.studentImages.filter((u) => typeof u === "string" && u.startsWith("data:image/")).slice(0, MAX_PAGE_IMAGES) : [];
      const keyImages = Array.isArray(body.keyImages) ? body.keyImages.filter((u) => typeof u === "string" && u.startsWith("data:image/")).slice(0, MAX_PAGE_IMAGES) : [];
      if ((!studentText && !studentImages.length) || (!keyText && !keyImages.length)) {
        return new Response(JSON.stringify({ error: "Missing files" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const systemPrompt = `You are an expert exam corrector. You receive TWO documents:\n1) The student's handwritten/typed answer sheet (may be images or text). OCR the images and read every answer carefully.\n2) The official answer key (PDF text and/or images).\n\nYour job:\n- Identify each question/item in the answer key.\n- For each item, find the student's matching answer (by number/order/topic).\n- Compare them and assign a score. Default max per item is 10 unless the key indicates a different mark; if so use that.\n- Be fair: give partial credit for partially correct answers; full marks for equivalent wording.\n- Provide a short, helpful feedback line for each item in ${language}.\n- Provide one overall comment in ${language}.\n- If a question has no student answer, score 0 and note it as missing.\n- Respond ONLY via the tool call. Total must equal the sum of item scores; max must equal the sum of item maxes.`;
      const parts: any[] = [
        { type: "text", text: `STUDENT ANSWER SHEET (text, may be empty if only images):\n${studentText || "(none)"}\n\nANSWER KEY (text, may be empty if only images):\n${keyText || "(none)"}\n\nImages below are the page scans. Earlier images = student sheet, later images = answer key. Student image count: ${studentImages.length}. Key image count: ${keyImages.length}.` },
        ...studentImages.map((url) => ({ type: "image_url", image_url: { url } })),
        ...keyImages.map((url) => ({ type: "image_url", image_url: { url } })),
      ];
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: AI_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: parts },
          ],
          tools: [{
            type: "function",
            function: {
              name: "submit_correction",
              description: "Submit the full correction",
              parameters: {
                type: "object",
                properties: {
                  items: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        question: { type: "string" },
                        student_answer: { type: "string" },
                        correct_answer: { type: "string" },
                        score: { type: "number" },
                        max: { type: "number" },
                        feedback: { type: "string" },
                      },
                      required: ["question", "student_answer", "correct_answer", "score", "max", "feedback"],
                      additionalProperties: false,
                    },
                  },
                  total: { type: "number" },
                  max: { type: "number" },
                  overall: { type: "string" },
                },
                required: ["items", "total", "max", "overall"],
                additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_correction" } },
        }),
      });
      if (!res.ok) {
        const errText = await res.text();
        const status = res.status === 429 || res.status === 402 ? res.status : 500;
        return new Response(JSON.stringify({ error: errText }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await res.json();
      const tc = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!tc) return new Response(JSON.stringify({ error: "No correction" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      const parsed = JSON.parse(tc.function.arguments);
      return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});