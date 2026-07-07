import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OCR_MODEL = "google/gemini-2.5-pro";
const GRADE_MODEL = "google/gemini-2.5-pro";
const MAX_IMAGES = 10;

async function pdfToDataUrl(supabase: ReturnType<typeof createClient>, path: string): Promise<string | null> {
  const { data, error } = await supabase.storage.from("course-exams").download(path);
  if (error || !data) return null;
  const buf = new Uint8Array(await data.arrayBuffer());
  let bin = "";
  const chunk = 0x8000;
  for (let i = 0; i < buf.length; i += chunk) {
    bin += String.fromCharCode(...buf.subarray(i, i + chunk));
  }
  return `data:application/pdf;base64,${btoa(bin)}`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const { examPath, answerPath, studentImages, language, examTitle } = await req.json();
    if (!examPath || typeof examPath !== "string") {
      return new Response(JSON.stringify({ error: "Missing exam" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const images = Array.isArray(studentImages)
      ? studentImages.filter((s) => typeof s === "string" && s.startsWith("data:image/")).slice(0, MAX_IMAGES)
      : [];
    if (!images.length) {
      return new Response(JSON.stringify({ error: "Please upload at least one photo of your answer sheet." }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ent = await claimFeature(req, "essay");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const examPdf = await pdfToDataUrl(admin, examPath);
    if (!examPdf) {
      return new Response(JSON.stringify({ error: "Could not load the exam PDF." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const answerPdf = answerPath ? await pdfToDataUrl(admin, answerPath) : null;

    const isAr = language !== "en";

    // ===== STEP 1: OCR the student's handwritten answer photos into plain text =====
    const ocrSystem = isAr
      ? `أنت محرك OCR متخصص في قراءة أوراق امتحانات الفيزياء بخط اليد باللغة العربية والرموز الرياضية والفيزيائية. مهمتك الوحيدة هي استخراج كل ما هو مكتوب على الصور حرفياً، بأمانة تامة، مع الحفاظ على ترتيب القراءة وأرقام الأسئلة والمعادلات والوحدات.

قواعد صارمة:
- انسخ ما هو مكتوب فقط، بدون شرح أو تصحيح أو إضافة.
- ابدأ كل سؤال بسطر: "السؤال N:" حيث N هو رقم السؤال كما ظهر في ورقة الطالب.
- اكتب المعادلات بصيغة نصية واضحة (مثال: E = h*f، λ = c/f).
- إذا كان جزء من الكلام غير مقروء تماماً، اكتب مكانه: [غير مقروء].
- لا تُخرج JSON ولا Markdown، فقط النص المُستخرج.`
      : `You are an OCR engine specialized in reading handwritten physics exam papers with math and physics symbols. Your only job is to transcribe exactly what is written on the images, verbatim, preserving reading order, question numbers, equations, and units.

Strict rules:
- Transcribe only what is written; do NOT explain, correct, or add anything.
- Start each question with a line: "Question N:" where N is the question number as written by the student.
- Write equations as clear text (e.g., E = h*f, λ = c/f).
- If a portion is truly unreadable, write [unreadable] in place.
- Do NOT output JSON or Markdown, only the transcribed text.`;

    const ocrContent: unknown[] = [
      { type: "text", text: isAr
          ? "استخرج نص إجابات الطالب من هذه الصور حرفياً، مرتبة حسب رقم السؤال."
          : "Transcribe the student's answers from these images verbatim, ordered by question number." },
    ];
    for (const url of images) ocrContent.push({ type: "image_url", image_url: { url } });

    const ocrRes = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: OCR_MODEL,
        messages: [
          { role: "system", content: ocrSystem },
          { role: "user", content: ocrContent },
        ],
      }),
    });
    if (!ocrRes.ok) {
      const errText = await ocrRes.text();
      const status = ocrRes.status === 429 || ocrRes.status === 402 ? ocrRes.status : 500;
      const msg = ocrRes.status === 429 ? "Rate limit. Try again shortly."
        : ocrRes.status === 402 ? "AI credits exhausted."
        : `OCR error: ${errText.slice(0, 300)}`;
      return new Response(JSON.stringify({ error: msg }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ocrData = await ocrRes.json();
    const transcript = String(ocrData.choices?.[0]?.message?.content ?? "").trim();

    // ===== STEP 2: Grade the transcribed text against the exam + answer key =====
    const systemPrompt = isAr
      ? `أنت مصحّح وزاري عراقي خبير للسادس الإعدادي في مادة الفيزياء (فصل الليزر). لديك ورقة الامتحان بصيغة PDF وورقة الإجابة النموذجية بصيغة PDF، وصور خط يد الطالب. صحّح بدقة وفق معايير التصحيح الحقيقية: كل سؤال 20 درجة، وتحتسب أفضل 5 أسئلة من 6.

تعليمات التصحيح الإلزامية:
- لديك نص إجابات الطالب مستخرج مسبقاً بواسطة OCR (مُرفق في رسالة المستخدم). اعتمد عليه كمصدر رئيسي لإجابات الطالب.
- قارن كل إجابة (النص المستخرج) مع ورقة الإجابة النموذجية الرسمية سؤالاً بسؤال.
- امنح درجة جزئية عندما يكون الاستدلال أو الحل صحيحاً جزئياً.
- إذا احتوى النص على [غير مقروء] أو كان مبهماً، ضع "attempted": true و "score": null واكتب في feedback: "يحتاج مراجعة يدوية". لا توقف تصحيح بقية الأسئلة.
- الصور مرفقة أيضاً كمرجع للرسومات والرموز التي قد تفقد أثناء الـ OCR.
- اشرح الأخطاء بلطف بلغة عربية واضحة.`
      : `You are an expert Iraqi ministerial grader for 6th-grade physics (Laser chapter). You have the exam PDF, the model-answer PDF, and photos of the student's handwriting. Grade strictly using the real marking scheme: each question out of 20, best 5 of 6 count.

Mandatory grading instructions:
- You are given the student's answers already transcribed by an OCR pass (attached in the user message). Treat this transcript as the primary source of the student's answers.
- Compare each transcribed answer against the official answer key, question by question.
- Award partial credit where reasoning or working is partially correct.
- If the transcript contains [unreadable] or is ambiguous, set "attempted": true, "score": null, and put "needs manual review" in feedback. Do NOT block grading the rest.
- The raw photos are also attached as a visual reference for diagrams and symbols that OCR may lose.
- Explain mistakes kindly.`;

    const userText = `The exam PDF, model-answer PDF (if any), the student's OCR transcript, and ${images.length} original photo(s) are attached.
${examTitle ? `Exam title: ${examTitle}\n` : ""}
===== STUDENT OCR TRANSCRIPT (primary source) =====
${transcript || "[empty transcript]"}
===== END TRANSCRIPT =====

Grade each question by comparing the transcript above against the model-answer PDF. Use the photos only as a visual fallback for diagrams/symbols.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "total": number,
  "graded_out_of": 100,
  "per_question": [
    { "n": number, "attempted": boolean, "score": number, "feedback": string, "corrections": string }
  ],
  "overall_feedback": string,
  "strengths": string[],
  "improvements": string[]
}
All feedback strings in ${isAr ? "Arabic" : "English"}.`;

    const content: unknown[] = [
      { type: "text", text: userText },
      { type: "file", file: { filename: "exam.pdf", file_data: examPdf } },
    ];
    if (answerPdf) content.push({ type: "file", file: { filename: "answer-key.pdf", file_data: answerPdf } });
    for (const url of images) content.push({ type: "image_url", image_url: { url } });

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: GRADE_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted." }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* keep */ } }
    }
    const out = (parsed && typeof parsed === "object") ? { ...(parsed as Record<string, unknown>), transcript } : { transcript };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});