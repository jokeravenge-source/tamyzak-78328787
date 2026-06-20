import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const MAX_TEXT_CHARS = 200_000; // per file
const MAX_PDF_BYTES = 15 * 1024 * 1024;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Verify caller is admin
    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(url, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: userData } = await userClient.auth.getUser();
    if (!userData?.user) {
      return new Response(JSON.stringify({ error: "unauthorized" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const admin = createClient(url, serviceKey);
    const { data: isAdmin } = await admin.rpc("has_role", { _user_id: userData.user.id, _role: "admin" });
    if (!isAdmin) {
      return new Response(JSON.stringify({ error: "forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const { subject, chapter, file_name, all, text: directText } = await req.json();
    if (!subject || !chapter) {
      return new Response(JSON.stringify({ error: "subject and chapter required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const folder = chapter === "general" ? subject : `${subject}/${chapter}`;

    // Direct-text mode: client extracted the text (handles huge PDFs without storage limits).
    if (directText && file_name) {
      const text = String(directText).slice(0, MAX_TEXT_CHARS);
      const { error: upErr } = await admin
        .from("subject_file_text")
        .upsert({ subject, chapter, file_name, text, char_count: text.length }, { onConflict: "subject,chapter,file_name" });
      if (upErr) {
        return new Response(JSON.stringify({ results: [{ file_name, ok: false, error: upErr.message }] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ results: [{ file_name, ok: true, chars: text.length }] }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    // Resolve list of files to index
    let files: string[] = [];
    if (all) {
      const { data: objects } = await admin.storage.from("files").list(folder, { limit: 100 });
      files = (objects ?? [])
        .filter((o) => o.name && !o.name.startsWith(".") && o.name !== ".lovkeep")
        .map((o) => o.name);
    } else if (file_name) {
      files = [file_name];
    } else {
      return new Response(JSON.stringify({ error: "file_name or all required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const results: Array<{ file_name: string; ok: boolean; chars?: number; error?: string }> = [];

    for (const name of files) {
      try {
        const path = `${folder}/${name}`;
        const { data: blob, error } = await admin.storage.from("files").download(path);
        if (error || !blob) {
          results.push({ file_name: name, ok: false, error: error?.message ?? "download failed" });
          continue;
        }
        const lower = name.toLowerCase();
        let text = "";
        if (lower.endsWith(".pdf") || blob.type === "application/pdf") {
          if (blob.size > MAX_PDF_BYTES) {
            results.push({ file_name: name, ok: false, error: "PDF exceeds 15MB" });
            continue;
          }
          const buf = new Uint8Array(await blob.arrayBuffer());
          const pdf = await getDocumentProxy(buf);
          const pageCount = pdf.numPages ?? 0;
          const chunks: string[] = [];
          let collected = 0;
          for (let i = 1; i <= pageCount && collected < MAX_TEXT_CHARS; i++) {
            try {
              const { text: t } = await extractText(pdf, { mergePages: true, pages: [i] });
              const pageText = Array.isArray(t) ? t.join("\n") : t;
              chunks.push(pageText);
              collected += pageText.length;
            } catch { /* skip page */ }
          }
          text = chunks.join("\n").slice(0, MAX_TEXT_CHARS);
        } else {
          try {
            text = (await blob.text()).slice(0, MAX_TEXT_CHARS);
          } catch {
            results.push({ file_name: name, ok: false, error: "binary not supported" });
            continue;
          }
        }

        const { error: upErr } = await admin
          .from("subject_file_text")
          .upsert({ subject, chapter, file_name: name, text, char_count: text.length }, { onConflict: "subject,chapter,file_name" });
        if (upErr) {
          results.push({ file_name: name, ok: false, error: upErr.message });
        } else {
          results.push({ file_name: name, ok: true, chars: text.length });
        }
      } catch (e) {
        results.push({ file_name: name, ok: false, error: String(e) });
      }
    }

    return new Response(JSON.stringify({ results }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});