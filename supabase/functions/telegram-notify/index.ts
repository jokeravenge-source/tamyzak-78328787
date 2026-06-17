import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

async function tgSend(chatId: number, text: string, link?: string | null) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY")!;
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  if (link) {
    body.reply_markup = { inline_keyboard: [[{ text: "Open", url: link }]] };
  }
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
  return { ok: res.ok && data?.ok, data, status: res.status };
}

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const authHeader = req.headers.get("Authorization") ?? "";
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: u, error: uErr } = await userClient.auth.getUser();
    if (uErr || !u?.user) return json({ error: "unauthorized" }, 401);

    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    const { data: roleRow } = await admin
      .from("user_roles").select("role").eq("user_id", u.user.id).eq("role", "admin").maybeSingle();
    if (!roleRow) return json({ error: "forbidden" }, 403);

    const body = await req.json().catch(() => ({}));
    const title = String(body.title ?? "").slice(0, 200).trim();
    const text = String(body.body ?? "").slice(0, 3500).trim();
    const link = body.link ? String(body.link).slice(0, 500) : null;
    const audience: "all" | "user" = body.audience === "user" ? "user" : "all";
    const targetUserId = body.target_user_id ? String(body.target_user_id) : null;
    if (!title && !text) return json({ error: "empty_message" }, 400);

    let query = admin
      .from("telegram_verifications")
      .select("telegram_user_id, user_id")
      .eq("verified", true)
      .not("telegram_user_id", "is", null);
    if (audience === "user" && targetUserId) query = query.eq("user_id", targetUserId);

    const { data: rows, error: rErr } = await query;
    if (rErr) return json({ error: rErr.message }, 500);

    const msg = [title ? `<b>${esc(title)}</b>` : "", text ? esc(text) : ""].filter(Boolean).join("\n\n");

    let sent = 0, failed = 0;
    for (const r of rows ?? []) {
      const id = (r as { telegram_user_id: number | null }).telegram_user_id;
      if (!id) continue;
      const res = await tgSend(id, msg, link);
      if (res.ok) sent++; else failed++;
      await new Promise((r) => setTimeout(r, 40));
    }

    return json({ sent, failed, total: rows?.length ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});