import { protect } from "../_shared/guard.ts";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-3-flash-preview";
const MAX_TEXT_CHARS = 6000;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await protect(req, "solve-physics-problem", { max: 8, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { text, image_url, language } = await req.json();
    const lang = language === "ar" ? "ar" : "en";

    const ent = await claimFeature(req, "physics_solver");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const hasText = typeof text === "string" && text.trim().length > 0;
    const hasImage = typeof image_url === "string" && image_url.startsWith("http");
    if (!hasText && !hasImage) {
      return new Response(JSON.stringify({ error: "Missing problem text or image" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const cleanedText = hasText ? text.slice(0, MAX_TEXT_CHARS) : "";
    const langLabel = lang === "ar" ? "Arabic" : "English";

    const systemPrompt = `You are an expert physics tutor for high-school students. Solve the given physics problem step-by-step in ${langLabel}. Identify the physical law used, show the steps clearly, and give the final answer with its unit. Return ONLY valid JSON, no markdown.`;

    const userContent = hasImage
      ? [
          { type: "text", text: cleanedText || "Solve this physics problem step-by-step." },
          { type: "image_url", image_url: { url: image_url } },
        ]
      : cleanedText;

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
              name: "submit_solution",
              description: "Submit a structured physics solution",
              parameters: {
                type: "object",
                properties: {
                  law: { type: "string", description: "Name of the physical law used" },
                  steps: {
                    type: "array",
                    items: { type: "string" },
                    description: "Step-by-step solution in the requested language",
                  },
                  answer: { type: "string", description: "Final numerical or symbolic answer" },
                  unit: { type: "string", description: "Unit of the answer" },
                },
                required: ["law", "steps", "answer", "unit"],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_solution" } },
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
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
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
      return new Response(JSON.stringify({ error: "No solution generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
    return new Response(JSON.stringify({
      law: parsed.law || "",
      steps: Array.isArray(parsed.steps) ? parsed.steps : [String(parsed.steps)],
      answer: String(parsed.answer ?? ""),
      unit: String(parsed.unit ?? ""),
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
