import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

  try {
    const { text, pageImages, count, language } = await req.json();
    const lang0 = language === "ar" ? "ar" : "en";
    // Daily limit removed
    const images = Array.isArray(pageImages) ? pageImages.filter((image) => typeof image === "string" && image.startsWith("data:image/")).slice(0, MAX_PAGE_IMAGES) : [];
    if ((!text || typeof text !== "string") && !images.length) {
      return new Response(JSON.stringify({ error: "Missing study material" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const n = Math.max(1, Math.min(100, Number(count) || 10));
    const lang = language === "ar" ? "Arabic" : "English";

    const content = typeof text === "string" ? text.slice(0, MAX_STUDY_CHARS) : "";

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const systemPrompt = `You are an expert quiz generator. Generate exactly ${n} high-quality multiple choice questions in ${lang} based ONLY on the provided study material. Each question must have 4 distinct choices, one correct answer, a short helpful hint (without revealing the answer) and a clear explanation derived from the material. Return ONLY valid JSON, no markdown.`;

    const userPrompt = `Study material text extracted from the file:\n\n${content || "No selectable text was extracted. Use the attached page images."}\n\n${images.length ? "Attached page images are sampled from the PDF. Read/OCR them and use them together with the extracted text." : ""}\n\nGenerate ${n} MCQs in ${lang}.`;
    const userContent = images.length
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
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No questions generated" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify(parsed), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});