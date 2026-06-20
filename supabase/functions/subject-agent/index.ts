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
const MAX_CONTEXT_CHARS = 60000;
const MAX_FILE_CHARS = 30000;
const MAX_FILES = 6;
const MAX_CHAT_MESSAGES = 8;

async function fetchSubjectContext(subject: string): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  // Read pre-indexed text from subject_file_text (extracted by index-subject-file).
  const { data: rows, error } = await admin
    .from("subject_file_text")
    .select("file_name,text")
    .eq("subject", subject)
    .order("updated_at", { ascending: false })
    .limit(MAX_FILES);

  if (error || !rows?.length) return "";

  const parts: string[] = [];
  let total = 0;
  for (const r of rows) {
    if (total >= MAX_CONTEXT_CHARS) break;
    const slice = (r.text ?? "").slice(0, MAX_FILE_CHARS);
    if (!slice) continue;
    parts.push(`### File: ${r.file_name}\n${slice}`);
    total += slice.length;
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

    const noFiles = language === "ar"
      ? "لا توجد ملفات مفهرسة لهذه المادة بعد. اطلب من المسؤول فهرسة الملفات."
      : "No indexed reference files for this subject yet. Ask an admin to index the files.";
    if (!context) {
      return new Response(JSON.stringify({ reply: noFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const system = `You are a strict ${label} tutor for high-school students. Your ONLY source of truth is the REFERENCE MATERIAL below (extracted from the official PDF files).\n\nHow to answer:\n- Answer EXACTLY as the reference material says. Quote or closely paraphrase it. Cite the file name in parentheses, e.g. (source: filename.pdf).\n- If the answer is not in the reference material, reply with exactly: "${refusal}". Do NOT use outside knowledge.\n- Keep the wording faithful to the PDF; do not invent facts, numbers, names, or definitions.\n\nSTYLE:\n- Always respond in ${lang}.\n- Short paragraphs or bullet points. Define technical terms only when the reference defines them.\n\n---REFERENCE MATERIAL (from indexed PDFs)---\n${context}\n---END REFERENCE---`;
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