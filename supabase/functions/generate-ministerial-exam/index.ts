import { protect } from "../_shared/guard.ts";
import { requireUser } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

const SUBJECT_AR: Record<string, string> = {
  physics: "الفيزياء",
  chemistry: "الكيمياء",
  biology: "الأحياء",
  english: "اللغة الإنكليزية",
  french: "اللغة الفرنسية",
  arabic: "اللغة العربية",
  islamic: "التربية الإسلامية",
  math: "الرياضيات",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "generate-ministerial-exam", { max: 6, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { subject, chapterN, chapterTitleAr, chapterTitleEn, language } = await req.json();
    if (!subject || !chapterN) {
      return new Response(JSON.stringify({ error: "Missing subject or chapter" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: "LOVABLE_API_KEY not configured" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const subjAr = SUBJECT_AR[subject] ?? subject;
    const isAr = language === "ar";
    const now = new Date();
    const hijri = 1400 + (now.getFullYear() - 1979);

    const systemPrompt = `أنت مُعدّ امتحانات وزارية عراقية للسادس الإعدادي (الفرع العلمي الأحيائي/التطبيقي). مهمتك توليد امتحان وزاري كامل بنفس الأسلوب والصياغة والمستوى الحقيقي للأسئلة الوزارية العراقية الأصلية (2013-2023) لمادة محددة وفصل محدد فقط، دون أي محتوى من فصول أخرى. يجب أن يبدو الامتحان مطابقاً تماماً للورقة الوزارية الرسمية.`;

    const userPrompt = `ولّد امتحاناً وزارياً كاملاً بالمواصفات التالية:

- المادة: ${subjAr}
- الفصل: الفصل ${chapterN}${chapterTitleAr ? ` - ${chapterTitleAr}` : ""}${chapterTitleEn ? ` (${chapterTitleEn})` : ""}
- الدور: الدور الأول ${hijri}هـ - ${now.getFullYear()}م
- الوقت: ثلاث ساعات ونصف

المتطلبات الصارمة:
1) يبدأ الامتحان بترويسة رسمية بهذا الشكل حرفياً:
   بسم الله الرحمن الرحيم
   اللجنة الدائمة للامتحانات العامة
   جمهورية العراق - وزارة التربية
   الدراسة: الإعدادية / العلمي
   المادة: ${subjAr}
   الدور الأول ${hijri}هـ - ${now.getFullYear()}م
   الوقت: ثلاث ساعات ونصف

2) ثم ملاحظة: "الإجابة عن خمسة أسئلة فقط... (لكل سؤال 20 درجة)" مع أي ملاحظة خاصة بالمادة (مثل: مع كتابة المعادلات الكيميائية أينما وجدت للكيمياء، أو مع رسم المخططات للفيزياء).

3) ستة أسئلة (س1 إلى س6)، كل سؤال مقسم إلى فروع (أ، ب، ج) بخيارات مثل "أجب عن اثنين فقط" أو "أجب عن فرعين". يجب أن تكون الأسئلة متنوعة:
   - مسائل حسابية بأرقام واقعية وخطوات حل حقيقية
   - تعاريف
   - علل (تعليل ظواهر)
   - نواتج تفاعلات / معادلات
   - إكمال فراغات
   - أسئلة نظرية قصيرة
   وكلها ضمن نطاق ${chapterTitleAr || `الفصل ${chapterN}`} فقط من مادة ${subjAr} للسادس الإعدادي في المنهج العراقي.

4) استخدم صياغة الوزارة الحرفية: "س١ :", "أ-", "ب-", "علل ما يأتي", "أجب عن اثنين مما يأتي", "احسب", "عرف اثنين فقط", إلخ. اكتب المعادلات والصيغ الكيميائية والقوانين الفيزيائية بالشكل النصي الواضح (مثل: 2NOCl(g) ⇌ 2NO(g) + Cl2(g)).

5) في نهاية ورقة الأسئلة أضف سطر "استفد:" بالثوابت المطلوبة للحل إن وجدت (log, ln, كتل ذرية، ثوابت).

6) بعد ورقة الأسئلة اترك سطراً فاصلاً ثم اكتب "===ANSWERS===" ثم اكتب نموذج إجابة مفصّل لكل سؤال (س1 إلى س6) بجميع فروعه مع خطوات الحل الكاملة للمسائل الحسابية.

7) لا تكتب أي شرح أو مقدمة قبل الترويسة، ولا أي تعليق بعد الإجابات. أخرج المحتوى الخام فقط.

${!isAr ? "The exam text itself must remain in Arabic (Iraqi ministerial format is Arabic), but you may write English chemical/physics symbols as usual." : ""}`;

    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      if (res.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limit. Try again shortly." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (res.status === 402) {
        return new Response(JSON.stringify({ error: "AI credits exhausted. Add credits in Settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: `AI error: ${errText}` }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await res.json();
    const raw: string = data.choices?.[0]?.message?.content ?? "";
    const [examPart, answersPart] = raw.split(/===ANSWERS===/i);
    return new Response(
      JSON.stringify({
        exam: (examPart ?? "").trim(),
        answers: (answersPart ?? "").trim(),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});