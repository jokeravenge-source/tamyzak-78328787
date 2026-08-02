import { protect } from "../_shared/guard.ts";
import { requireUser } from "../_shared/auth.ts";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: Record<string, unknown>, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

type GenBlock = {
  type: "h1" | "h2" | "h3" | "text" | "bullet" | "numbered" | "todo" | "quote" | "divider";
  text: string;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "ai-notes-generate", { max: 6, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { topic, language } = await req.json();
    const lang = language === "en" ? "en" : "ar";
    if (!topic || typeof topic !== "string" || topic.trim().length < 3) {
      return json({ error: lang === "ar" ? "اكتب موضوعاً أو نصاً أطول قليلاً" : "Provide a longer topic or text" }, 400);
    }
    const ent = await claimFeature(req, "video");
    if (!ent.ok) return json({ error: ent.error, upgrade: ent.status === 429 }, ent.status);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const langName = lang === "ar" ? "Arabic" : "English";
    const sys = `You are an expert study-note writer. Produce rich, well-structured notes in ${langName} about the user's topic. Use varied block types: headings (h1/h2/h3), short paragraphs (text), bullets, numbered lists, quote callouts for key ideas, and divider lines between sections. Cover: definition, key concepts, important facts, examples, common mistakes, and a quick review. Also suggest 2 concise visual prompts (in English) that describe an illustration which would help understand the topic — clean, educational infographic-style, no text/labels. Return ONLY via the submit_notes tool.`;

    const userMsg = `TOPIC / SOURCE TEXT:\n${topic.slice(0, 8000)}\n\nGenerate the structured notes now.`;

    const chatRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
        tools: [{
          type: "function",
          function: {
            name: "submit_notes",
            description: "Submit structured study notes and image prompts",
            parameters: {
              type: "object",
              properties: {
                blocks: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      type: { type: "string", enum: ["h1","h2","h3","text","bullet","numbered","todo","quote","divider"] },
                      text: { type: "string" },
                    },
                    required: ["type", "text"], additionalProperties: false,
                  },
                },
                image_prompts: { type: "array", items: { type: "string" } },
              },
              required: ["blocks", "image_prompts"], additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_notes" } },
      }),
    });

    if (!chatRes.ok) {
      const txt = await chatRes.text();
      if (chatRes.status === 429) return json({ error: lang === "ar" ? "الذكاء الاصطناعي مشغول. حاول مجدداً." : "AI busy. Try again." }, 429);
      if (chatRes.status === 402) return json({ error: lang === "ar" ? "نفدت رصيد الذكاء الاصطناعي." : "AI credits exhausted." }, 402);
      return json({ error: `AI error: ${txt}` }, 500);
    }
    const data = await chatRes.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "No notes generated" }, 500);
    const parsed = JSON.parse(toolCall.function.arguments);
    const blocks: GenBlock[] = (parsed.blocks || []).filter((b: any) => b?.type && typeof b.text === "string");
    const imagePrompts: string[] = (parsed.image_prompts || []).slice(0, 2);

    // Generate up to 2 illustrations in parallel
    const images = await Promise.all(imagePrompts.map(async (p) => {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: `Educational infographic-style illustration, clean flat vector, soft pastel colors, no text, no labels, no watermarks. Subject: ${p}` }],
            modalities: ["image", "text"],
          }),
        });
        if (!r.ok) return null;
        const j = await r.json();
        const b64 = j?.data?.[0]?.b64_json;
        return b64 ? { prompt: p, dataUrl: `data:image/png;base64,${b64}` } : null;
      } catch {
        return null;
      }
    }));

    return json({ blocks, images: images.filter(Boolean) });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});