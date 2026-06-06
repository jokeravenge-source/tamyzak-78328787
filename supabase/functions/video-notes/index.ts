import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const parseJsonMaybe = (text: string) => {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
};

const getRetryAfterSeconds = (payload: any) => {
  const retryInfo = payload?.error?.details?.find?.((d: any) => String(d?.["@type"] || "").includes("RetryInfo"));
  const rawDelay = retryInfo?.retryDelay || payload?.retryDelay;
  if (typeof rawDelay === "string") {
    const seconds = Number.parseFloat(rawDelay.replace("s", ""));
    if (Number.isFinite(seconds)) return Math.ceil(seconds);
  }
  const message = payload?.error?.message || payload?.message || "";
  const match = String(message).match(/retry in\s+([\d.]+)s/i);
  return match ? Math.ceil(Number.parseFloat(match[1])) : 0;
};

const isDailyOrDisabledQuota = (payload: any) => {
  const text = JSON.stringify(payload || {});
  return text.includes("PerDay") || text.includes("limit: 0");
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  try {
    const { url, language } = await req.json();
    const lang0 = language === "en" ? "en" : "ar";
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "Missing url" }, 400);
    }
    const ent = await claimFeature(req, "video");
    if (!ent.ok) {
      return jsonResponse({ error: ent.error, upgrade: ent.status === 429 }, ent.status);
    }
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      return jsonResponse({ error: "GEMINI_API_KEY not configured" }, 500);
    }

    // Use Gemini directly — it natively accepts YouTube URLs as fileData.
    // Prefer Flash models to avoid exhausting the stricter Pro quota, then fail gracefully.
    const systemPrompt = `You are an expert study-notes writer. Watch the provided YouTube video and produce clean, well-structured study notes ALWAYS in Arabic (العربية), regardless of the video language. Translate if needed. Use Markdown with: a short summary (ملخص), key concepts as bullet points (المفاهيم الأساسية), important definitions (تعريفات مهمة), and a final "خلاصة" (Takeaways) section. Be faithful to the video content only.`;
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastGeminiError: any = null;
    let notes = "";

    for (const model of models) {
      const geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
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

      const text = await geminiRes.text();
      const payload = parseJsonMaybe(text);
      if (!geminiRes.ok) {
        lastGeminiError = { status: geminiRes.status, payload, text, model };
        console.error("Gemini error", geminiRes.status, model, text);
        if (geminiRes.status === 429 || payload?.error?.status === "RESOURCE_EXHAUSTED") continue;
        break;
      }

      notes = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
      if (notes.trim()) break;
      lastGeminiError = { status: 500, payload, text, model };
    }

    if (!notes.trim() && lastGeminiError) {
      const quota = lastGeminiError.status === 429 || lastGeminiError.payload?.error?.status === "RESOURCE_EXHAUSTED";
      const retryAfter = getRetryAfterSeconds(lastGeminiError.payload);
      const disabledOrDaily = isDailyOrDisabledQuota(lastGeminiError.payload);
      const friendly = quota
        ? (lang0 === "ar"
          ? "تم الوصول إلى حد استخدام الذكاء الاصطناعي للفيديو حالياً. جرّب لاحقاً أو فعّل حصة أعلى لمفتاح Gemini."
          : "The video AI quota is currently exhausted. Try again later or increase the Gemini API quota.")
        : (lang0 === "ar"
          ? "تعذّر إنشاء الملاحظات من هذا الفيديو. تأكد من الرابط أو جرّب فيديو آخر."
          : "Could not generate notes from this video. Check the link or try another video.");

      return jsonResponse({
        error: friendly,
        retryable: quota && !disabledOrDaily && retryAfter > 0,
        retryAfter,
        quota,
      });
    }

    if (!notes.trim()) {
      return jsonResponse({ error: "Empty response from model", retryable: true });
    }
    return jsonResponse({ notes });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
