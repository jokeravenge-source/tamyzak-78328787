import { protect } from "../_shared/guard.ts";
import { requireUser } from "../_shared/auth.ts";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_MODEL = "google/gemini-2.5-flash";
const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "english-essay-check", { max: 8, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
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
    const prompt = String(body.prompt || "").slice(0, 500);
    const modelEssay = String(body.model_essay || "").slice(0, 5000);
    const essay = String(body.essay || "").slice(0, 8000);
    if (essay.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Essay is too short." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const systemPrompt = `You are a strict but fair Iraqi 6th-grade English (ministerial-level) composition teacher. The student is trying to reproduce a REQUIRED ministerial composition from memory. You receive the official MODEL essay and the student's written essay. Your job:

1. Compare the student's essay against the MODEL essay. The student is expected to reproduce the MODEL closely (memorization).
2. Identify EVERY mistake: spelling, grammar, tenses, articles (a/an/the), prepositions, subject-verb agreement, punctuation, capitalization, word choice, sentence structure, AND any missing or wrong sentences vs the model.
3. For each mistake, return: the wrong fragment (exactly as written by the student, or "(missing)" if the student left it out), the correct fragment from the model, a short reason in Arabic so the Iraqi student understands.
4. Produce a fully corrected version of the essay that matches the official model (with the student's overall flow preserved when possible).
5. Give scores out of 10 for: grammar, spelling, vocabulary, structure/cohesion, content (how closely it matches the model). Then overall /10.
6. Write short feedback in Arabic (2-4 sentences) telling the student which parts they missed or got wrong and what to memorize.

Be honest. Do NOT invent mistakes. Do NOT miss real mistakes. If the student's essay matches the model perfectly, return an empty mistakes array and score 10s. Return ONLY via the tool call.`;

    const userPrompt = `Topic: ${topic || "(not specified)"}
Question: ${prompt || "(not specified)"}

OFFICIAL MODEL ESSAY (ground truth — student should reproduce this):
"""
${modelEssay || "(none provided)"}
"""

STUDENT'S ESSAY:
"""
${essay}
"""`;

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