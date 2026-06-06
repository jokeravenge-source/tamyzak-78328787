import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, language } = await req.json();
    const lang0 = language === "en" ? "en" : "ar";
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing url" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ent = await claimFeature(req, "video");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return new Response(JSON.stringify({ error: "GEMINI_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use Gemini directly — it natively accepts YouTube URLs as fileData
    const systemPrompt = `You are an expert study-notes writer. Watch the provided YouTube video and produce clean, well-structured study notes ALWAYS in Arabic (العربية), regardless of the video language. Translate if needed. Use Markdown with: a short summary (ملخص), key concepts as bullet points (المفاهيم الأساسية), important definitions (تعريفات مهمة), and a final "خلاصة" (Takeaways) section. Be faithful to the video content only.`;

    const geminiRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-pro:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [
            {
              role: "user",
              parts: [
                { fileData: { fileUri: url.trim(), mimeType: "video/mp4" } },
                { text: "Write the study notes now." },
              ],
            },
          ],
        }),
      },
    );

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini error", geminiRes.status, errText);
      const friendly = lang0 === "ar"
        ? "تعذّر إنشاء الملاحظات من هذا الفيديو. تأكد من الرابط أو جرّب فيديو آخر."
        : "Could not generate notes from this video. Check the link or try another video.";
      return new Response(JSON.stringify({ error: friendly, detail: errText }), {
        status: geminiRes.status === 429 ? 429 : 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const gData = await geminiRes.json();
    const notes = gData?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
    if (!notes.trim()) {
      return new Response(JSON.stringify({ error: "Empty response from model" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    return new Response(JSON.stringify({ notes }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
