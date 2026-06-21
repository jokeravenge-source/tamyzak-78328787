import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

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

    const body = await req.json().catch(() => ({}));
    const language: "en" | "ar" = body.language === "ar" ? "ar" : "en";

    const { data: tg } = await admin
      .from("telegram_verifications")
      .select("telegram_user_id, verified")
      .eq("user_id", u.user.id)
      .maybeSingle();
    const chatId = (tg as { telegram_user_id: number | null } | null)?.telegram_user_id;
    if (!tg || !(tg as { verified: boolean }).verified || !chatId) {
      return json({ error: "telegram_not_linked" }, 400);
    }

    const { data: todoRow } = await admin
      .from("student_todos")
      .select("items")
      .eq("user_id", u.user.id)
      .maybeSingle();
    const items: Todo[] = Array.isArray((todoRow as { items: unknown } | null)?.items)
      ? ((todoRow as { items: Todo[] }).items)
      : [];

    const now = new Date();
    const todayEn = DAY_EN[now.getDay()];
    const todayAr = DAY_AR[now.getDay()];

    const todayItems = items.filter((it) => isToday(it.day, todayEn, todayAr));
    const pending = todayItems.filter((it) => !it.done);
    const done = todayItems.length - pending.length;

    const header = language === "ar"
      ? `<b>📝 مهامك لليوم (${esc(todayAr)})</b>`
      : `<b>📝 Your To-Do for today (${esc(todayEn)})</b>`;

    let bodyText: string;
    if (todayItems.length === 0) {
      bodyText = language === "ar"
        ? "لا توجد مهام محددة لهذا اليوم. أضف بعض المهام في تطبيق تميزك!"
        : "No tasks set for today. Add some in your Tamyzak To-Do list!";
    } else if (pending.length === 0) {
      bodyText = language === "ar"
        ? `🎉 لقد أنهيت كل مهام اليوم (${done}/${todayItems.length}). أحسنت!`
        : `🎉 You finished every task for today (${done}/${todayItems.length}). Great work!`;
    } else {
      const lines = pending.slice(0, 20).map((it, i) => `${i + 1}. ${esc(it.text)}`).join("\n");
      const summary = language === "ar"
        ? `المتبقي: <b>${pending.length}</b> من ${todayItems.length}`
        : `Remaining: <b>${pending.length}</b> of ${todayItems.length}`;
      bodyText = `${summary}\n\n${lines}`;
    }

    const msg = `${header}\n\n${bodyText}`;
    const res = await tgSend(chatId, msg);
    if (!res.ok) return json({ error: "telegram_send_failed", detail: res.data }, 502);

    return json({ ok: true, today: todayItems.length, pending: pending.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});