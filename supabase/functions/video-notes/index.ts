import { protect } from "../_shared/guard.ts";
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
  const guard = await protect(req, "video-notes", { max: 6, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { url, language, mode, transcript: providedTranscript, count } = await req.json();
    const lang0 = language === "en" ? "en" : "ar";
    const runMode: "notes" | "flashcards" = mode === "flashcards" ? "flashcards" : "notes";
    if ((!url || typeof url !== "string") && !providedTranscript) {
      return jsonResponse({ error: "Missing url" }, 400);
    }
    const ent = await claimFeature(req, "video");
    if (!ent.ok) {
      return jsonResponse({ error: ent.error, upgrade: ent.status === 429 }, ent.status);
    }
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!LOVABLE_API_KEY && !GEMINI_API_KEY) {
      return jsonResponse({ error: "No AI API key configured" }, 500);
    }

    // Step 1: fetch transcript via Supadata (handles long videos without exhausting Gemini token limits).
    const SUPADATA_API_KEY = Deno.env.get("SUPADATA_API_KEY");
    let transcriptText = typeof providedTranscript === "string" ? providedTranscript : "";
    if (!transcriptText && SUPADATA_API_KEY) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 45000);
        const tRes = await fetch(
          `https://api.supadata.ai/v1/youtube/transcript?url=${encodeURIComponent(url.trim())}&text=true`,
          { headers: { "x-api-key": SUPADATA_API_KEY }, signal: controller.signal },
        );
        clearTimeout(timer);
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

    if (!transcriptText) {
      return jsonResponse({
        error: lang0 === "ar"
          ? "تعذّر تفريغ هذا الفيديو (قد يكون طويلاً جداً أو بدون ترجمة). جرّب فيديو آخر."
          : "Could not transcribe this video (may be too long or lack captions). Try another video.",
        retryable: true,
      });
    }

    // Cap transcript size to stay well under model limits.
    if (transcriptText.length > 120000) transcriptText = transcriptText.slice(0, 120000);

    // ===== Flashcards mode (tool-call structured output) =====
    if (runMode === "flashcards") {
      if (!transcriptText) {
        return jsonResponse({ error: lang0 === "ar" ? "تعذّر تفريغ هذا الفيديو لإنشاء بطاقات." : "Could not transcribe this video for flashcards." });
      }
      if (!LOVABLE_API_KEY) {
        return jsonResponse({ error: "LOVABLE_API_KEY not configured" }, 500);
      }
      const n = Math.max(6, Math.min(40, Number(count) || 15));
      const langName = lang0 === "ar" ? "Arabic" : "English";
      const sys = `You generate concise study flashcards from a YouTube transcript. Produce exactly ${n} flashcards in ${langName}. Each card: a clear question on the front, and a complete but short answer on the back (1-3 sentences). Cover the most exam-worthy ideas, definitions, formulas, and examples. Use ONLY content present in the transcript. Return via the submit_flashcards tool.`;
      const userMsg = `TRANSCRIPT:\n${transcriptText}\n\nGenerate ${n} flashcards.`;
      const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Lovable-API-Key": LOVABLE_API_KEY,
          "X-Lovable-AIG-SDK": "vercel-ai-sdk",
        },
        body: JSON.stringify({
          model: "google/gemini-3.5-flash",
          messages: [{ role: "system", content: sys }, { role: "user", content: userMsg }],
          tools: [{
            type: "function",
            function: {
              name: "submit_flashcards",
              description: "Submit generated flashcards",
              parameters: {
                type: "object",
                properties: {
                  cards: {
                    type: "array",
                    items: {
                      type: "object",
                      properties: { q: { type: "string" }, a: { type: "string" } },
                      required: ["q", "a"], additionalProperties: false,
                    },
                  },
                },
                required: ["cards"], additionalProperties: false,
              },
            },
          }],
          tool_choice: { type: "function", function: { name: "submit_flashcards" } },
        }),
      });
      if (!res.ok) {
        const txt = await res.text();
        if (res.status === 429) return jsonResponse({ error: lang0 === "ar" ? "الذكاء الاصطناعي مشغول. حاول مجدداً." : "AI busy. Try again.", retryable: true }, 429);
        if (res.status === 402) return jsonResponse({ error: lang0 === "ar" ? "نفدت رصيد الذكاء الاصطناعي." : "AI credits exhausted." }, 402);
        return jsonResponse({ error: `AI error: ${txt}` }, 500);
      }
      const data = await res.json();
      const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
      if (!toolCall) return jsonResponse({ error: "No flashcards generated", retryable: true });
      const parsed = JSON.parse(toolCall.function.arguments);
      return jsonResponse({ cards: parsed.cards || [], transcript: transcriptText });
    }

    const systemPrompt = `أنت كاتب ملاحظات دراسية خبير ومتقن. مهمتك تحويل محتوى الفيديو إلى ملاحظات دراسية شاملة ومفصّلة جداً باللغة العربية الفصحى دائماً (تَرجِم إذا لزم الأمر، بغض النظر عن لغة المصدر).

القواعد الصارمة:
1) لا تختصر ولا تلخّص بشكل مخلّ. اذكر كل فكرة مهمة، وكل تعريف، وكل قاعدة، وكل خطوة، وكل استثناء، وكل ملاحظة جانبية ذكرها المتحدث.
2) انقل جميع الأمثلة الواردة في الفيديو حرفياً مع شرحها خطوة بخطوة (الأرقام، المعادلات، الحالات، السيناريوهات، الأسماء، التواريخ، النِّسَب، القِيَم). لا تحذف أي مثال مهما بدا بسيطاً.
2.أ) إذا كان المثال رياضياً أو علمياً: اكتب المعطيات، ثم القانون/الصيغة، ثم خطوات الحل، ثم النتيجة النهائية مع الوحدة.
3) احتفظ بكل المصطلحات التقنية مع ذكر مقابلها بالإنجليزية بين قوسين عند أول ظهور، مثل: التمثيل الضوئي (Photosynthesis).
4) احتفظ بالتسلسل المنطقي الذي اتبعه المتحدث، ووضّح الانتقالات بين الأفكار.
5) أبرز التحذيرات، الأخطاء الشائعة، النصائح، الحيل، النقاط التي قال عنها المتحدث "مهم"، "انتبه"، "يأتي بالامتحان"، أو ما شابه — ضعها في مربع تنبيه ⚠️.
6) لا تُضِف معلومات من عندك غير موجودة في الفيديو، ولا تَفتَرِض. إن كان شيء غير واضح، اكتب: "(غير موضّح في الفيديو)".
7) اكتب الملاحظات بأسلوب طالب يستذكر للامتحان: واضح، منظّم، قابل للحفظ.

بنية المخرجات (Markdown):
# العنوان الرئيسي للفيديو
## 🧭 نظرة عامة سريعة
فقرة 3–5 أسطر تشرح الموضوع وأهميته.

## 📚 المفاهيم الأساسية
لكل مفهوم: عنوان فرعي + شرح مفصّل + لماذا هو مهم.

## 📖 التعريفات المهمة
قائمة: **المصطلح:** التعريف الكامل كما ورد.

## 🔢 القوانين / الصيغ / القواعد
اذكرها كلها بصيغتها الكاملة مع شرح كل رمز.

## 🧪 الأمثلة المحلولة
مثال 1: ... (المعطيات، الحل خطوة بخطوة، النتيجة)
مثال 2: ...
(أدرج كل مثال ورد في الفيديو دون استثناء)

## ⚠️ نقاط مهمة وتحذيرات
- ...

## 🧠 خلاصة وأسئلة مراجعة سريعة
- نقاط الخلاصة.
- 3–6 أسئلة قصيرة يمكن للطالب اختبار نفسه بها.

لا تكتب أي شيء خارج هذه البنية، ولا تستخدم لغة غير العربية في الشرح (المصطلحات الإنجليزية مسموحة فقط بين قوسين).

تقسيم إجباري: قسّم الفيديو إلى عدة أجزاء متتابعة (4 إلى 8 أجزاء حسب طول المحتوى)، ولكل جزء أعد كامل البنية أعلاه (نظرة عامة، مفاهيم، تعريفات، قوانين، أمثلة، نقاط مهمة، خلاصة) خاصة بذلك الجزء فقط. ابدأ كل جزء بعنوان واضح يصف موضوعه. أعد المخرجات عبر استدعاء الأداة submit_video_notes فقط.`;
    // Try Lovable AI Gateway first (multiple models for fallback on quota/overload),
    // then fall back to direct Gemini if available.
    const lovableModels = [
      "google/gemini-3-flash-preview",
      "google/gemini-3.5-flash",
      "google/gemini-2.5-flash",
      "google/gemini-3.1-flash-lite",
      "google/gemini-2.5-flash-lite",
      "google/gemini-2.5-pro",
    ];
    const geminiDirectModels = ["gemini-2.5-flash", "gemini-2.0-flash"];
    let lastGeminiError: any = null;
    let parts: { title: string; notes: string }[] = [];
    let notes = "";

    const userPrompt = transcriptText
      ? `Here is the transcript of a YouTube video. Divide it into 4-8 sequential parts and write detailed notes for each part. Call submit_video_notes with the parts array.\n\nTRANSCRIPT:\n${transcriptText}`
      : `Watch this YouTube video, split it into 4-8 sequential parts, and write detailed notes for each part. Call submit_video_notes.`;

    const partsTool = {
      type: "function" as const,
      function: {
        name: "submit_video_notes",
        description: "Submit segmented study notes for the video.",
        parameters: {
          type: "object",
          properties: {
            parts: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  title: { type: "string", description: "Short title for this segment" },
                  notes: { type: "string", description: "Detailed markdown notes for this segment" },
                },
                required: ["title", "notes"], additionalProperties: false,
              },
            },
          },
          required: ["parts"], additionalProperties: false,
        },
      },
    };

    // 1) Lovable AI Gateway attempts
    if (LOVABLE_API_KEY && transcriptText) {
      for (const model of lovableModels) {
        try {
          const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              "Lovable-API-Key": LOVABLE_API_KEY,
              "X-Lovable-AIG-SDK": "vercel-ai-sdk",
            },
            body: JSON.stringify({
              model,
              messages: [
                { role: "system", content: systemPrompt },
                { role: "user", content: userPrompt },
              ],
              tools: [partsTool],
              tool_choice: { type: "function", function: { name: "submit_video_notes" } },
            }),
          });
          const text = await res.text();
          const payload = parseJsonMaybe(text);
          if (!res.ok) {
            lastGeminiError = { status: res.status, payload, text, model: `lovable:${model}` };
            console.error("Lovable AI error", res.status, model, text);
            // 402 = workspace out of AI credits. Retrying other models won't help — stop immediately.
            if (res.status === 402) break;
            if (res.status === 429 || res.status === 503) continue;
            break;
          }
          const toolCall = payload?.choices?.[0]?.message?.tool_calls?.[0];
          if (toolCall?.function?.arguments) {
            try {
              const args = JSON.parse(toolCall.function.arguments);
              if (Array.isArray(args?.parts) && args.parts.length) {
                parts = args.parts.filter((p: any) => p?.title && p?.notes);
                notes = parts.map((p) => `# ${p.title}\n\n${p.notes}`).join("\n\n---\n\n");
                break;
              }
            } catch (e) { console.error("parse tool args failed", e); }
          }
          const reply = payload?.choices?.[0]?.message?.content ?? "";
          if (typeof reply === "string" && reply.trim()) {
            notes = reply;
            parts = [{ title: lang0 === "ar" ? "الملاحظات" : "Notes", notes: reply }];
            break;
          }
          lastGeminiError = { status: 500, payload, text, model: `lovable:${model}` };
        } catch (e) {
          console.error("Lovable AI fetch failed", model, e);
          lastGeminiError = { status: 500, payload: null, text: String(e), model: `lovable:${model}` };
        }
      }
    }

    // 2) Direct Gemini fallback (supports raw video URL when no transcript)
    if (!notes.trim() && GEMINI_API_KEY) for (const model of geminiDirectModels) {
      const userParts = transcriptText
        ? [{ text: userPrompt }]
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
      if (notes.trim()) {
        parts = [{ title: lang0 === "ar" ? "الملاحظات" : "Notes", notes }];
        break;
      }
      lastGeminiError = { status: 500, payload, text, model };
    }

    if (!notes.trim() && lastGeminiError) {
      const quota = lastGeminiError.status === 429 || lastGeminiError.payload?.error?.status === "RESOURCE_EXHAUSTED";
      const overloaded = lastGeminiError.status === 503 || lastGeminiError.payload?.error?.status === "UNAVAILABLE";
      const paymentRequired = lastGeminiError.status === 402;
      const retryAfter = getRetryAfterSeconds(lastGeminiError.payload);
      const disabledOrDaily = isDailyOrDisabledQuota(lastGeminiError.payload);
      const friendly = paymentRequired
        ? (lang0 === "ar"
          ? "نفد رصيد الذكاء الاصطناعي في هذا التطبيق. يرجى إبلاغ المسؤول لإعادة الشحن."
          : "The app's AI credits have run out. Please contact the owner to top up.")
        : overloaded
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
      }, paymentRequired ? 402 : 200);
    }

    if (!notes.trim()) {
      return jsonResponse({ error: "Empty response from model", retryable: true });
    }
    return jsonResponse({ notes, parts, transcript: transcriptText });
  } catch (e) {
    return jsonResponse({ error: String(e) }, 500);
  }
});
