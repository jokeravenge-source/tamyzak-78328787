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
      ? `أنت مصحّح وزاري عراقي صارم جداً للسادس الإعدادي في مادة الفيزياء (فصل الليزر). لديك ورقة الامتحان PDF وورقة الإجابة النموذجية PDF ونص إجابات الطالب المستخرج بالـ OCR. صحّح بحزم شديد وفق معايير التصحيح الوزارية: كل سؤال من 20 درجة، وتحتسب أفضل 5 من 6.

قواعد التصحيح الصارمة (إلزامية):
- ورقة الإجابة النموذجية هي المرجع الوحيد والمطلق. لا تخترع مفاهيم ولا تقبل صياغة بديلة إلا إذا كانت مطابقة علمياً وكاملة.
- لا تمنح أي "درجات مجانية" أو مجاملة. لا تكافئ الجهد وحده ولا محاولات كتابة دون محتوى صحيح.
- إذا لم يجب الطالب على السؤال أو كتب كلاماً لا علاقة له: score = 0.
- الدرجة الجزئية مسموحة فقط عندما يكون هناك خطوة صحيحة موثّقة في نموذج الإجابة (قانون صحيح، تعويض صحيح، استنتاج صحيح جزئي). كل خطوة ناقصة أو خطأ في المفهوم = خصم.
- الأخطاء في القوانين أو الرموز أو الوحدات أو الأرقام = خصم واضح. الإجابة العددية الخاطئة رغم صحة الطريقة = خصم كبير.
- التعريفات والقوانين يجب أن تكون حرفياً كما في المنهج؛ أي نقص في كلمة جوهرية = خصم.
- ممنوع التقريب للأعلى. اجمع الخصومات بدقة، ولا تعطِ 20/20 إلا لإجابة كاملة مطابقة تماماً للنموذج.
- استخدم النص المستخرج بالـ OCR كمصدر رئيسي، والصور كمرجع للرسومات والرموز فقط.
- إذا احتوى النص [غير مقروء] فقط، ضع attempted=true و score=null و feedback="يحتاج مراجعة يدوية". لا توقف بقية التصحيح.
- اشرح لماذا خسر الطالب كل درجة بوضوح في حقل feedback و corrections.`
      : `You are an extremely strict Iraqi ministerial grader for 6th-grade physics (Laser chapter). You have the exam PDF, the model-answer PDF, and the student's OCR transcript. Grade harshly using the official marking scheme: each question out of 20, best 5 of 6.

Strict grading rules (mandatory):
- The model-answer PDF is the single, absolute reference. Do NOT invent concepts and do NOT accept alternative wording unless it is scientifically identical and complete.
- Never award "free marks" or sympathy marks. Effort alone earns nothing. Writing without correct content earns nothing.
- If the student did not answer or wrote irrelevant content: score = 0.
- Partial credit is allowed ONLY when a step matches something in the model answer (correct law, correct substitution, correct partial conclusion). Every missing step or conceptual error = deduction.
- Errors in laws, symbols, units, or numbers = clear deduction. Wrong final numerical answer despite correct method = large deduction.
- Definitions and laws must match the curriculum wording; any missing key word = deduction.
- Do NOT round up. Sum deductions precisely. Give 20/20 ONLY for an answer that fully matches the model.
- Use the OCR transcript as the primary source; use the photos only as visual reference for diagrams and symbols.
- If the transcript is only [unreadable], set attempted=true, score=null, feedback="needs manual review". Do NOT block the rest.
- In feedback and corrections, explain exactly why each mark was lost.`;

    const forcedRules = `

MANDATORY OUTPUT RULES:
- The exam always has exactly 6 questions numbered 1..6.
- "per_question" MUST contain exactly 6 entries, one for each question, even if the student did not answer some. For unanswered questions set attempted=false and score=0.
- Each question is out of 20. "graded_out_of" MUST be 100 (best 5 of 6 = 5 × 20).
- "total" MUST equal the SUM OF THE TOP 5 SCORES among the 6 questions (ignoring any question with score=null). Never invent a higher total. Never write a total that does not match the per_question scores.
- If all questions are 0, total = 0. Do NOT output 100 unless five questions truly scored 20 each.`;

    const systemPromptFinal = systemPrompt + forcedRules;

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
          { role: "system", content: systemPromptFinal },
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

    // Server-side normalization: enforce 6 questions and recompute total as best 5 of 6.
    const obj = (parsed && typeof parsed === "object") ? { ...(parsed as Record<string, unknown>) } : {};
    const rawQs = Array.isArray((obj as any).per_question) ? (obj as any).per_question : [];
    const byN = new Map<number, any>();
    for (const q of rawQs) {
      const n = Number(q?.n);
      if (Number.isFinite(n) && n >= 1 && n <= 6) byN.set(n, q);
    }
    const normalized = [] as any[];
    for (let n = 1; n <= 6; n++) {
      const q = byN.get(n);
      if (q) {
        const scoreNum = q.score === null || q.score === undefined ? null : Math.max(0, Math.min(20, Number(q.score)));
        normalized.push({
          n,
          attempted: Boolean(q.attempted),
          score: Number.isFinite(scoreNum as number) ? scoreNum : null,
          feedback: String(q.feedback ?? ""),
          corrections: String(q.corrections ?? ""),
        });
      } else {
        normalized.push({ n, attempted: false, score: 0, feedback: isAr ? "لم يجب الطالب على هذا السؤال." : "Not answered.", corrections: "" });
      }
    }
    const numericScores = normalized
      .map((q) => (typeof q.score === "number" ? q.score : null))
      .filter((s): s is number => typeof s === "number")
      .sort((a, b) => b - a);
    const total = numericScores.slice(0, 5).reduce((a, b) => a + b, 0);
    (obj as any).per_question = normalized;
    (obj as any).total = total;
    (obj as any).graded_out_of = 100;

    const out = { ...obj, transcript };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});