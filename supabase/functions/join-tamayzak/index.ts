import { protect } from "../_shared/guard.ts";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { createClient } from "npm:@supabase/supabase-js@2";

const OWNER_CHAT: string | number = Deno.env.get("OWNER_TELEGRAM_CHAT_ID") || -1004306969532;

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
    const cv = String(body.cv ?? body.teacher_name ?? "").trim().slice(0, 4000);
    if (!fullName || !telegram || !cv) return json({ error: "missing_fields" }, 400);

    // Always persist the request first so a Telegram failure never loses a signup.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );
    const { data: saved } = await admin
      .from("join_requests")
      .insert({ full_name: fullName, telegram_username: telegram, teacher_name: cv })
      .select("id")
      .maybeSingle();

    const lovableKey = Deno.env.get("LOVABLE_API_KEY");
    const tgKey = Deno.env.get("TELEGRAM_API_KEY");
    if (!lovableKey || !tgKey) return json({ ok: true, notified: false });

    const handle = telegram.startsWith("@") ? telegram : `@${telegram}`;
    const text = `🌟 طلب انضمام إلى تميزك\n\n👤 الاسم الكامل: ${fullName}\n💬 تيليجرام: ${handle}\n\n📄 السيرة الذاتية:\n${cv}`;

    let notified = false;
    let notifyError: string | null = null;
    try {
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
      notified = res.ok && !!data?.ok;
      if (!notified) {
        notifyError = `${res.status} ${JSON.stringify(data)}`.slice(0, 500);
        console.error("join-tamayzak telegram failed", notifyError);
      }
    } catch (e) {
      notifyError = (e instanceof Error ? e.message : String(e)).slice(0, 500);
      console.error("join-tamayzak telegram error", notifyError);
    }

    if (saved?.id) {
      await admin.from("join_requests").update({ notified, notify_error: notifyError }).eq("id", saved.id);
    }

    // The request is stored either way — report success to the student.
    return json({ ok: true, notified });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
