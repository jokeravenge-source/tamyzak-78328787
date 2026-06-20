import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const OCR_MODEL = "google/gemini-2.5-flash";
const MAX_IMAGES_PER_CALL = 6;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const url = Deno.env.get("SUPABASE_URL")!;
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

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

    const { images, language } = await req.json();
    if (!Array.isArray(images) || images.length === 0) {
      return new Response(JSON.stringify({ error: "images array required" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }

    const lang = language === "ar" ? "Arabic" : "the original language of the document";
    const systemPrompt = `You are an OCR engine. Extract ALL readable text from the provided page images, verbatim. Preserve the original wording in ${lang}. Output ONLY the extracted text. No commentary, no markdown, no page numbers.`;

    // Process in batches of MAX_IMAGES_PER_CALL to stay within model limits
    const batches: string[][] = [];
    for (let i = 0; i < images.length; i += MAX_IMAGES_PER_CALL) {
      batches.push(images.slice(i, i + MAX_IMAGES_PER_CALL));
    }

    const allText: string[] = [];
    for (const batch of batches) {
      const content: Array<Record<string, unknown>> = [
        { type: "text", text: "Extract all text from these pages, in reading order." },
        ...batch.map((img) => ({ type: "image_url", image_url: { url: img } })),
      ];
      const resp = await fetch(AI_URL, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          model: OCR_MODEL,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content },
          ],
        }),
      });
      if (!resp.ok) {
        const t = await resp.text();
        return new Response(JSON.stringify({ error: `OCR failed (${resp.status}): ${t.slice(0, 300)}` }), { status: resp.status === 429 || resp.status === 402 ? resp.status : 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
      }
      const data = await resp.json();
      const piece = data.choices?.[0]?.message?.content ?? "";
      if (piece) allText.push(piece);
    }

    const text = allText.join("\n\n").trim();
    return new Response(JSON.stringify({ text, chars: text.length }), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (e) {
    return new Response(JSON.stringify({ error: String(e) }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});