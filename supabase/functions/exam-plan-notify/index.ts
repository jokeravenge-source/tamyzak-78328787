import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { requireAdmin } from "../_shared/auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY_URL = "https://connector-gateway.lovable.dev/telegram";

const SUBJECT_AR: Record<string, string> = {
  math: "الرياضيات", physics: "الفيزياء", chemistry: "الكيمياء",
  biology: "الأحياء", english: "الإنجليزية", arabic: "العربية",
};

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

const CYCLE_DAYS = 5;
// 1 -> [0]; 2 -> [0,4]; 3 -> [0,2,4]; 4 -> [0,1,3,4]; 5 -> [0..4]; >5 -> consecutive days
function examOffsets(count: number, cycle: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count > cycle) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (cycle - 1)) / (count - 1)));
}

function daysBetween(fromIso: string, toIso: string): number {
  const a = Date.parse(`${fromIso}T00:00:00Z`);
  const b = Date.parse(`${toIso}T00:00:00Z`);
  return Math.round((b - a) / 86_400_000);
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
  const raw = await res.text();
  let data: { ok?: boolean } = {};
  try { data = JSON.parse(raw); } catch { /* non-JSON error page */ }
  if (!res.ok || !data.ok) {
    console.error(`telegram sendMessage failed [${res.status}]: ${raw.slice(0, 500)}`);
    return false;
  }
  return true;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
    // Server-side authorization: only an admin user, or an internal scheduler
    // calling with the service-role key, may trigger this broadcast.
    const bearer = (req.headers.get("Authorization") ?? "").replace("Bearer ", "").trim();
    const cronToken = (req.headers.get("x-cron-token") ?? "").trim();
    const expectedCron = Deno.env.get("CRON_INTERNAL_TOKEN") ?? "";
    const isInternal =
      (bearer.length > 0 && bearer === Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")) ||
      (expectedCron.length > 0 && cronToken === expectedCron);
    if (!isInternal) {
      const adminAuth = await requireAdmin(req);
      if (!adminAuth.ok) return json({ error: adminAuth.error }, adminAuth.status);
    }

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const baghdad = new Date(Date.now() + 3 * 60 * 60 * 1000);
    const todayKey = baghdad.toISOString().slice(0, 10);
    const minutesNow = baghdad.getUTCHours() * 60 + baghdad.getUTCMinutes();

    // Exams start at 21:00 Baghdad time.
    const EXAM_MIN = 21 * 60;
    const PHASES: { key: string; at: number; window: number }[] = [
      { key: "morning", at: 7 * 60, window: 60 },      // start of the exam day
      { key: "h1", at: EXAM_MIN - 60, window: 20 },    // 1 hour before
      { key: "m15", at: EXAM_MIN - 15, window: 10 },   // 15 minutes before
    ];
    const phase = PHASES.find((p) => minutesNow >= p.at && minutesNow < p.at + p.window);
    if (!phase) return json({ skippedRun: true, reason: "outside notification windows", minutesNow, date: todayKey });

    const { data: plans, error } = await admin
      .from("course_exam_plans")
      .select("user_id, subjects, start_date, interval_days");
    if (error) return json({ error: error.message }, 500);

    let sent = 0, skipped = 0, failed = 0, nodue = 0;

    for (const p of (plans ?? []) as { user_id: string; subjects: string[]; start_date: string; interval_days: number }[]) {
      const subjects = p.subjects ?? [];
      if (subjects.length === 0) { nodue++; continue; }
      // Plans run for a single cycle (same rule the UI uses to expire them).
      const cycle = Math.max(p.interval_days || CYCLE_DAYS, subjects.length);
      const elapsed = daysBetween(p.start_date, todayKey);
      if (elapsed < 0 || elapsed >= cycle) { nodue++; continue; }
      const offsets = examOffsets(subjects.length, cycle);
      const step = offsets.indexOf(elapsed);
      if (step < 0) { nodue++; continue; }

      const { data: tg } = await admin
        .from("telegram_verifications")
        .select("telegram_user_id, verified")
        .eq("user_id", p.user_id)
        .maybeSingle();
      const chatId = (tg as { telegram_user_id: number | null } | null)?.telegram_user_id;
      if (!tg || !(tg as { verified: boolean }).verified || !chatId) { skipped++; continue; }

      const key = `exam-plan:${p.user_id}:${todayKey}:${phase.key}`;
      const { error: dupErr } = await admin
        .from("telegram_notifications_sent")
        .insert({ notification_key: key, telegram_user_id: chatId });
      if (dupErr) { skipped++; continue; }

      const subject = subjects[step];
      const name = SUBJECT_AR[subject] ?? subject;
      const total = subjects.length;
      const msg =
        phase.key === "morning"
          ? `<b>📚 اليوم امتحانك</b>\n\nامتحان <b>${esc(name)}</b> اليوم الساعة <b>9:00 مساءً</b> بتوقيت بغداد (المرحلة ${step + 1} من ${total}).\n\nجهّز نفسك 💪`
          : phase.key === "h1"
            ? `<b>⏰ باقي ساعة</b>\n\nامتحان <b>${esc(name)}</b> يبدأ الساعة <b>9:00 مساءً</b> — بعد ساعة من الآن.`
            : `<b>🔔 باقي 15 دقيقة</b>\n\nامتحان <b>${esc(name)}</b> يبدأ الساعة <b>9:00 مساءً</b>. افتح تميزك ← الدورات الآن.`;
      let ok = false;
      try {
        ok = await tgSend(chatId, msg);
      } catch (sendErr) {
        console.error("exam-plan-notify send failed", p.user_id, sendErr instanceof Error ? sendErr.message : sendErr);
      }
      if (ok) {
        sent++;
      } else {
        // Release the dedupe key so the next run retries instead of permanently
        // swallowing this reminder.
        failed++;
        await admin.from("telegram_notifications_sent").delete().eq("notification_key", key);
      }
      await new Promise((r) => setTimeout(r, 40));
    }

    return json({ sent, failed, skipped, nodue, phase: phase.key, date: todayKey, total: plans?.length ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
