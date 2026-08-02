import { protect } from "../_shared/guard.ts";
import { requireUser } from "../_shared/auth.ts";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

/** Remove Arabic diacritics (tashkeel), tatweel, and normalize alef/ya/ta-marbuta + whitespace. */
function stripDiacritics(s: string): string {
  return s
    .replace(/[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED\u08D3-\u08FF]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[\u0622\u0623\u0625]/g, "\u0627")
    .replace(/\u0649/g, "\u064A")
    .replace(/\u0629/g, "\u0647")
    .replace(/\s+/g, " ")
    .trim();
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await protect(req, "verify-surah", { max: 8, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  const auth = await requireUser(req);
  if (!auth.ok) return new Response(JSON.stringify({ error: auth.error }), { status: auth.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { surah, language, surahName, referenceText } = await req.json();
    if (!surah || typeof surah !== "string" || !surah.trim()) {
      return new Response(JSON.stringify({ error: "surah text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!referenceText || typeof referenceText !== "string" || !referenceText.trim()) {
      return new Response(JSON.stringify({ error: "referenceText required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ent = await claimFeature(req, "surah-verify");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "en" ? "English" : "Arabic";
    const reference = referenceText.trim();
    const studentRaw = surah.trim();
    const studentNorm = stripDiacritics(studentRaw);
    const refNorm = stripDiacritics(reference);

    const system = `You are a careful Qur'an teacher checking Qur'anic verses written by an Iraqi 6th-grade Islamic Education student. You are given the OFFICIAL VERSES${surahName ? ` (${surahName})` : ""} and the student's typed text. Compare them carefully and tell the student EXACTLY where they went wrong, word by word.

CRITICAL: IGNORE all tashkeel (diacritics: fatha, kasra, damma, shadda, sukun, tanwin) and minor whitespace. DO NOT report any diacritic difference as a mistake. Only report differences in actual letters/words.

Return ONLY valid JSON (no markdown fences) with this exact shape:
{
  "verdict": "correct" | "minor_errors" | "incorrect",
  "score": 0-100,
  "summary": "one short sentence in ${lang} giving overall feedback",
  "correct_text": "the exact correct verses from the reference (with diacritics)",
  "mistakes": [
    {
      "student_wrote": "the exact wrong word/phrase as the student typed it (without diacritics is fine)",
      "should_be": "the correct word/phrase",
      "kind": "missing" | "extra" | "wrong_word" | "spelling" | "order",
      "note": "one short helpful sentence in ${lang} explaining the mistake"
    }
  ],
  "tips": ["1-3 short study tips in ${lang}"],
  "source_hint": ""
}

Rules:
- "correct" = letters match the reference essentially word-for-word after ignoring diacritics. mistakes MUST be an empty array.
- "minor_errors" = small letter/word mistakes.
- "incorrect" = significantly wrong.
- Write all user-facing text (summary, note, tips) in ${lang}.
- NEVER list a tashkeel-only difference as a mistake.

---OFFICIAL VERSES (with diacritics, for reference)---
${reference}
---OFFICIAL VERSES (without diacritics, use this for comparison)---
${refNorm}
---END---`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Student's text (raw):\n${studentRaw}\n\nStudent's text (diacritics stripped, use this for comparison):\n${studentNorm}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: t }), {
        status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { verdict: "incorrect", summary: "Could not parse response." };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});