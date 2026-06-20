import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { claimFeature } from "../_shared/entitlement.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBJECT_LABELS: Record<string, string> = {
  biology: "Biology",
  physics: "Physics",
  chemistry: "Chemistry",
  arabic: "Arabic",
  french: "French",
  english: "English",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";
const MAX_CONTEXT_CHARS = 18000;
const MAX_FILE_CHARS = 6000;
const MAX_FILES = 2;
const MAX_CHAT_MESSAGES = 8;

async function fetchSubjectContext(subject: string): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  // List files from the `files` storage bucket, organized by subject folder.
  const { data: objects, error } = await admin.storage
    .from("files")
    .list(subject, { limit: 100, sortBy: { column: "created_at", order: "desc" } });

  if (error || !objects?.length) return "";

  const files = objects
    .filter((o) => o.name && !o.name.startsWith(".") && o.name !== ".lovkeep")
    .slice(0, 20)
    .map((o) => ({
      name: o.name,
      file_path: `${subject}/${o.name}`,
      mime_type: (o.metadata as { mimetype?: string } | null)?.mimetype ?? "",
    }));

  if (!files.length) return "";

  const parts: string[] = [];
  let total = 0;
  const MAX = MAX_CONTEXT_CHARS;
  const pdfNames: string[] = [];
  const textFiles = files.filter((f) => {
    const lower = f.file_path.toLowerCase();
    const isPdf = lower.endsWith(".pdf") || f.mime_type === "application/pdf";
    if (isPdf) pdfNames.push(f.name);
    return !isPdf;
  }).slice(0, MAX_FILES);

  if (pdfNames.length) {
    parts.push(`### Reference PDFs available for this subject (not parsed inline):\n- ${pdfNames.join("\n- ")}`);
  }

  for (const f of textFiles) {
    if (total >= MAX) break;
    if (!f.file_path) continue;
    const { data: blob } = await admin.storage.from("files").download(f.file_path);
    if (!blob) continue;
    try {
      const text = (await blob.text()).slice(0, MAX_FILE_CHARS);
      parts.push(`### File: ${f.name}\n${text}`);
      total += text.length;
    } catch { /* skip binary */ }
  }
  return parts.join("\n\n");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { subject, messages, language } = await req.json();
    if (!subject || !Array.isArray(messages)) {
      return new Response(JSON.stringify({ error: "subject and messages required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const ent = await claimFeature(req, "agent");
    if (!ent.ok) {
      return new Response(JSON.stringify({ error: ent.error, upgrade: ent.status === 429 }), {
        status: ent.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const label = SUBJECT_LABELS[subject] ?? subject;
    const context = await fetchSubjectContext(subject);
    const lang = language === "ar" ? "Arabic" : "English";
    const refusal = language === "ar"
      ? "هذا السؤال غير مذكور في الملفات المرفوعة، لذلك لا أستطيع الإجابة عنه."
      : "This question is not covered in the uploaded files, so I can't answer it.";
    const rateLimited = language === "ar"
      ? "الطلبات كثيرة الآن. حاول مرة أخرى بعد ثوانٍ قليلة."
      : "Too many requests right now. Please try again in a few seconds.";
    const creditsExhausted = language === "ar"
      ? "ميزة الذكاء غير متاحة حالياً لهذا المشروع."
      : "AI is temporarily unavailable for this project right now.";
    const temporaryFailure = language === "ar"
      ? "تعذر إكمال الطلب الآن. حاول مرة أخرى بعد قليل."
      : "I couldn't complete that right now. Please try again shortly.";

    const referenceBlock = context
      ? `\n\n---REFERENCE MATERIAL (may be partial)---\n${context}\n---END REFERENCE---`
      : "";
    const system = `You are a friendly ${label} tutor for high-school students.\n\nHow to answer:\n- Answer using your own accurate ${label} knowledge. If reference material is provided below, prefer it when it covers the question and you may cite the file name in parentheses.\n- Only refuse with "${refusal}" if the question is clearly OFF-TOPIC for ${label}.\n\nTEACHING STYLE (very important):\n- Always explain in SIMPLE, everyday language — as if talking to a 14-year-old. Avoid jargon; when you must use a technical term, define it in one short sentence.\n- Break ideas into small steps and short paragraphs or bullet points.\n- ALWAYS include at least one REAL-LIFE EXAMPLE or analogy from everyday life (kitchen, sports, phone, car, weather, school, etc.) so the concept feels concrete.\n- End with a one-line "في الحياة اليومية" / "In real life" takeaway that ties the idea to something the student already knows.\n- Always respond in ${lang}.${referenceBlock}`;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const safeMessages = messages
      .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string")
      .slice(-MAX_CHAT_MESSAGES);

    const resp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: AI_MODEL,
        messages: [{ role: "system", content: system }, ...safeMessages],
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      if (resp.status === 429) {
        return new Response(JSON.stringify({ reply: rateLimited, temporary: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (resp.status === 402) {
        return new Response(JSON.stringify({ reply: creditsExhausted, temporary: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ error: t }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? temporaryFailure;
    return new Response(JSON.stringify({ reply }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});