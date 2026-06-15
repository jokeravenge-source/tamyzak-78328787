import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_MODEL = "google/gemini-2.5-flash";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ent = await claimFeature(req, "english_essay");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const body = await req.json();
    const topic = String(body.topic || "").slice(0, 200);
    const essay = String(body.essay || "").slice(0, 8000);
    if (essay.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Essay is too short." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a strict but fair Iraqi 6th-grade English (ministerial-level) composition teacher. The student writes a short English essay (around 80-150 words). Your job:

1. Identify EVERY mistake: spelling, grammar, tenses, articles (a/an/the), prepositions, subject-verb agreement, punctuation, capitalization, word choice, sentence structure.
2. For each mistake, give: the wrong fragment, the correct fragment, a short reason in Arabic (so the Iraqi student understands).
3. Produce a fully corrected version of the essay (same ideas, fixed English).
4. Give scores out of 10 for: grammar, spelling, vocabulary, structure/cohesion, content/relevance to topic. Then total /50 and overall /10.
5. Write a short feedback message in Arabic (2-4 sentences) with concrete tips.

Be honest. Do NOT invent mistakes that aren't there, and do NOT miss real mistakes. Return ONLY via the tool call.`;

    const userPrompt = `Topic: ${topic || "(not specified)"}\n\nStudent essay:\n"""\n${essay}\n"""`;

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
            name: "submit_review",
            description: "Submit the corrected essay and scoring",
            parameters: {
              type: "object",
              properties: {
                mistakes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      wrong: { type: "string" },
                      correct: { type: "string" },
                      reason_ar: { type: "string", description: "Explanation in Arabic" },
                      kind: {
                        type: "string",
                        enum: ["spelling", "grammar", "tense", "article", "preposition", "agreement", "punctuation", "capitalization", "word_choice", "structure"],
                      },
                    },
                    required: ["wrong", "correct", "reason_ar", "kind"],
                    additionalProperties: false,
                  },
                },
                corrected_essay: { type: "string" },
                scores: {
                  type: "object",
                  properties: {
                    grammar: { type: "integer", minimum: 0, maximum: 10 },
                    spelling: { type: "integer", minimum: 0, maximum: 10 },
                    vocabulary: { type: "integer", minimum: 0, maximum: 10 },
                    structure: { type: "integer", minimum: 0, maximum: 10 },
                    content: { type: "integer", minimum: 0, maximum: 10 },
                    overall: { type: "integer", minimum: 0, maximum: 10 },
                  },
                  required: ["grammar", "spelling", "vocabulary", "structure", "content", "overall"],
                  additionalProperties: false,
                },
                feedback_ar: { type: "string" },
              },
              required: ["mistakes", "corrected_essay", "scores", "feedback_ar"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_review" } },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      const status = res.status === 429 || res.status === 402 ? res.status : 500;
      return new Response(JSON.stringify({ error: errText }), {
        status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await res.json();
    const tc = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tc) {
      return new Response(JSON.stringify({ error: "No review returned" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(tc.function.arguments);
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});