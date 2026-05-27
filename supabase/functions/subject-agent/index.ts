import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";
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
const MAX_CONTEXT_CHARS = 40000;
const MAX_FILE_CHARS = 12000;
const MAX_FILES = 3;
const MAX_CHAT_MESSAGES = 10;

async function fetchSubjectContext(subject: string): Promise<string> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

  const { data: summaries, error } = await admin
    .from("summaries")
    .select("name, file_path, mime_type")
    .eq("approved", true)
    .eq("subject", subject)
    .order("created_at", { ascending: false })
    .limit(MAX_FILES);

  if (error || !summaries?.length) return "";

  const parts: string[] = [];
  let total = 0;
  const MAX = MAX_CONTEXT_CHARS;
  for (const f of summaries) {
    if (total >= MAX) break;
    if (!f.file_path) continue;
    const { data: blob } = await admin.storage.from("summaries").download(f.file_path);
    if (!blob) continue;

    const isText =
      f.file_path.endsWith(".txt") ||
      f.file_path.endsWith(".md") ||
      f.file_path.endsWith(".json") ||
      f.file_path.endsWith(".csv") ||
      (blob.type || "").startsWith("text/");

    if (isText) {
      const text = (await blob.text()).slice(0, MAX_FILE_CHARS);
      parts.push(`### File: ${f.name}\n${text}`);
      total += text.length;
    } else if (f.file_path.toLowerCase().endsWith(".pdf") || f.mime_type === "application/pdf" || (blob.type || "") === "application/pdf") {
      try {
        const buf = new Uint8Array(await blob.arrayBuffer());
        const pdf = await getDocumentProxy(buf);
        const { text } = await extractText(pdf, { mergePages: true });
        const clean = (Array.isArray(text) ? text.join("\n") : text).slice(0, MAX_FILE_CHARS);
        parts.push(`### File: ${f.name}\n${clean}`);
        total += clean.length;
      } catch (err) {
        parts.push(`### File: ${f.name} (failed to parse PDF: ${String(err)})`);
      }
    }
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
    const noFiles = language === "ar"
      ? "لا توجد ملفات مرفوعة لهذه المادة بعد، لذلك لا يمكنني الإجابة."
      : "No reference files have been uploaded for this subject yet, so I can't answer.";
    const rateLimited = language === "ar"
      ? "الطلبات كثيرة الآن. حاول مرة أخرى بعد ثوانٍ قليلة."
      : "Too many requests right now. Please try again in a few seconds.";
    const creditsExhausted = language === "ar"
      ? "ميزة الذكاء غير متاحة حالياً لهذا المشروع."
      : "AI is temporarily unavailable for this project right now.";
    const temporaryFailure = language === "ar"
      ? "تعذر إكمال الطلب الآن. حاول مرة أخرى بعد قليل."
      : "I couldn't complete that right now. Please try again shortly.";

    if (!context) {
      return new Response(JSON.stringify({ reply: noFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are an expert ${label} tutor for high-school students.\n\nHow to answer:\n- PREFER the REFERENCE MATERIAL below whenever it covers the question. When you use it, you may cite the file name in parentheses, e.g. (source: filename.pdf).\n- If the reference material does not cover the question, or if the extracted text is incomplete/garbled (common with scanned PDFs), you MAY still answer using your own accurate ${label} knowledge — clearly and pedagogically.\n- Only refuse with "${refusal}" if the question is clearly OFF-TOPIC for ${label} (e.g. unrelated personal questions). Do NOT refuse just because the wording isn't in the reference.\n- Be concise, structured, and use examples where helpful.\n- Always respond in ${lang}.\n\n---REFERENCE MATERIAL (may be partial)---\n${context}\n---END REFERENCE---`;
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