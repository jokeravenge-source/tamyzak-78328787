import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const json = (b: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(b), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { text, language, length, voice } = await req.json();
    // Auto-detect language from text: if it contains Arabic chars -> ar, else en.
    // Explicit `language` param still wins when provided as "ar" or "en".
    const hasArabic = /[\u0600-\u06FF]/.test(typeof text === "string" ? text : "");
    const lang: "ar" | "en" =
      language === "ar" || language === "en"
        ? language
        : hasArabic ? "ar" : "en";
    const targetCount = length === "long" ? 8 : length === "short" ? 4 : 6;
    if (!text || typeof text !== "string" || text.trim().length < 10) {
      return json({ error: lang === "ar" ? "النص قصير جدًا." : "Text too short." }, 400);
    }
    const ent = await claimFeature(req, "video");
    if (!ent.ok) return json({ error: ent.error, upgrade: ent.status === 429 }, ent.status);

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) return json({ error: "LOVABLE_API_KEY not configured" }, 500);

    const langName = lang === "ar" ? "Arabic (Modern Standard)" : "English";
    const sys = `You turn any text into a vivid INFOGRAPHIC explainer video script. WRITE EVERYTHING (title, keyword, narration, bullets, labels) IN ${langName} — translate foreign words; never mix languages. Produce exactly ${targetCount} sequential scenes. For each scene pick the BEST visual layout from: "stat" (one big number + label, optional unit), "percent" (a 0-100 percentage with short label, animated ring), "compare" (two items side by side with short labels), "process" (3-5 ordered steps), "list" (2-4 icon bullet points), "quote" (a short impactful sentence). Each scene MUST have: a short keyword heading (2-4 words), a 1-2 sentence narration the narrator will speak (clear, conversational), an emoji icon that fits, an accent color (one of: amber, sky, emerald, rose, violet, indigo), a "visual" object matching the chosen type. Vary the visual types across scenes — do NOT repeat the same type back-to-back. Use ONLY ideas from the source text. Return via submit_video_script.`;

    const scriptRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: sys },
          { role: "user", content: `SOURCE TEXT:\n${text.slice(0, 12000)}\n\nGenerate the script.` },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_video_script",
            description: "Submit a whiteboard video script.",
            parameters: {
              type: "object",
              properties: {
                title: { type: "string" },
                scenes: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      keyword: { type: "string" },
                      narration: { type: "string" },
                      bullets: { type: "array", items: { type: "string" } },
                      icon: { type: "string", description: "A single emoji that represents the scene." },
                      color: { type: "string", enum: ["amber","sky","emerald","rose","violet","indigo"] },
                      visual: {
                        type: "object",
                        properties: {
                          type: { type: "string", enum: ["stat","percent","compare","process","list","quote"] },
                          stat: { type: "object", properties: { value: { type: "string" }, unit: { type: "string" }, label: { type: "string" } } },
                          percent: { type: "object", properties: { value: { type: "number" }, label: { type: "string" } } },
                          compare: { type: "object", properties: { left: { type: "object", properties: { label: { type: "string" }, value: { type: "string" }, icon: { type: "string" } } }, right: { type: "object", properties: { label: { type: "string" }, value: { type: "string" }, icon: { type: "string" } } } } },
                          process: { type: "array", items: { type: "object", properties: { label: { type: "string" }, icon: { type: "string" } } } },
                          list: { type: "array", items: { type: "object", properties: { label: { type: "string" }, icon: { type: "string" } } } },
                          quote: { type: "object", properties: { text: { type: "string" }, author: { type: "string" } } },
                        },
                        required: ["type"],
                      },
                    },
                    required: ["keyword", "narration", "bullets", "icon", "color", "visual"],
                    additionalProperties: false,
                  },
                },
              },
              required: ["title", "scenes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_video_script" } },
      }),
    });

    if (!scriptRes.ok) {
      const t = await scriptRes.text();
      if (scriptRes.status === 429) return json({ error: lang === "ar" ? "الذكاء الاصطناعي مشغول، حاول مجدداً." : "AI busy, try again.", retryable: true }, 429);
      if (scriptRes.status === 402) return json({ error: lang === "ar" ? "نفد رصيد الذكاء الاصطناعي." : "AI credits exhausted." }, 402);
      return json({ error: `Script error: ${t}` }, 500);
    }
    const sData = await scriptRes.json();
    const toolCall = sData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall) return json({ error: "No script generated", retryable: true }, 500);
    const parsed = JSON.parse(toolCall.function.arguments);
    const scenes: { keyword: string; narration: string; bullets: string[] }[] = parsed.scenes ?? [];
    if (!scenes.length) return json({ error: "Empty script", retryable: true }, 500);

    // Image per scene (parallel) — a related illustration to simplify the topic.
    const imgResults = await Promise.all(scenes.map(async (sc) => {
      try {
        const promptParts = [
          `Minimalist flat vector illustration that visually explains: ${sc.keyword}.`,
          sc.narration ? `Concept: ${sc.narration}` : "",
          "Educational infographic style, soft pastel background, clean shapes, no text, no watermark, centered subject, friendly modern look.",
        ].filter(Boolean).join(" ");
        const r = await fetch("https://ai.gateway.lovable.dev/v1/images/generations", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash-image",
            messages: [{ role: "user", content: promptParts }],
            modalities: ["image", "text"],
          }),
        });
        if (!r.ok) return { imageBase64: "" };
        const j = await r.json();
        const b64 = j?.data?.[0]?.b64_json ?? "";
        return { imageBase64: b64 };
      } catch {
        return { imageBase64: "" };
      }
    }));

    // TTS per scene (parallel, capped)
    const chosenVoice = typeof voice === "string" && voice ? voice : "alloy";
    const ttsResults = await Promise.all(scenes.map(async (sc) => {
      try {
        const r = await fetch("https://ai.gateway.lovable.dev/v1/audio/speech", {
          method: "POST",
          headers: { "Content-Type": "application/json", Authorization: `Bearer ${LOVABLE_API_KEY}` },
          body: JSON.stringify({
            model: "openai/gpt-4o-mini-tts",
            input: sc.narration,
            voice: chosenVoice,
            response_format: "mp3",
            instructions: lang === "ar" ? "Speak in clear, friendly Modern Standard Arabic at a calm teaching pace." : "Speak clearly at a friendly teaching pace.",
          }),
        });
        if (!r.ok) return { audioBase64: "", mime: "audio/mpeg", error: await r.text() };
        const buf = new Uint8Array(await r.arrayBuffer());
        let bin = "";
        const chunk = 0x8000;
        for (let i = 0; i < buf.length; i += chunk) bin += String.fromCharCode(...buf.subarray(i, i + chunk));
        return { audioBase64: btoa(bin), mime: "audio/mpeg" };
      } catch (e) {
        return { audioBase64: "", mime: "audio/mpeg", error: String(e) };
      }
    }));

    const out = scenes.map((s, i) => ({
      ...s,
      audioBase64: ttsResults[i].audioBase64,
      mime: ttsResults[i].mime,
      imageBase64: imgResults[i].imageBase64,
    }));
    return json({ title: parsed.title || (lang === "ar" ? "شرح مبسّط" : "Simplified explainer"), scenes: out });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});