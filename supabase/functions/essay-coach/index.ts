const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_STUDY_CHARS = 180000;
const AI_MODEL = "gemini-2.5-pro";
const AI_URL = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
const MAX_PAGE_IMAGES = 20;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const body = await req.json();
    const mode = body.mode as "generate" | "grade";
    const language = body.language === "ar" ? "Arabic" : "English";
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    if (mode === "generate") {
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
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
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
        headers: { Authorization: `Bearer ${GEMINI_API_KEY}`, "Content-Type": "application/json" },
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

    return new Response(JSON.stringify({ error: "Invalid mode" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});