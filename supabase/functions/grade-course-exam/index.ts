import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OCR_MODELS = [
  // Most capable vision models first — accuracy matters more than latency here.
  "google/gemini-2.5-pro",
  "google/gemini-3.5-flash",
  "google/gemini-2.5-flash",
];
const GRADE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-3.5-flash",
];
const STRUCTURE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-3.5-flash",
];
const MAX_IMAGES = 10;
const OCR_TIMEOUT_MS = 90_000;
const GRADE_TIMEOUT_MS = 120_000;
const STRUCTURE_TIMEOUT_MS = 60_000;
const TOTAL_MARKS = 100;

// Try each model in order. Retries on 5xx and 429. Stops immediately on 402 (credits).
async function callAiWithFallback(
  apiKey: string,
  models: string[],
  body: Record<string, unknown>,
  perCallTimeoutMs: number,
): Promise<{ ok: true; data: any; model: string } | { ok: false; status: number; error: string }> {
  let lastErr = "";
  let lastStatus = 500;
  for (const model of models) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), perCallTimeoutMs);
    try {
      const res = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, model }),
        signal: controller.signal,
      });
      if (res.ok) {
        const data = await res.json();
        clearTimeout(timer);
        return { ok: true, data, model };
      }
      const errText = await res.text();
      lastStatus = res.status;
      lastErr = errText.slice(0, 400);
      // Terminal for billing — don't try other models.
      if (res.status === 402) return { ok: false, status: 402, error: "AI credits exhausted." };
      // For 429 / 5xx / model-unavailable, try next model.
      console.warn(`[grade-course-exam] model ${model} failed (${res.status}): ${lastErr}`);
      continue;
    } catch (e) {
      const aborted = (e as { name?: string })?.name === "AbortError";
      lastErr = aborted ? `timeout after ${perCallTimeoutMs}ms` : String(e);
      lastStatus = aborted ? 504 : lastStatus;
      console.warn(`[grade-course-exam] model ${model} ${aborted ? "timed out" : "threw"}: ${lastErr}`);
      continue;
    } finally {
      clearTimeout(timer);
    }
  }
  return { ok: false, status: lastStatus, error: lastErr || "All AI models failed." };
}

async function pdfToDataUrl(supabase: { storage: ReturnType<typeof createClient>["storage"] }, path: string): Promise<string | null> {
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

    // Course exam grading has no daily usage limit.

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

    // Download both PDFs in parallel to cut latency.
    const [examPdf, answerPdf] = await Promise.all([
      pdfToDataUrl(admin, examPath),
      answerPath ? pdfToDataUrl(admin, answerPath) : Promise.resolve(null),
    ]);
    if (!examPdf) {
      return new Response(JSON.stringify({ error: "Could not load the exam PDF." }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isAr = language !== "en";

    // ===== STEP 0: Determine how many questions the paper has, from the ANSWER KEY first =====
    const structureSource = answerPdf ?? examPdf;
    const structureContent: unknown[] = [
      {
        type: "text",
        text: `Look at the attached ${answerPdf ? "model-answer key" : "exam"} PDF and count how many MAIN questions it contains (top-level questions such as Q1, Q2, س1, س2 — do NOT count sub-parts a/b/c separately).
Return ONLY valid JSON: {"question_count": number, "question_numbers": number[]}
question_numbers must list the main question numbers in order (e.g. [1,2,3,4]).`,
      },
      { type: "file", file: { filename: answerPdf ? "answer-key.pdf" : "exam.pdf", file_data: structureSource } },
    ];
    const structureResult = await callAiWithFallback(LOVABLE_API_KEY, STRUCTURE_MODELS, {
      messages: [
        { role: "system", content: "You extract exam structure from PDFs. Answer with JSON only, no commentary." },
        { role: "user", content: structureContent },
      ],
      response_format: { type: "json_object" },
    }, STRUCTURE_TIMEOUT_MS);

    let questionCount = 0;
    if (structureResult.ok) {
      const rawStruct = structureResult.data.choices?.[0]?.message?.content ?? "{}";
      try {
        const s = JSON.parse(String(rawStruct).match(/\{[\s\S]*\}/)?.[0] ?? "{}");
        const n = Number(s?.question_count);
        if (Number.isFinite(n) && n >= 1 && n <= 30) questionCount = Math.round(n);
      } catch { /* fall back below */ }
    }
    if (!questionCount) questionCount = 6;
    const perQuestionMax = TOTAL_MARKS / questionCount;
    const fmtMark = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
    console.log(`[grade-course-exam] questions=${questionCount} perQuestion=${perQuestionMax}`);

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
          ? `مرفق ${images.length} صورة لأوراق إجابة الطالب. عالج كل صورة على حدة بالترتيب من الأولى إلى الأخيرة، ولا تتوقف بعد الصورة الأولى. لكل صورة اكتب أولاً سطراً: "===== الصفحة K من ${images.length} =====" ثم انسخ كل ما فيها من إجابات حرفياً، مع الحفاظ على أرقام الأسئلة كما كتبها الطالب. يجب أن تظهر جميع الصفحات في الناتج.`
          : `You will receive ${images.length} images of the student's answer sheets. Process every image in order from first to last — do NOT stop after the first image. Before each image write a line: "===== Page K of ${images.length} =====" then transcribe everything on that page verbatim, preserving the question numbers the student wrote. All pages MUST appear in the output.` },
    ];
    for (const url of images) ocrContent.push({ type: "image_url", image_url: { url } });

    const ocrResult = await callAiWithFallback(LOVABLE_API_KEY, OCR_MODELS, {
      messages: [
        { role: "system", content: ocrSystem },
        { role: "user", content: ocrContent },
      ],
    }, OCR_TIMEOUT_MS);
    if (!ocrResult.ok) {
      const status = ocrResult.status === 402 ? 402 : 200;
      return new Response(JSON.stringify({ error: `OCR failed: ${ocrResult.error}` }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const transcript = String(ocrResult.data.choices?.[0]?.message?.content ?? "").trim();
    console.log(`[grade-course-exam] OCR ok via ${ocrResult.model}`);
    const transcriptLooksUnreadable =
      !transcript ||
      transcript.length < 120 ||
      /\[(?:غير مقروء|unreadable)\]/i.test(transcript);

    // ===== STEP 2: Grade the transcribed text against the exam + answer key =====
    const hasKey = Boolean(answerPdf);
    const systemPrompt = isAr
      ? `أنت مصحّح وزاري عراقي صارم جداً. لديك ورقة الامتحان PDF${hasKey ? " وورقة الإجابة النموذجية PDF" : ""} ونص إجابات الطالب المستخرج بالـ OCR. الامتحان يتكون من ${questionCount} أسئلة، والدرجة الكلية 100، أي أن كل سؤال من ${fmtMark(perQuestionMax)} درجة، وتُحتسب جميع الأسئلة.

قواعد التصحيح الصارمة (إلزامية):
- ${hasKey ? "ورقة الإجابة النموذجية PDF هي **المرجع الوحيد والمطلق والحصري**. لا تعتمد على معرفتك العامة ولا على المنهج، بل فقط على ما هو مكتوب حرفياً داخل ملف الإجابة النموذجية. أي إجابة لا تطابق ما في نموذج الإجابة = خطأ حتى لو بدت صحيحة علمياً." : "لا يوجد نموذج إجابة مرفق؛ صحّح بحذر شديد وفق المنهج الوزاري وحده."}
- ${hasKey ? "قبل تصحيح كل سؤال، حدد أولاً في ذهنك الإجابة الصحيحة كما وردت **حرفياً** في نموذج الإجابة (النقاط، القيم العددية، الرموز، الوحدات، الرسم إن وُجد)، ثم قارن كل جملة من إجابة الطالب بها. أي انحراف = خصم." : ""}
- ${hasKey ? "الأرقام والقيم النهائية يجب أن تطابق نموذج الإجابة تماماً (مع تسامح ±1% للتقريب فقط). أي رقم مختلف = خطأ صريح." : ""}
- لا تمنح أي "درجات مجانية" أو مجاملة. لا تكافئ الجهد وحده.
- إذا لم يجب الطالب أو كتب كلاماً لا علاقة له: score = 0.
- الدرجة الجزئية مسموحة فقط عندما تطابق خطوة معينة خطوة موثّقة داخل نموذج الإجابة (قانون، تعويض، استنتاج). كل خطوة ناقصة = خصم.
- التعريفات والقوانين يجب أن تكون كما في نموذج الإجابة؛ أي نقص كلمة جوهرية = خصم.
- ممنوع التقريب للأعلى. لا تمنح الدرجة الكاملة إلا لإجابة مطابقة تماماً لنموذج الإجابة.
- استخدم نص الـ OCR كمصدر لإجابة الطالب فقط. لا تخترع نصاً غير موجود.
- إذا كان النص [غير مقروء]، ضع attempted=true و score=null و feedback="يحتاج مراجعة يدوية".
- في حقل corrections اكتب **الإجابة الصحيحة كما وردت في نموذج الإجابة** (اقتباس مباشر أو ملخص أمين لها)، وفي feedback اشرح لماذا خسر الطالب كل درجة بدقة.`
      : `You are an extremely strict Iraqi ministerial grader. You have the exam PDF${hasKey ? ", the model-answer PDF" : ""}, and the student's OCR transcript. The paper has ${questionCount} questions and the total is 100 marks, so each question is out of ${fmtMark(perQuestionMax)}. All questions count.

Strict grading rules (mandatory):
- ${hasKey ? "The model-answer PDF is the **single, absolute, exclusive reference**. Do NOT rely on your general knowledge or on the curriculum — only on what is literally written inside the answer-key PDF. Any answer that does not match the key = wrong, even if it looks scientifically plausible." : "No answer key is attached; grade cautiously using the official curriculum only."}
- ${hasKey ? "Before grading each question, first identify the correct answer **verbatim** from the answer key (bullet points, numeric values, symbols, units, diagram if any), then compare every sentence of the student's answer against it. Any deviation = deduction." : ""}
- ${hasKey ? "Final numerical values MUST match the answer key exactly (allow only ±1% rounding tolerance). Any different number = clear error." : ""}
- Never award free marks or sympathy marks. Effort alone earns nothing.
- If the student did not answer or wrote irrelevant content: score = 0.
- Partial credit is allowed ONLY when a step exactly matches a step documented inside the answer key (law, substitution, conclusion). Every missing step = deduction.
- Definitions and laws must match the answer key wording; any missing key word = deduction.
- Do NOT round up. Give full marks ONLY for an answer that fully matches the answer key.
- Use the OCR transcript as the student's answer source only. Do not fabricate text that isn't there.
- If the transcript is [unreadable], set attempted=true, score=null, feedback="needs manual review".
- In the "corrections" field, write **the correct answer as it appears in the answer key** (direct quote or faithful summary of it). In "feedback" explain precisely why each mark was lost.`;

    const forcedRules = `

MANDATORY OUTPUT RULES:
- The exam has exactly ${questionCount} main questions numbered 1..${questionCount} (this was determined from the ${hasKey ? "answer key" : "exam"} PDF).
- "per_question" MUST contain exactly ${questionCount} entries, one per question, even if the student did not answer some. For unanswered questions set attempted=false and score=0.
- Each question is out of ${fmtMark(perQuestionMax)}. "graded_out_of" MUST be 100 (${questionCount} × ${fmtMark(perQuestionMax)}).
- "total" MUST equal the SUM of all per_question scores (ignoring any question with score=null). Never invent a higher total.
- If all questions are 0, total = 0. Do NOT output 100 unless every question truly earned full marks.
- For EVERY question also output "ocr_confidence": an integer 0-100 describing how clearly you could READ the student's handwriting for that question in the transcript (100 = perfectly legible, 0 = nothing readable). Judge legibility only, not correctness.
- Also output "needs_review": true when ocr_confidence < 60, when the transcript for that question contains [unreadable]/[غير مقروء], or when you are not confident the grade is reliable. Otherwise false.`;

    const systemPromptFinal = systemPrompt + forcedRules;

    const userText = `The exam PDF, model-answer PDF (if any), and the student's OCR transcript are attached.
${examTitle ? `Exam title: ${examTitle}\n` : ""}
===== STUDENT OCR TRANSCRIPT (primary source) =====
${transcript || "[empty transcript]"}
===== END TRANSCRIPT =====

Grade each question by comparing the transcript above against the model-answer PDF.${transcriptLooksUnreadable ? " If the transcript is too unreadable to grade a question, mark that question for manual review instead of trying to infer it." : ""}

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "total": number,
  "graded_out_of": 100,
  "per_question": [
    { "n": number, "attempted": boolean, "score": number, "feedback": string, "corrections": string, "ocr_confidence": number, "needs_review": boolean }
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

    const gradeResult = await callAiWithFallback(LOVABLE_API_KEY, GRADE_MODELS, {
      messages: [
        { role: "system", content: systemPromptFinal },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }, GRADE_TIMEOUT_MS);
    if (!gradeResult.ok) {
      const status = gradeResult.status === 402 ? 402 : 200;
      return new Response(JSON.stringify({ error: `Grading failed: ${gradeResult.error}` }), {
        status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = gradeResult.data;
    console.log(`[grade-course-exam] Grade ok via ${gradeResult.model}`);
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try { parsed = JSON.parse(raw); } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      if (m) { try { parsed = JSON.parse(m[0]); } catch { /* keep */ } }
    }

    // Server-side normalization: enforce the detected question count and recompute the total out of 100.
    const obj = (parsed && typeof parsed === "object") ? { ...(parsed as Record<string, unknown>) } : {};
    const rawQs = Array.isArray((obj as any).per_question) ? (obj as any).per_question : [];
    const byN = new Map<number, any>();
    for (const q of rawQs) {
      const n = Number(q?.n);
      if (Number.isFinite(n) && n >= 1 && n <= questionCount) byN.set(n, q);
    }
    const normalized = [] as any[];
    for (let n = 1; n <= questionCount; n++) {
      const q = byN.get(n);
      if (q) {
        const scoreNum = q.score === null || q.score === undefined ? null : Math.max(0, Math.min(perQuestionMax, Number(q.score)));
        const confRaw = Number(q.ocr_confidence);
        const conf = Number.isFinite(confRaw) ? Math.max(0, Math.min(100, Math.round(confRaw))) : null;
        const needsReview = Boolean(q.needs_review) || scoreNum === null || (conf !== null && conf < 60);
        normalized.push({
          n,
          attempted: Boolean(q.attempted),
          score: Number.isFinite(scoreNum as number) ? scoreNum : null,
          out_of: perQuestionMax,
          ocr_confidence: conf,
          needs_review: needsReview,
          feedback: String(q.feedback ?? ""),
          corrections: String(q.corrections ?? ""),
        });
      } else {
        normalized.push({ n, attempted: false, score: 0, out_of: perQuestionMax, ocr_confidence: null, needs_review: false, feedback: isAr ? "لم يجب الطالب على هذا السؤال." : "Not answered.", corrections: "" });
      }
    }
    const rawTotal = normalized.reduce((sum, q) => sum + (typeof q.score === "number" ? q.score : 0), 0);
    const total = Math.max(0, Math.min(TOTAL_MARKS, Math.round(rawTotal * 100) / 100));
    (obj as any).per_question = normalized;
    (obj as any).total = total;
    (obj as any).graded_out_of = TOTAL_MARKS;
    (obj as any).question_count = questionCount;
    (obj as any).per_question_max = perQuestionMax;
    const confVals = normalized.map((q) => q.ocr_confidence).filter((v) => typeof v === "number") as number[];
    (obj as any).ocr_confidence_avg = confVals.length ? Math.round(confVals.reduce((a, b) => a + b, 0) / confVals.length) : null;
    (obj as any).review_count = normalized.filter((q) => q.needs_review).length;
    (obj as any).transcript_low_quality = transcriptLooksUnreadable;

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