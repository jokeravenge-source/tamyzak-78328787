import { protect } from "../_shared/guard.ts";
import { requireUser } from "../_shared/auth.ts";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_IMAGES = 10;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  const guard = await protect(req, "grade-ministerial-exam", { max: 6, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const { examText, modelAnswers, studentText, studentImages, language } = await req.json();
    if (!examText || typeof examText !== "string") {
      return new Response(JSON.stringify({ error: "Missing exam text" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const images = Array.isArray(studentImages)
      ? studentImages.filter((s) => typeof s === "string" && s.startsWith("data:image/")).slice(0, MAX_IMAGES)
      : [];
    const typed = typeof studentText === "string" ? studentText.trim() : "";
    if (!typed && !images.length) {
      return new Response(JSON.stringify({ error: "No student answer provided" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ent = await claimFeature(req, "essay");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
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

    const isAr = language !== "en";
    const systemPrompt = isAr
      ? `أنت مصحّح وزاري عراقي خبير للسادس الإعدادي. تصحّح إجابات الطالب على الامتحان الوزاري المُعطى بدقة عالية، وبنفس معايير التصحيح الحقيقية: كل سؤال 20 درجة، وتصحّح فقط 5 أسئلة (الأفضل للطالب). تعطي درجة جزئية لكل فرع بحسب صحة الخطوات والنتيجة النهائية، وتشرح الأخطاء بلطف وبلغة عربية واضحة.`
      : `You are an expert Iraqi ministerial exam grader for 6th-grade preparatory. Grade the student's answers on the given ministerial paper strictly using the real marking scheme: each question is out of 20, and only the best 5 questions count. Give partial credit per sub-part based on correct steps and final answer, and explain mistakes kindly and clearly.`;

    const userTextPart = `EXAM PAPER (Arabic, Iraqi ministerial format):
"""
${examText}
"""

${modelAnswers ? `MODEL ANSWERS (reference key):
"""
${modelAnswers}
"""

` : ""}STUDENT ANSWER (typed):
"""
${typed || "(none — see attached image(s))"}
"""

${images.length ? `Also attached: ${images.length} image(s) of the student's handwritten answer sheet. OCR them (Arabic + math + chemical formulas) and grade them together with any typed text above.\n\n` : ""}Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "total": number,           // out of 100 (best 5 of 6 × 20)
  "graded_out_of": 100,
  "per_question": [
    {
      "n": number,           // 1..6
      "attempted": boolean,
      "score": number,       // 0..20
      "feedback": string,    // in ${isAr ? "Arabic" : "English"}, mention correct steps and mistakes
      "corrections": string  // in ${isAr ? "Arabic" : "English"}, brief model-answer correction
    }
  ],
  "overall_feedback": string, // ${isAr ? "Arabic" : "English"} paragraph
  "strengths": string[],
  "improvements": string[]
}`;

    const userContent: unknown = images.length
      ? [
          { type: "text", text: userTextPart },
          ...images.map((url: string) => ({ type: "image_url", image_url: { url } })),
        ]
      : userTextPart;

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
          { role: "user", content: userContent },
        ],
        response_format: { type: "json_object" },
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
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown = {};
    try {
      parsed = JSON.parse(raw);
    } catch {
      const match = String(raw).match(/\{[\s\S]*\}/);
      if (match) {
        try { parsed = JSON.parse(match[0]); } catch { /* keep {} */ }
      }
    }
    return new Response(JSON.stringify(parsed), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});