import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { claimFeature } from "../_shared/entitlement.ts";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

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
const CANDIDATE_MODELS = [
  "google/gemini-2.5-flash",
  "openai/gpt-5-mini",
  "google/gemini-2.5-pro",
];
const JUDGE_MODEL = "google/gemini-2.5-pro";
const MAX_CONTEXT_CHARS = 60000;
const MAX_FILE_CHARS = 30000;
const MAX_FILES = 6;
const MAX_CHAT_MESSAGES = 8;
const MAX_PDF_BYTES = 15 * 1024 * 1024;
const CACHE_TTL_MS = 10 * 60 * 1000;
const GEMINI_FILE_CACHE_TTL_MS = 45 * 60 * 1000;
const GEMINI_GENERATE_MODEL = "gemini-2.5-flash";

type CacheEntry = { at: number; text: string };
type GeminiFileRef = { uri: string; mimeType: string; name: string; resourceName?: string };
type SubjectContext = { text: string; fileRefs: GeminiFileRef[] };
const fileCache = new Map<string, CacheEntry>();
const geminiFileCache = new Map<string, { at: number; ref: GeminiFileRef }>();

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function getObjectMeta(obj: unknown) {
  const metadata = (obj as { metadata?: Record<string, unknown>; updated_at?: string }).metadata ?? {};
  const size = Number(metadata.size ?? metadata.contentLength ?? 0);
  const mimeType = String(metadata.mimetype ?? metadata.mimeType ?? "application/pdf");
  const updatedAt = (obj as { updated_at?: string }).updated_at ?? "";
  return { size, mimeType, updatedAt };
}

async function waitForGeminiFile(apiKey: string, ref: GeminiFileRef): Promise<GeminiFileRef | null> {
  if (!ref.resourceName) return ref;
  for (let i = 0; i < 15; i++) {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/${ref.resourceName}?key=${encodeURIComponent(apiKey)}`);
    if (!res.ok) return ref;
    const data = await res.json();
    if (data.state === "ACTIVE" || data.file?.state === "ACTIVE") return ref;
    if (data.state === "FAILED" || data.file?.state === "FAILED") return null;
    await sleep(1000);
  }
  return ref;
}

async function uploadStoragePdfToGemini(admin: ReturnType<typeof createClient>, path: string, displayName: string, mimeType: string, size: number, cacheKey: string): Promise<GeminiFileRef | null> {
  const cached = geminiFileCache.get(cacheKey);
  if (cached && Date.now() - cached.at < GEMINI_FILE_CACHE_TTL_MS) return cached.ref;

  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) return null;

  const { data: signed, error } = await admin.storage.from("files").createSignedUrl(path, 10 * 60);
  if (error || !signed?.signedUrl) return null;

  const source = await fetch(signed.signedUrl);
  if (!source.ok || !source.body) return null;
  const contentLength = size > 0 ? size : Number(source.headers.get("content-length") ?? 0);
  if (!contentLength) return null;

  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files?key=${encodeURIComponent(apiKey)}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Upload-Protocol": "resumable",
      "X-Goog-Upload-Command": "start",
      "X-Goog-Upload-Header-Content-Length": String(contentLength),
      "X-Goog-Upload-Header-Content-Type": mimeType,
    },
    body: JSON.stringify({ file: { display_name: displayName } }),
  });
  const uploadUrl = start.headers.get("x-goog-upload-url");
  if (!start.ok || !uploadUrl) {
    console.warn("gemini_file_upload_start_failed", { status: start.status, hasUploadUrl: Boolean(uploadUrl), path });
    return null;
  }

  const uploaded = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      "Content-Length": String(contentLength),
      "Content-Type": mimeType,
      "X-Goog-Upload-Offset": "0",
      "X-Goog-Upload-Command": "upload, finalize",
    },
    body: source.body,
  });
  if (!uploaded.ok) {
    console.warn("gemini_file_upload_failed", { status: uploaded.status, path });
    return null;
  }
  const data = await uploaded.json();
  const file = data.file ?? data;
  if (!file?.uri) {
    console.warn("gemini_file_upload_missing_uri", { path });
    return null;
  }
  const ref = await waitForGeminiFile(apiKey, {
    uri: file.uri,
    mimeType: file.mimeType ?? mimeType,
    name: displayName,
    resourceName: file.name,
  });
  if (!ref) return null;
  geminiFileCache.set(cacheKey, { at: Date.now(), ref });
  return ref;
}

async function extractFromBlob(name: string, blob: Blob): Promise<string> {
  const lower = name.toLowerCase();
  if (lower.endsWith(".pdf") || blob.type === "application/pdf") {
    if (blob.size > MAX_PDF_BYTES) return "";
    const buf = new Uint8Array(await blob.arrayBuffer());
    const pdf = await getDocumentProxy(buf);
    const pageCount = pdf.numPages ?? 0;
    const chunks: string[] = [];
    let collected = 0;
    for (let i = 1; i <= pageCount && collected < MAX_FILE_CHARS; i++) {
      try {
        const { text: t } = await extractText(pdf, { mergePages: true, pages: [i] });
        const pageText = Array.isArray(t) ? t.join("\n") : t;
        chunks.push(pageText);
        collected += pageText.length;
      } catch { /* skip page */ }
    }
    return chunks.join("\n").slice(0, MAX_FILE_CHARS);
  }
  try {
    return (await blob.text()).slice(0, MAX_FILE_CHARS);
  } catch {
    return "";
  }
}

async function fetchSubjectContext(subject: string, chapter?: string): Promise<SubjectContext> {
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);

    // Read files directly from the Cloud storage bucket `files/{subject}/{chapter}/`.
  const ch = chapter && chapter.length ? chapter : "general";
  const folder = ch === "general" ? subject : `${subject}/${ch}`;

  const { data: objects, error: listErr } = await admin.storage.from("files").list(folder, { limit: 100 });
  if (listErr || !objects?.length) return { text: "", fileRefs: [] };

  const files = objects
    .filter((o) => o.name && !o.name.startsWith(".") && o.name !== ".lovkeep")
    .slice(0, MAX_FILES);

  const parts: string[] = [];
  const fileRefs: GeminiFileRef[] = [];
  let total = 0;
  for (const obj of files) {
    if (total >= MAX_CONTEXT_CHARS) break;
    const path = `${folder}/${obj.name}`;
    const { size, mimeType, updatedAt } = getObjectMeta(obj);
    const cacheKey = `${path}:${updatedAt}`;
    if ((obj.name.toLowerCase().endsWith(".pdf") || mimeType === "application/pdf") && size > MAX_PDF_BYTES) {
      const ref = await uploadStoragePdfToGemini(admin, path, obj.name, mimeType, size, cacheKey);
      if (ref) fileRefs.push(ref);
      continue;
    }
    let text = "";
    const cached = fileCache.get(cacheKey);
    if (cached && Date.now() - cached.at < CACHE_TTL_MS) {
      text = cached.text;
    } else {
      const { data: blob, error: dErr } = await admin.storage.from("files").download(path);
      if (dErr || !blob) continue;
      try {
        text = await extractFromBlob(obj.name, blob);
      } catch { text = ""; }
      fileCache.set(cacheKey, { at: Date.now(), text });
    }
    if (!text) continue;
    const slice = text.slice(0, MAX_FILE_CHARS);
    parts.push(`### File: ${obj.name} (chapter: ${ch})\n${slice}`);
    total += slice.length;
  }
  return { text: parts.join("\n\n"), fileRefs };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { subject, chapter, messages, language } = await req.json();
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
    const context = await fetchSubjectContext(subject, chapter);
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
      ? "لا توجد ملفات مرفوعة أو قابلة للقراءة لهذا الفصل بعد. اطلب من المسؤول رفع ملفات في هذا الفصل."
      : "No uploaded readable files for this chapter yet. Ask an admin to upload files for this chapter.";
    if (!context.text && context.fileRefs.length === 0) {
      return new Response(JSON.stringify({ reply: noFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const fileNames = context.fileRefs.map((f) => f.name).join(", ");
    const system = `You are a strict ${label} tutor for high-school students. Your ONLY source of truth is the REFERENCE MATERIAL below and any attached uploaded Cloud storage files for the selected chapter.\n\nHow to answer:\n- Answer EXACTLY as the reference material says. Quote or closely paraphrase it. Cite the file name in parentheses, e.g. (source: filename.pdf).\n- If the answer is not in the reference material or attached files, reply with exactly: "${refusal}". Do NOT use outside knowledge.\n- Keep the wording faithful to the PDF; do not invent facts, numbers, names, or definitions.\n\nSTYLE:\n- Always respond in ${lang}.\n- Short paragraphs or bullet points. Define technical terms only when the reference defines them.\n\nAttached chapter files: ${fileNames || "none"}\n\n---REFERENCE MATERIAL (from uploaded chapter files)---\n${context.text || "See attached uploaded chapter files."}\n---END REFERENCE---`;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const safeMessages = messages
      .filter((msg) => msg && (msg.role === "user" || msg.role === "assistant") && typeof msg.content === "string")
      .slice(-MAX_CHAT_MESSAGES);

    const geminiDirect = async () => {
      if (context.fileRefs.length === 0) return null;
      const apiKey = Deno.env.get("GEMINI_API_KEY");
      if (!apiKey) return null;
      const conversation = safeMessages.map((msg) => `${msg.role === "assistant" ? "Tutor" : "Student"}: ${msg.content}`).join("\n\n");
      const contents = [{
        role: "user",
        parts: [
          { text: `${system}\n\nConversation:\n${conversation}` },
          ...context.fileRefs.map((f) => ({ fileData: { mimeType: f.mimeType, fileUri: f.uri } })),
        ],
      }];
      const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_GENERATE_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contents }),
      });
      if (!r.ok) {
        console.warn("gemini_direct_generate_failed", { status: r.status, body: (await r.text()).slice(0, 500) });
        return null;
      }
      const data = await r.json();
      const text = data.candidates?.[0]?.content?.parts?.map((p: { text?: string }) => p.text ?? "").join("").trim();
      return text || null;
    };

    if (context.fileRefs.length > 0) {
      const directReply = await geminiDirect();
      if (directReply) {
        return new Response(JSON.stringify({ reply: directReply, sources: context.fileRefs.map((f) => f.name) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
    }

    const callModel = async (model: string) => {
      const r = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model,
          messages: [{ role: "system", content: system }, ...safeMessages],
        }),
      });
      return { model, status: r.status, body: r.ok ? await r.json() : await r.text() };
    };

    const candidateResults = await Promise.all(CANDIDATE_MODELS.map((m) => callModel(m).catch((e) => ({ model: m, status: 0, body: String(e) }))));

    const tooMany = candidateResults.find((c) => c.status === 429);
    const noCredits = candidateResults.find((c) => c.status === 402);
    const candidates = candidateResults
      .filter((c) => c.status === 200 && typeof c.body === "object")
      .map((c) => ({ model: c.model, text: (c.body as { choices?: Array<{ message?: { content?: string } }> }).choices?.[0]?.message?.content ?? "" }))
      .filter((c) => c.text.trim().length > 0);

    if (candidates.length === 0) {
      if (noCredits) {
        return new Response(JSON.stringify({ reply: creditsExhausted, temporary: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      if (tooMany) {
        return new Response(JSON.stringify({ reply: rateLimited, temporary: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ reply: temporaryFailure, temporary: true }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // If only one candidate succeeded, just return it.
    if (candidates.length === 1) {
      return new Response(JSON.stringify({ reply: candidates[0].text, sources: candidates.map((c) => c.model) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Judge step: compare candidate answers, pick the one that best matches the reference, or merge them.
    const lastUser = [...safeMessages].reverse().find((m) => m.role === "user")?.content ?? "";
    const judgeSystem = `You are an answer-quality judge for a ${label} tutor. You receive a student question, the strict REFERENCE MATERIAL, and ${candidates.length} candidate answers from different AI models. Your job:\n1. Compare every candidate against the reference material ONLY.\n2. Pick the candidate that is the most faithful to the reference (correct facts, proper citations, no outside knowledge). You may merge complementary correct parts from multiple candidates, but never add anything not in the reference.\n3. If none of them are correct or the reference does not cover it, reply with exactly: "${refusal}".\n4. Respond in ${lang} only. Do NOT mention the candidates, the comparison process, or model names. Output ONLY the final best answer for the student.`;
    const candidateBlock = candidates
      .map((c, i) => `--- CANDIDATE ${i + 1} ---\n${c.text}`)
      .join("\n\n");
    const judgeUser = `STUDENT QUESTION:\n${lastUser}\n\nREFERENCE MATERIAL:\n${context.text}\n\n${candidateBlock}`;

    const judgeResp = await fetch(AI_URL, {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: JUDGE_MODEL,
        messages: [
          { role: "system", content: judgeSystem },
          { role: "user", content: judgeUser },
        ],
      }),
    });
    if (!judgeResp.ok) {
      // Fall back to the longest candidate answer.
      const best = candidates.slice().sort((a, b) => b.text.length - a.text.length)[0];
      return new Response(JSON.stringify({ reply: best.text, sources: candidates.map((c) => c.model) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const judgeData = await judgeResp.json();
    const finalReply = judgeData.choices?.[0]?.message?.content ?? candidates[0].text;
    return new Response(JSON.stringify({ reply: finalReply, sources: candidates.map((c) => c.model) }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});