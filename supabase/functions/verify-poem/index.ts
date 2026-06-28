import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { poem, language, poemTitle, poemAuthor, referenceText } = await req.json();
    if (!poem || typeof poem !== "string" || !poem.trim()) {
      return new Response(JSON.stringify({ error: "poem text required" }), {
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

    const ent = await claimFeature(req, "poem-verify");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const lang = language === "en" ? "English" : "Arabic";
    const title = (poemTitle || "").toString().trim();
    const author = (poemAuthor || "").toString().trim();

    const system = `You are a strict Arabic literature teacher checking a poem written from memory by an Iraqi 6th-grade student. You are given the OFFICIAL POEM TEXT from the curriculum and the student's typed version. The poem the student is trying to recall is: "${title}" by ${author}. Compare the student's text against THIS specific poem word by word.\n\nReturn ONLY valid JSON (no markdown fences) with this exact shape:\n{\n  "verdict": "correct" | "minor_errors" | "incorrect" | "not_in_reference",\n  "score": 0-100,\n  "summary": "one short sentence in ${lang} giving overall feedback",\n  "correct_text": "the exact correct poem text from the reference WITH full tashkeel, or empty string",\n  "mistakes": [\n    {\n      "student_wrote": "the exact wrong word/phrase as the student typed it",\n      "should_be": "the correct word/phrase from the reference WITH full tashkeel",\n      "kind": "missing" | "extra" | "wrong_word" | "spelling" | "order" | "tashkeel",\n      "note": "one short helpful sentence in ${lang} explaining the mistake — if it is a tashkeel mistake, name the specific harakah (فتحة/ضمة/كسرة/سكون/شدة/تنوين) on the LAST letter of the word"\n    }\n  ],\n  "tips": ["1-3 short memorisation tips in ${lang}"],\n  "source_hint": "short reference hint (poem title / poet) if useful, else empty"\n}\n\nRules:\n- TASHKEEL RULE (IMPORTANT): Only the harakah on the LAST letter of each word matters (the إعراب / حركة آخر الكلمة). IGNORE every internal tashkeel completely — missing, extra, or different fatha/damma/kasra/sukun/shadda/tanwin on any letter that is NOT the final letter of the word is NOT a mistake and MUST NOT be reported. Only flag a "tashkeel" mistake when the harakah on the FINAL letter of a word differs from the reference (or is missing while the reference has one on the final letter). When the final-letter harakah is correct, treat the word as fully correct regardless of internal tashkeel.\n- "correct" = matches the reference word-for-word AND every final-letter harakah matches. Only then mistakes MUST be an empty array.\n- "minor_errors" = same poem with small word/letter mistakes or wrong final-letter harakah.\n- "incorrect" = the student clearly tried this poem but the wording is significantly wrong.\n- "not_in_reference" = the text the student wrote is clearly a different poem.\n- ALWAYS list every concrete mistake in the "mistakes" array. Use the exact wording the student typed in student_wrote so we can highlight it. For a missing word use student_wrote:"" and put the missing word in should_be. For an extra word the student added, put it in student_wrote and use should_be:"".\n- Ignore line breaks, whitespace, and all internal (non-final-letter) tashkeel.\n- Write all user-facing text (summary, note, tips) in ${lang}.\n\n---OFFICIAL POEM TEXT (with tashkeel)---\n${referenceText.trim()}\n---END---`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Student's poem:\n\n${poem.trim()}` },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ error: "rate_limited" }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ error: "credits_exhausted" }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = await resp.json();
    const raw = data.choices?.[0]?.message?.content ?? "{}";
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      const m = String(raw).match(/\{[\s\S]*\}/);
      parsed = m ? JSON.parse(m[0]) : { verdict: "not_in_reference", summary: "Could not parse response." };
    }

    return new Response(JSON.stringify({ result: parsed }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});