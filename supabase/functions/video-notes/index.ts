import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPADATA_API_KEY = "sd_42f99c2a37f96d372f0dc3e052df52d3";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, language } = await req.json();
    const lang0 = language === "en" ? "en" : "ar";
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    // Daily limit removed
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // 1) Get transcript from Supadata
    const tRes = await fetch(`https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url)}&text=true`, {
      headers: { "x-api-key": SUPADATA_API_KEY },
    });
    if (!tRes.ok) {
      const errText = await tRes.text();
      return new Response(JSON.stringify({ error: `Transcript failed: ${errText}` }), { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const tData = await tRes.json();
    let transcript: string = "";
    if (typeof tData.content === "string") transcript = tData.content;
    else if (Array.isArray(tData.content)) transcript = tData.content.map((c: any) => c.text ?? "").join(" ");
    else if (typeof tData.text === "string") transcript = tData.text;
    if (!transcript || transcript.trim().length < 20) {
      return new Response(JSON.stringify({ error: "Empty transcript" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    transcript = transcript.slice(0, 60000);

    // 2) Generate notes via Lovable AI
    const systemPrompt = `You are an expert study-notes writer. From a YouTube video transcript, produce clean, well-structured study notes ALWAYS in Arabic (العربية), regardless of the transcript language. Translate if needed. Use Markdown with: a short summary (ملخص), key concepts as bullet points (المفاهيم الأساسية), important definitions (تعريفات مهمة), and a final "خلاصة" (Takeaways) section. Be faithful to the transcript only.`;
    const userPrompt = `Transcript:\n\n${transcript}\n\nWrite the notes now.`;
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });
    if (!aiRes.ok) {
      const errText = await aiRes.text();
      const status = aiRes.status === 429 || aiRes.status === 402 ? aiRes.status : 500;
      return new Response(JSON.stringify({ error: errText }), { status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const aiData = await aiRes.json();
    const notes = aiData.choices?.[0]?.message?.content ?? "";
    return new Response(JSON.stringify({ notes, transcript }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});