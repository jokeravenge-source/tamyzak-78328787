import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

async function tgSend(chatId: number, text: string, link: string | null) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  if (link) body.reply_markup = { inline_keyboard: [[{ text: "Open", url: link }]] };
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  return res.ok && (data as { ok?: boolean })?.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const adminToken = Deno.env.get("SETUP_ADMINS_TOKEN");
    if (!adminToken || req.headers.get("X-Admin-Token") !== adminToken) {
      return json({ error: "forbidden" }, 403);
    }
    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: n, error: nErr } = await admin
      .from("notifications")
      .select("title, body, link")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (nErr || !n) return json({ error: nErr?.message ?? "no_notification" }, 404);

    const { data: rows, error: rErr } = await admin
      .from("telegram_verifications")
      .select("telegram_user_id")
      .eq("verified", true)
      .not("telegram_user_id", "is", null);
    if (rErr) return json({ error: rErr.message }, 500);

    const msg = [n.title ? `<b>${esc(n.title)}</b>` : "", n.body ? esc(n.body) : ""].filter(Boolean).join("\n\n");
    let sent = 0, failed = 0;
    const seen = new Set<number>();
    for (const r of rows ?? []) {
      const id = (r as { telegram_user_id: number | null }).telegram_user_id;
      if (!id || seen.has(id)) continue;
      seen.add(id);
      const ok = await tgSend(id, msg, n.link ?? null);
      if (ok) sent++; else failed++;
      await new Promise((r) => setTimeout(r, 40));
    }
    return json({ sent, failed, total: seen.size });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});