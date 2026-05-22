import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
    const system = `You are an expert ${label} tutor for high-school students. Answer clearly and concisely in ${lang}. Use the reference material below when relevant; if a question is outside the material, answer from general ${label} knowledge.\n\n---REFERENCE MATERIAL---\n${context || "(no reference files available)"}\n---END REFERENCE---`;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");
    const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
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