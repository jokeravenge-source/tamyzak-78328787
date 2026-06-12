import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CHARS = 120000;

let cachedReference: string | null = null;

async function loadReference(): Promise<string> {
  if (cachedReference) return cachedReference;
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);
  const { data: blob, error } = await admin.storage
    .from("files")
    .download("islamic/hadith-reference.pdf");
  if (error || !blob) throw new Error("Reference file not found");
  const buf = new Uint8Array(await blob.arrayBuffer());
  const pdf = await getDocumentProxy(buf);
  const { text } = await extractText(pdf, { mergePages: true });
  const clean = (Array.isArray(text) ? text.join("\n") : text).slice(0, MAX_CHARS);
  cachedReference = clean;
  return clean;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { hadith, language } = await req.json();
    if (!hadith || typeof hadith !== "string" || !hadith.trim()) {
      return new Response(JSON.stringify({ error: "hadith text required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const ent = await claimFeature(req, "hadith-verify");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const reference = await loadReference();
    const lang = language === "en" ? "English" : "Arabic";

    const system = `You are a careful checker of Prophetic Hadiths for an Iraqi 6th-grade Islamic Education student. You are given the OFFICIAL REFERENCE (the curriculum book "الدرر النقية في الأحاديث النبوية") and the student's typed hadith. Your job is to verify whether the student's text matches a hadith from the reference.\n\nReturn ONLY valid JSON (no markdown fences) with this exact shape:\n{\n  "verdict": "correct" | "minor_errors" | "incorrect" | "not_in_reference",\n  "score": 0-100,\n  "summary": "one short sentence in ${lang}",\n  "correct_text": "the exact correct hadith text from the reference, or empty string if not found",\n  "differences": ["short bullet of each mistake in ${lang}", ...],\n  "source_hint": "short reference / chapter / page hint from the book if visible, else empty"\n}\n\nRules:\n- "correct" = matches the reference essentially word-for-word (allow tiny diacritic / spacing differences).\n- "minor_errors" = same hadith, but with small word/letter mistakes.\n- "incorrect" = the hadith exists in the reference but the student's wording is significantly wrong.\n- "not_in_reference" = no matching hadith found in the reference book.\n- Always write user-facing fields (summary, differences) in ${lang}.\n- Compare Arabic text carefully; ignore differences in tashkeel (diacritics) and minor spacing.\n\n---REFERENCE BOOK TEXT (may be partial)---\n${reference}\n---END REFERENCE---`;

    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [
          { role: "system", content: system },
          { role: "user", content: `Student's hadith:\n\n${hadith.trim()}` },
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