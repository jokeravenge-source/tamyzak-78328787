import { protect } from "../_shared/guard.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

const OWNER_CHAT = Deno.env.get("OWNER_TELEGRAM_CHAT_ID") || "@ias404";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  const guard = await protect(req, "join-tamayzak", { max: 5, windowSeconds: 300 });
  if (!guard.ok) return json({ error: guard.error }, guard.status);

  try {
    const body = await req.json().catch(() => ({}));
    const fullName = String(body.full_name ?? "").trim().slice(0, 120);
    const telegram = String(body.telegram_username ?? "").trim().slice(0, 60);
    const teacher = String(body.teacher_name ?? "").trim().slice(0, 120);
    if (!fullName || !telegram || !teacher) return json({ error: "missing_fields" }, 400);

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const tgKey = Deno.env.get("TELEGRAM_API_KEY");
    if (!lovableKey || !tgKey) return json({ error: "telegram_not_configured" }, 500);

    const handle = telegram.startsWith("@") ? telegram : `@${telegram}`;
    const text = `🌟 طلب انضمام إلى تميزك\n\n👤 الاسم الكامل: ${fullName}\n💬 تيليجرام: ${handle}\n👨‍🏫 اسم المدرس: ${teacher}`;

    const res = await fetch("https://connector-gateway.lovable.dev/telegram/sendMessage", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${lovableKey}`,
        "X-Connection-Api-Key": tgKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ chat_id: OWNER_CHAT, text, disable_web_page_preview: true }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data?.ok) {
      console.error("join-tamayzak telegram failed", res.status, JSON.stringify(data));
      return json({ error: "telegram_failed", status: res.status, details: data }, 502);
    }
    return json({ ok: true });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
