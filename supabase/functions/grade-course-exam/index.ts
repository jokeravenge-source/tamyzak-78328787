import { protect } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { enforceRateLimit } from "../_shared/rate-limit.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const GRADE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-3.5-flash",
];
const STRUCTURE_MODELS = [
  "google/gemini-3.5-flash",
  "google/gemini-2.5-pro",
];
const MAX_IMAGES = 10;
// Whole-request budget. The edge runtime / proxy drops the connection well
// before this, so every AI step must fit inside it.
const TOTAL_BUDGET_MS = 130_000;
const GRADE_TIMEOUT_MS = 65_000;
// Answer-key extraction runs once per exam (cached afterwards), so it gets a
// generous slice of the budget.
const STRUCTURE_TIMEOUT_MS = 55_000;
const TOTAL_MARKS = 100;

let deadline = 0;
const msLeft = () => deadline - Date.now();
const budgeted = (want: number) => Math.max(5_000, Math.min(want, msLeft() - 5_000));

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
    // Don't start another attempt we can't finish before the connection dies.
    if (msLeft() < 8_000) {
      return { ok: false, status: 504, error: lastErr || "Time budget exhausted." };
    }
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), budgeted(perCallTimeoutMs));
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
  const guard = await protect(req, "grade-course-exam", { max: 4, windowSeconds: 60, maxBytes: 25 * 1024 * 1024 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  deadline = Date.now() + TOTAL_BUDGET_MS;

  let refundQuotaRef: (() => Promise<void>) | null = null;
  try {
    // Require a verified session before touching private exam files or the AI gateway.
    const auth = await requireUser(req);
    if (!auth.ok) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const { examId, studentImages, language, examTitle } = await req.json();
    if (!examId || typeof examId !== "string") {
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

    const limited = await enforceRateLimit(req, "grade-course-exam", 3, 120);
    if (!limited.ok) {
      return new Response(JSON.stringify({ error: limited.error }), {
        status: limited.status, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // One AI paper scan per day for free students (premium is unlimited).
    let claimedQuota = false;
    /** Give the daily scan back when grading never produced a result. */
    const refundQuota = async () => {
      if (!claimedQuota) return;
      claimedQuota = false;
      try {
        const svc = createClient(
          Deno.env.get("SUPABASE_URL")!,
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        );
        const { data: rows } = await svc
          .from("feature_usage")
          .select("id")
          .eq("user_id", auth.userId)
          .eq("feature", "ocr_grade")
          .order("created_at", { ascending: false })
          .limit(1);
        const id = rows?.[0]?.id;
        if (id) await svc.from("feature_usage").delete().eq("id", id);
      } catch { /* best effort */ }
    };
    refundQuotaRef = refundQuota;
    {
      const authHeader = req.headers.get("Authorization") ?? "";
      const db = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_ANON_KEY")!,
        { global: { headers: { Authorization: authHeader } } },
      );
      const { data: allowed, error: claimErr } = await db.rpc("claim_daily_feature_limit", {
        _feature: "ocr_grade",
        _limit: 1,
      });
      if (claimErr) {
        return new Response(JSON.stringify({ error: claimErr.message }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (!allowed) {
        const isAr = language !== "en";
        return new Response(JSON.stringify({
          error: isAr
            ? "لقد استخدمت تصحيح ورقة واحدة اليوم. يتجدد عند منتصف الليل بتوقيت بغداد، أو اشترك في النسخة المميزة للاستخدام غير المحدود."
            : "You've used your 1 free paper scan for today. It resets at midnight Baghdad time, or upgrade to Premium for unlimited scans.",
          upgrade: true,
        }), { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      claimedQuota = true;
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      await refundQuota();
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    // Resolve the storage paths server-side from the exam row — clients never
    // supply (or see) the answer-key path.
    const { data: examRow } = await admin
      .from("course_exams")
      .select("exam_path, answer_path, question_count, question_marks")
      .eq("id", examId)
      .maybeSingle();
    if (!examRow?.exam_path) {
      await refundQuota();
      return new Response(JSON.stringify({ error: "Exam not found." }), {
        status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const examPath = examRow.exam_path as string;
    const answerPath = examRow.answer_path as string | null;

    const isAr = language !== "en";

    // ===== Answer-key extraction (cached per exam — the key never changes) =====
    let questionCount = 0;
    let marks: number[] = [];
    let keyText = "";
    let keyFromCache = false;

    const { data: cached } = await admin
      .from("course_exam_answer_keys")
      .select("answer_path, question_count, marks, key_text")
      .eq("exam_id", examId)
      .maybeSingle();
    if (cached && (cached.answer_path ?? null) === (answerPath ?? null) && String(cached.key_text ?? "").trim()) {
      keyText = String(cached.key_text);
      const n = Number(cached.question_count);
      if (Number.isFinite(n) && n >= 1 && n <= 40) {
        questionCount = Math.round(n);
        const cm = Array.isArray(cached.marks) ? (cached.marks as unknown[]).map(Number).filter((v) => Number.isFinite(v) && v > 0) : [];
        if (cm.length === questionCount) marks = cm;
      }
      keyFromCache = true;
    }

    // Admin-provided marks always win over anything detected by AI.
    const adminCount = Number((examRow as any).question_count);
    const adminMarks = Array.isArray((examRow as any).question_marks)
      ? ((examRow as any).question_marks as unknown[]).map((v) => Number(v)).filter((v) => Number.isFinite(v) && v > 0)
      : [];
    if (Number.isFinite(adminCount) && adminCount >= 1 && adminCount <= 40 && adminMarks.length === adminCount) {
      questionCount = adminCount;
      marks = adminMarks;
    }

    // If the client already gave up, stop instead of burning AI credits.
    if (req.signal?.aborted) { await refundQuota(); return new Response(null, { status: 499, headers: corsHeaders }); }

    // Cache miss: read the exam + answer PDFs ONCE and distill them into a
    // reusable text key, then persist it so later gradings never touch the PDFs.
    if (!keyFromCache) {
      const [examPdf, answerPdf] = await Promise.all([
        pdfToDataUrl(admin, examPath),
        answerPath ? pdfToDataUrl(admin, answerPath) : Promise.resolve(null),
      ]);
      if (!examPdf) {
        await refundQuota();
        return new Response(JSON.stringify({ error: "Could not load the exam PDF." }), {
          status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const keyContent: unknown[] = [
        {
          type: "text",
          text: `Read the attached exam PDF${answerPdf ? " and its model-answer PDF" : ""} and produce a complete, faithful grading key.
Count only MAIN questions (Q1, Q2, س1, س2 — never count sub-parts a/b/c as separate questions).
Return ONLY valid JSON:
{"question_count": number, "questions":[{"n": number, "question": string, "model_answer": string}]}
"question" = the question text (may be summarized, keep all data/values).
"model_answer" = the correct answer copied VERBATIM from the answer key${answerPdf ? "" : " (no key attached: write the curriculum-correct answer)"}, including every required point, numeric value, unit and step.
Write in the original language of the PDF.`,
        },
        { type: "file", file: { filename: "exam.pdf", file_data: examPdf } },
      ];
      if (answerPdf) keyContent.push({ type: "file", file: { filename: "answer-key.pdf", file_data: answerPdf } });

      const keyResult = await callAiWithFallback(LOVABLE_API_KEY, STRUCTURE_MODELS, {
        messages: [
          { role: "system", content: "You extract exam questions and their model answers from PDFs. Answer with JSON only, no commentary." },
          { role: "user", content: keyContent },
        ],
        response_format: { type: "json_object" },
      }, STRUCTURE_TIMEOUT_MS);

      if (keyResult.ok) {
        const rawKey = keyResult.data.choices?.[0]?.message?.content ?? "{}";
        try {
          const s = JSON.parse(String(rawKey).match(/\{[\s\S]*\}/)?.[0] ?? "{}");
          const list = Array.isArray(s?.questions) ? s.questions : [];
          const n = Number(s?.question_count) || list.length;
          if (Number.isFinite(n) && n >= 1 && n <= 40) {
            if (!questionCount) questionCount = Math.round(n);
          }
          keyText = list
            .map((q: any, i: number) => `--- Q${Number(q?.n) || i + 1} ---\nQUESTION: ${String(q?.question ?? "").trim()}\nMODEL ANSWER: ${String(q?.model_answer ?? "").trim()}`)
            .join("\n\n")
            .slice(0, 60_000);
        } catch { /* fall through to defaults */ }
      }

      if (!questionCount) questionCount = 6;
      if (marks.length !== questionCount) {
        marks = Array.from({ length: questionCount }, () => TOTAL_MARKS / questionCount);
      }

      if (keyText) {
        await admin.from("course_exam_answer_keys").upsert({
          exam_id: examId,
          answer_path: answerPath,
          question_count: questionCount,
          marks,
          key_text: keyText,
          updated_at: new Date().toISOString(),
        }, { onConflict: "exam_id" });
      }
    }

    if (!questionCount) questionCount = 6;
    if (marks.length !== questionCount) {
      marks = Array.from({ length: questionCount }, () => TOTAL_MARKS / questionCount);
    }

    const markFor = (n: number) => marks[n - 1] ?? TOTAL_MARKS / questionCount;
    const totalPossible = Math.round(marks.reduce((a, b) => a + b, 0) * 100) / 100;
    const fmtMark = (v: number) => (Number.isInteger(v) ? String(v) : v.toFixed(2));
    const marksList = marks.map((m, i) => `Q${i + 1}=${fmtMark(m)}`).join(", ");
    console.log(`[grade-course-exam] questions=${questionCount} marks=${marksList}`);

    // ===== SINGLE CALL: read the student's photos AND grade them in one pass =====
    const hasKey = Boolean(keyText);
    let transcript = "";
    let transcriptLooksUnreadable = false;

    const systemPrompt = isAr
      ? `أنت مصحّح وزاري عراقي صارم جداً وقارئ خط يد خبير. ستستلم صور أوراق إجابة الطالب بخط اليد ومفتاح التصحيح النصي (الأسئلة + الإجابات النموذجية). مهمتك: قراءة ما كتبه الطالب حرفياً ثم تصحيحه في خطوة واحدة. الامتحان يتكون من ${questionCount} أسئلة وتوزيع الدرجات: ${marksList} (المجموع ${fmtMark(totalPossible)}).

قواعد صارمة (إلزامية):
- ${hasKey ? "مفتاح التصحيح المرفق نصاً هو **المرجع الوحيد والمطلق**. أي إجابة لا تطابقه = خطأ حتى لو بدت صحيحة علمياً." : "لا يوجد مفتاح تصحيح؛ صحّح بحذر شديد وفق المنهج الوزاري."}
- اقرأ الصور بدقة: انسخ ما هو مكتوب فقط بدون تصحيح أو إضافة، مع الحفاظ على المعادلات والوحدات وأرقام الأسئلة. إذا كان جزء غير مقروء اكتب [غير مقروء].
- الأرقام والقيم النهائية يجب أن تطابق المفتاح (تسامح ±1% للتقريب فقط).
- لا تمنح درجات مجانية. إذا لم يجب الطالب أو كتب كلاماً لا علاقة له: score = 0.
- الدرجة الجزئية فقط عند مطابقة خطوة موثّقة في المفتاح. كل خطوة ناقصة = خصم.
- إذا كان ما كتبه الطالب غير مقروء، ضع attempted=true و score=null و feedback="يحتاج مراجعة يدوية".
- في corrections اكتب الإجابة الصحيحة كما في المفتاح، وفي feedback اشرح سبب خسارة كل درجة.`
      : `You are an extremely strict Iraqi ministerial grader and an expert handwriting reader. You receive photos of the student's handwritten answer sheets plus a text grading key (questions + model answers). Transcribe what the student wrote and grade it in ONE pass. The paper has ${questionCount} questions with marks: ${marksList} (total ${fmtMark(totalPossible)}).

Strict rules (mandatory):
- ${hasKey ? "The attached text grading key is the **single absolute reference**. Any answer that does not match it = wrong, even if scientifically plausible." : "No grading key is available; grade cautiously using the official curriculum only."}
- Read the images carefully: transcribe exactly what is written, never correct or invent text; preserve equations, units and question numbers. Write [unreadable] for illegible parts.
- Final numerical values MUST match the key (±1% rounding tolerance only).
- Never award free marks. If the student did not answer or wrote irrelevant content: score = 0.
- Partial credit only when a step matches a step documented in the key. Every missing step = deduction.
- If the handwriting is illegible for a question, set attempted=true, score=null, feedback="needs manual review".
- In "corrections" write the correct answer as in the key; in "feedback" explain precisely why each mark was lost.`;

    const forcedRules = `

MANDATORY OUTPUT RULES:
- The exam has exactly ${questionCount} main questions numbered 1..${questionCount}.
- "per_question" MUST contain exactly ${questionCount} entries, one per question, even if the student did not answer some. For unanswered questions set attempted=false and score=0.
- Each question has its OWN maximum mark: ${marksList}. Never exceed it. "graded_out_of" MUST be ${fmtMark(totalPossible)}.
- "total" MUST equal the SUM of all per_question scores (ignoring score=null). Never invent a higher total.
- For EVERY question output "ocr_confidence": integer 0-100 for how clearly you could READ the handwriting (legibility only, not correctness).
- Output "needs_review": true when ocr_confidence < 60, when the handwriting is unreadable, or when the grade is not reliable. Otherwise false.
- Also output "transcript": the full verbatim transcription of ALL pages, in reading order, each page preceded by "===== Page K =====".`;

    const systemPromptFinal = systemPrompt + forcedRules;

    const userText = `${examTitle ? `Exam title: ${examTitle}\n` : ""}${images.length} photo(s) of the student's answer sheets are attached. Process EVERY image in order.

===== GRADING KEY (questions + model answers, the only reference) =====
${keyText || "[no key available]"}
===== END KEY =====

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "total": number,
  "graded_out_of": ${fmtMark(totalPossible)},
  "transcript": string,
  "per_question": [
    { "n": number, "attempted": boolean, "score": number, "feedback": string, "corrections": string, "ocr_confidence": number, "needs_review": boolean }
  ],
  "overall_feedback": string,
  "strengths": string[],
  "improvements": string[]
}
All feedback strings in ${isAr ? "Arabic" : "English"}.`;

    const content: unknown[] = [{ type: "text", text: userText }];
    for (const url of images) content.push({ type: "image_url", image_url: { url } });

    const gradeResult = await callAiWithFallback(LOVABLE_API_KEY, GRADE_MODELS, {
      messages: [
        { role: "system", content: systemPromptFinal },
        { role: "user", content },
      ],
      response_format: { type: "json_object" },
    }, GRADE_TIMEOUT_MS);
    if (!gradeResult.ok) {
      await refundQuota();
      const status = gradeResult.status === 402 ? 402 : 200;
      const msg = gradeResult.status === 504
        ? (isAr ? "استغرق التصحيح وقتاً طويلاً. الرجاء المحاولة مرة أخرى." : "Grading took too long. Please try again.")
        : `Grading failed: ${gradeResult.error}`;
      return new Response(JSON.stringify({ error: msg }), {
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
    transcript = String((obj as any).transcript ?? "").trim();
    delete (obj as any).transcript;
    transcriptLooksUnreadable =
      !transcript || transcript.length < 120 || /\[(?:غير مقروء|unreadable)\]/i.test(transcript);
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
        const scoreNum = q.score === null || q.score === undefined ? null : Math.max(0, Math.min(markFor(n), Number(q.score)));
        const confRaw = Number(q.ocr_confidence);
        const conf = Number.isFinite(confRaw) ? Math.max(0, Math.min(100, Math.round(confRaw))) : null;
        const needsReview = Boolean(q.needs_review) || scoreNum === null || (conf !== null && conf < 60);
        normalized.push({
          n,
          attempted: Boolean(q.attempted),
          score: Number.isFinite(scoreNum as number) ? scoreNum : null,
          out_of: markFor(n),
          ocr_confidence: conf,
          needs_review: needsReview,
          feedback: String(q.feedback ?? ""),
          corrections: String(q.corrections ?? ""),
        });
      } else {
        normalized.push({ n, attempted: false, score: 0, out_of: markFor(n), ocr_confidence: null, needs_review: false, feedback: isAr ? "لم يجب الطالب على هذا السؤال." : "Not answered.", corrections: "" });
      }
    }
    const rawTotal = normalized.reduce((sum, q) => sum + (typeof q.score === "number" ? q.score : 0), 0);
    const total = Math.max(0, Math.min(totalPossible, Math.round(rawTotal * 100) / 100));
    (obj as any).per_question = normalized;
    (obj as any).total = total;
    (obj as any).graded_out_of = totalPossible;
    (obj as any).question_count = questionCount;
    (obj as any).per_question_max = marks;
    const confVals = normalized.map((q) => q.ocr_confidence).filter((v) => typeof v === "number") as number[];
    (obj as any).ocr_confidence_avg = confVals.length ? Math.round(confVals.reduce((a, b) => a + b, 0) / confVals.length) : null;
    (obj as any).review_count = normalized.filter((q) => q.needs_review).length;
    (obj as any).transcript_low_quality = transcriptLooksUnreadable;

    const out = { ...obj, transcript };
    return new Response(JSON.stringify(out), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    await refundQuotaRef?.();
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});