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

    // Step 1: fetch transcript via Supadata (handles long videos without exhausting Gemini token limits).
    const SUPADATA_API_KEY = Deno.env.get("SUPADATA_API_KEY");
    let transcriptText = "";
    if (SUPADATA_API_KEY) {
      try {
        const tRes = await fetch(
          `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url.trim())}&text=true`,
          { headers: { "x-api-key": SUPADATA_API_KEY } },
        );
        const tText = await tRes.text();
        const tJson = parseJsonMaybe(tText);
        if (tRes.ok && tJson) {
          if (typeof tJson.content === "string") transcriptText = tJson.content;
          else if (Array.isArray(tJson.content)) transcriptText = tJson.content.map((c: any) => c.text || "").join(" ");
          else if (typeof tJson.transcript === "string") transcriptText = tJson.transcript;
        } else {
          console.error("Supadata error", tRes.status, tText);
        }
      } catch (e) {
        console.error("Supadata fetch failed", e);
      }
    }

    // Cap transcript size to stay well under model limits.
    if (transcriptText.length > 120000) transcriptText = transcriptText.slice(0, 120000);

    const systemPrompt = `You are an expert study-notes writer. Produce clean, well-structured study notes ALWAYS in Arabic (العربية), regardless of source language. Translate if needed. Use Markdown with: a short summary (ملخص), key concepts as bullet points (المفاهيم الأساسية), important definitions (تعريفات مهمة), and a final "خلاصة" (Takeaways) section. Be faithful to the source content only.`;
    const models = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastGeminiError: any = null;
    let notes = "";

    for (const model of models) {
      const userParts = transcriptText
        ? [{ text: `Here is the transcript of a YouTube video. Write the study notes from it.\n\nTRANSCRIPT:\n${transcriptText}` }]
        : [
            { fileData: { fileUri: url.trim(), mimeType: "video/mp4" } },
            { text: "Write the study notes now." },
          ];
      let geminiRes: Response | null = null;
      let text = "";
      let payload: any = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        geminiRes = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${GEMINI_API_KEY}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: systemPrompt }] },
            contents: [{ role: "user", parts: userParts }],
          }),
        },
        );
        text = await geminiRes.text();
        payload = parseJsonMaybe(text);
        if (geminiRes.ok) break;
        if (geminiRes.status === 503 || geminiRes.status === 429 || payload?.error?.status === "UNAVAILABLE" || payload?.error?.status === "RESOURCE_EXHAUSTED") {
          await new Promise((r) => setTimeout(r, 800 * (attempt + 1)));
          continue;
        }
        break;
      }
      if (!geminiRes || !geminiRes.ok) {
        lastGeminiError = { status: geminiRes.status, payload, text, model };
        console.error("Gemini error", geminiRes?.status, model, text);
        // Try next model on overload/quota errors; otherwise stop.
        if (geminiRes && (geminiRes.status === 429 || geminiRes.status === 503 || payload?.error?.status === "RESOURCE_EXHAUSTED" || payload?.error?.status === "UNAVAILABLE")) continue;
        break;
      }

      notes = payload?.candidates?.[0]?.content?.parts?.map((p: any) => p.text ?? "").join("") ?? "";
      if (notes.trim()) break;
      lastGeminiError = { status: 500, payload, text, model };
    }

    if (!notes.trim() && lastGeminiError) {
      const quota = lastGeminiError.status === 429 || lastGeminiError.payload?.error?.status === "RESOURCE_EXHAUSTED";
      const overloaded = lastGeminiError.status === 503 || lastGeminiError.payload?.error?.status === "UNAVAILABLE";
      const retryAfter = getRetryAfterSeconds(lastGeminiError.payload);
      const disabledOrDaily = isDailyOrDisabledQuota(lastGeminiError.payload);
      const friendly = overloaded
        ? (lang0 === "ar"
          ? "الذكاء الاصطناعي مزدحم حالياً. حاول مرة أخرى بعد قليل."
          : "The AI is overloaded right now. Please try again in a moment.")
        : quota
        ? (lang0 === "ar"
          ? "تم الوصول إلى حد استخدام الذكاء الاصطناعي للفيديو حالياً. جرّب لاحقاً أو فعّل حصة أعلى لمفتاح Gemini."
          : "The video AI quota is currently exhausted. Try again later or increase the Gemini API quota.")
        : (lang0 === "ar"
          ? "تعذّر إنشاء الملاحظات من هذا الفيديو. تأكد من الرابط أو جرّب فيديو آخر."
          : "Could not generate notes from this video. Check the link or try another video.");

      return jsonResponse({
        error: friendly,
        retryable: overloaded || (quota && !disabledOrDaily && retryAfter > 0),
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
