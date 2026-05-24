import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUBJECT_FOLDERS: Record<string, string> = {
  biology: "biology",
  physics: "physics",
  chemistry: "chemistry",
  arabic: "arabic",
  french: "french",
  english: "english",
};

const SUBJECT_LABELS: Record<string, string> = {
  biology: "Biology",
  physics: "Physics",
  chemistry: "Chemistry",
  arabic: "Arabic",
  french: "French",
  english: "English",
};

async function fetchSubjectContext(subject: string): Promise<string> {
  const folder = SUBJECT_FOLDERS[subject];
  if (!folder) return "";
  const url = Deno.env.get("SUPABASE_URL")!;
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const admin = createClient(url, key);
  const { data: files, error } = await admin.storage.from("files").list(folder, {
    limit: 20,
    sortBy: { column: "name", order: "asc" },
  });
  if (error || !files?.length) return "";
  const parts: string[] = [];
  let total = 0;
  const MAX = 60000;
  for (const f of files) {
    if (total >= MAX) break;
    if (!f.name || f.name.startsWith(".")) continue;
    const path = `${folder}/${f.name}`;
    const { data: blob } = await admin.storage.from("files").download(path);
    if (!blob) continue;
    const isText =
      f.name.endsWith(".txt") ||
      f.name.endsWith(".md") ||
      f.name.endsWith(".json") ||
      f.name.endsWith(".csv") ||
      (blob.type || "").startsWith("text/");
    if (isText) {
      const text = (await blob.text()).slice(0, 20000);
      parts.push(`### File: ${f.name}\n${text}`);
      total += text.length;
    } else if (f.name.toLowerCase().endsWith(".pdf") || (blob.type || "") === "application/pdf") {
      try {
        const buf = new Uint8Array(await blob.arrayBuffer());
        const pdf = await getDocumentProxy(buf);
        const { text } = await extractText(pdf, { mergePages: true });
        const clean = (Array.isArray(text) ? text.join("\n") : text).slice(0, 20000);
        parts.push(`### File: ${f.name}\n${clean}`);
        total += clean.length;
      } catch (err) {
        parts.push(`### File: ${f.name} (failed to parse PDF: ${String(err)})`);
      }
    } else {
      parts.push(`### File: ${f.name} (binary, ${blob.type || "unknown"}, ${f.metadata?.size ?? "?"} bytes)`);
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
    const label = SUBJECT_LABELS[subject] ?? subject;
    const context = await fetchSubjectContext(subject);
    const lang = language === "ar" ? "Arabic" : "English";
    const refusal = language === "ar"
      ? "هذا السؤال غير مذكور في الملفات المرفوعة، لذلك لا أستطيع الإجابة عنه."
      : "This question is not covered in the uploaded files, so I can't answer it.";
    const noFiles = language === "ar"
      ? "لا توجد ملفات مرفوعة لهذه المادة بعد، لذلك لا يمكنني الإجابة."
      : "No reference files have been uploaded for this subject yet, so I can't answer.";

    if (!context) {
      return new Response(JSON.stringify({ reply: noFiles }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const system = `You are a strict ${label} tutor. You MUST answer ONLY using the REFERENCE MATERIAL provided below. \n\nStrict rules:\n- Do NOT use any outside knowledge, training data, or general ${label} facts that are not present in the reference.\n- If the answer is not clearly supported by the reference material, reply EXACTLY with: "${refusal}" — do not guess, do not partially answer, do not add disclaimers.\n- Quote or paraphrase only what the reference says. Cite the file name in parentheses when helpful, e.g. (source: filename.pdf).\n- Always respond in ${lang}.\n\n---REFERENCE MATERIAL---\n${context}\n---END REFERENCE---`;
    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");
    const resp = await fetch("https://generativelanguage.googleapis.com/v1beta/openai/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "gemini-2.5-flash",
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });
    if (!resp.ok) {
      const t = await resp.text();
      return new Response(JSON.stringify({ error: t }), {
        status: resp.status,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const data = await resp.json();
    const reply = data.choices?.[0]?.message?.content ?? "";
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