import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { requireAdmin } from "../_shared/auth.ts";

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

type Todo = { id: string; text: string; done: boolean; day?: string };

const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
const DAY_AR_ALT: Record<string, string> = { "الاثنين": "الإثنين" };

function esc(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
function isToday(day: string | undefined, todayEn: string, todayAr: string): boolean {
  if (!day) return false;
  const d = (DAY_AR_ALT[day.trim()] ?? day.trim()).toLowerCase();
  return d === todayEn.toLowerCase() || d === todayAr.toLowerCase();
}

async function tgSend(chatId: number, text: string) {
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) throw new Error("telegram_not_configured");
  const res = await fetch(`${GATEWAY_URL}/sendMessage`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${LOVABLE_API_KEY}`,
      "X-Connection-Api-Key": TELEGRAM_API_KEY,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true }),
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok && (data as { ok?: boolean })?.ok, status: res.status, data };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // Cron-only / admin-only: reject anonymous callers.
    const cronSecret = Deno.env.get("CRON_SECRET") ?? "";
    const provided = req.headers.get("x-cron-secret") ?? "";
    if (!(cronSecret && provided === cronSecret)) {
      const auth = await requireAdmin(req);
      if (!auth.ok) return json({ error: auth.error }, auth.status);
    }

    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const admin = createClient(SUPABASE_URL, SERVICE_KEY);

    // Today in Baghdad time (UTC+3) for the audience.
    const nowUtc = new Date();
    const baghdad = new Date(nowUtc.getTime() + 3 * 60 * 60 * 1000);
    const dayIdx = baghdad.getUTCDay();
    const todayEn = DAY_EN[dayIdx];
    const todayAr = DAY_AR[dayIdx];
    const dateKey = baghdad.toISOString().slice(0, 10);

    const { data: verified, error: vErr } = await admin
      .from("telegram_verifications")
      .select("user_id, telegram_user_id")
      .eq("verified", true)
      .not("telegram_user_id", "is", null);
    if (vErr) return json({ error: vErr.message }, 500);

    let sent = 0, skipped = 0, failed = 0, empty = 0;
    for (const row of verified ?? []) {
      const r = row as { user_id: string; telegram_user_id: number | null };
      if (!r.telegram_user_id) continue;

      // Idempotency per user per day
      const notificationKey = `todo-daily:${r.user_id}:${dateKey}`;
      const { error: dupErr } = await admin
        .from("telegram_notifications_sent")
        .insert({ notification_key: notificationKey, telegram_user_id: r.telegram_user_id });
      if (dupErr) { skipped++; continue; }

      const { data: todoRow } = await admin
        .from("student_todos")
        .select("items")
        .eq("user_id", r.user_id)
        .maybeSingle();
      const items: Todo[] = Array.isArray((todoRow as { items: unknown } | null)?.items)
        ? ((todoRow as { items: Todo[] }).items)
        : [];
      const todayItems = items.filter((it) => isToday(it.day, todayEn, todayAr));
      const pending = todayItems.filter((it) => !it.done);

      if (todayItems.length === 0) { empty++; continue; }

      const header = `<b>🌅 صباح الخير — مهامك لليوم (${esc(todayAr)})</b>`;
      let bodyText: string;
      if (pending.length === 0) {
        bodyText = `🎉 أنجزت كل مهام اليوم (${todayItems.length}/${todayItems.length})! استمر هكذا.`;
      } else {
        const lines = pending.slice(0, 20).map((it, i) => `${i + 1}. ${esc(it.text)}`).join("\n");
        bodyText = `المتبقي: <b>${pending.length}</b> من ${todayItems.length}\n\n${lines}`;
      }
      const msg = `${header}\n\n${bodyText}`;
      const res = await tgSend(r.telegram_user_id, msg);
      if (res.ok) sent++; else failed++;
      await new Promise((res) => setTimeout(res, 40));
    }

    return json({ sent, failed, skipped, empty, total: verified?.length ?? 0, date: dateKey });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});