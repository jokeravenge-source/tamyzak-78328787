import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
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
    const systemPrompt = isAr
      ? `أنت مصحّح وزاري عراقي خبير للسادس الإعدادي في مادة الفيزياء (فصل الليزر). لديك ورقة الامتحان بصيغة PDF وورقة الإجابة النموذجية بصيغة PDF، وصور خط يد الطالب. صحّح بدقة وفق معايير التصحيح الحقيقية: كل سؤال 20 درجة، وتحتسب أفضل 5 أسئلة من 6.

تعليمات التصحيح الإلزامية:
- اقرأ (OCR) خط اليد بعناية، مع مراعاة الخط الرديء والنص العربي والرموز الرياضية والفيزيائية.
- قارن كل إجابة مع ورقة الإجابة النموذجية الرسمية.
- امنح درجة جزئية عندما يكون الاستدلال أو الحل صحيحاً جزئياً.
- إذا كانت إجابة سؤال ما غير مقروءة أو ملتبسة، ضع "attempted": true و "score": null واكتب في feedback: "يحتاج مراجعة يدوية". لا توقف تصحيح بقية الأسئلة بسبب ذلك.
- اشرح الأخطاء بلطف بلغة عربية واضحة.`
      : `You are an expert Iraqi ministerial grader for 6th-grade physics (Laser chapter). You have the exam PDF, the model-answer PDF, and photos of the student's handwriting. Grade strictly using the real marking scheme: each question out of 20, best 5 of 6 count.

Mandatory grading instructions:
- OCR the handwritten text carefully, accounting for messy handwriting and Arabic script, math, and physics symbols.
- Compare each answer against the official answer key.
- Award partial credit where reasoning or working is partially correct.
- If a question's handwriting is unreadable or ambiguous, set "attempted": true, "score": null, and put "needs manual review" in feedback. Do NOT block grading the rest of the questions.
- Explain mistakes kindly.`;

    const userText = `The exam PDF, model-answer PDF (if any), and ${images.length} photo(s) of the student's handwritten answers are attached.
${examTitle ? `Exam title: ${examTitle}\n` : ""}OCR the images (Arabic + math + physics symbols) and grade against the model answers.

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
        model: AI_MODEL,
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
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});