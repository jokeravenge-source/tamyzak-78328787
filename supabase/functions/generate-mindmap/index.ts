const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CHARS = 120000;

const SYSTEM_PROMPT =
  "You are a master information architect. Build a hierarchical mind map STRICTLY from the provided source material. Do NOT use any outside knowledge, prior training, assumptions, or invented examples — every label and every `info` field must be directly supported by the source text. If the source is empty or insufficient, return an empty `nodes` array. Generate short, scannable labels (2-6 words) drawn from the source. For each conceptual node, write a concise `info` field (1-3 short sentences) that paraphrases ONLY what the source says about it. Skip `info` for purely structural grouping labels. Every child node must point to its parent node's ID. Return only raw JSON matching the schema.";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { topic, context, pageImages } = await req.json();
    if (!topic || typeof topic !== "string") {
      return new Response(JSON.stringify({ error: "Missing topic" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ctx = typeof context === "string" ? context.slice(0, MAX_CHARS) : "";
    const images: string[] = Array.isArray(pageImages)
      ? pageImages.filter((s: unknown): s is string => typeof s === "string" && s.startsWith("data:image/")).slice(0, 12)
      : [];
    if (!ctx.trim() && images.length === 0) {
      return new Response(
        JSON.stringify({ error: "No source material provided. Mind maps must be built only from the uploaded PDF." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }
    const instructions = `Topic: ${topic}\n\nUse ONLY the source material below (text and/or attached page images). Do not add any information not present in it. If a detail is not in the source, omit it.`;
    const userContent: any[] = [{ type: "text", text: instructions }];
    if (ctx.trim()) {
      userContent.push({ type: "text", text: `=== SOURCE TEXT START ===\n${ctx}\n=== SOURCE TEXT END ===` });
    }
    for (const img of images) {
      userContent.push({ type: "image_url", image_url: { url: img } });
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
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: userContent },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_mindmap",
              description: "Submit the hierarchical mind map nodes",
              parameters: {
                type: "object",
                properties: {
                  nodes: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: {
                        id: { type: "string" },
                        type: { type: "string" },
                        label: { type: "string" },
                        parentId: { type: "string" },
                        info: { type: "string" },
                      },
                      required: ["id", "type", "label"],
                    },
                  },
                },
                required: ["nodes"],
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_mindmap" } },
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
      return new Response(JSON.stringify({ error: "No mind map generated" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const parsed = JSON.parse(toolCall.function.arguments);
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