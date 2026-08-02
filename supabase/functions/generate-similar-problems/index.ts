import { protect } from "../_shared/guard.ts";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";
const MAX_TEXT_CHARS = 12000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await protect(req, "generate-similar-problems", { max: 8, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { text, image_url, count, language } = await req.json();
    const lang = language === "ar" ? "ar" : "en";
    const n = Math.min(20, Math.max(3, Number(count) || 10));

    const ent = await claimFeature(req, "problem_generator");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasText = typeof text === "string" && text.trim().length > 0;
    const hasImage =
      typeof image_url === "string" &&
      (image_url.startsWith("http") || image_url.startsWith("data:image/"));
    if (!hasText && !hasImage) {
      return new Response(JSON.stringify({ error: "Missing source text or image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanedText = hasText ? text.slice(0, MAX_TEXT_CHARS) : "";
    const langLabel = lang === "ar" ? "Arabic" : "English";

    const systemPrompt = `You are an expert problem-writing assistant. The user will share a source that contains one or more problems (from a textbook, worksheet, or exam). Study the source carefully and understand:
- the topic / subject
- the difficulty level
- the phrasing style, tone, and structure
- the type of numbers, variables, or context used
- any given/required format

Then produce EXACTLY ${n} BRAND NEW problems that mimic the same STYLE, DIFFICULTY, TOPIC, and STRUCTURE as the source, but with different numbers, contexts, or wordings. Do NOT copy problems from the source verbatim. Every problem must include a full, correct, step-by-step solution.

Write everything in ${langLabel}. Return ONLY the tool call with valid JSON.`;

    const userInstruction = lang === "ar"
      ? `المصدر التالي يحتوي على مسائل. ولّد ${n} مسألة جديدة بنفس النمط والصعوبة والموضوع، مع حل مفصل خطوة بخطوة لكل مسألة.`
      : `The following source contains problems. Generate ${n} new problems in the same style, difficulty, and topic, each with a full step-by-step solution.`;

    const userContent: any = hasImage
      ? [
          { type: "text", text: `${userInstruction}${cleanedText ? `\n\nExtra text from source:\n${cleanedText}` : ""}` },
          { type: "image_url", image_url: { url: image_url } },
        ]
      : `${userInstruction}\n\nSOURCE:\n${cleanedText}`;

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

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
              name: "submit_problems",
              description: "Submit generated problems with solutions",
              parameters: {
                type: "object",
                properties: {
                  problems: {
                    type: "array",
                    minItems: 1,
                    items: {
                      type: "object",
                      properties: {
                        statement: { type: "string", description: "The new problem statement" },
                        solution: { type: "string", description: "Full step-by-step solution with final answer" },
                      },
                      required: ["statement", "solution"],
                      additionalProperties: false,
                    },
                  },
                },
                required: ["problems"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_problems" } },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) {
      return new Response(JSON.stringify({ error: "No problems generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    const problems = Array.isArray(parsed.problems)
      ? parsed.problems
          .map((p: any) => ({
            statement: String(p?.statement ?? "").trim(),
            solution: String(p?.solution ?? "").trim(),
          }))
          .filter((p: any) => p.statement.length > 0)
          .slice(0, n)
      : [];

    return new Response(JSON.stringify({ problems }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
