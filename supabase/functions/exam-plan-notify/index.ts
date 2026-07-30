import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

function addDays(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const CYCLE_DAYS = 5;
// 1 -> [0]; 2 -> [0,4]; 3 -> [0,2,4]; 4 -> [0,1,3,4]; 5 -> [0..4]; >5 -> consecutive days
function examOffsets(count: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [0];
  if (count > CYCLE_DAYS) return Array.from({ length: count }, (_, i) => i);
  return Array.from({ length: count }, (_, i) => Math.round((i * (CYCLE_DAYS - 1)) / (count - 1)));
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
  return res.ok && (data as { ok?: boolean })?.ok;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, s = 200) =>
    new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });

  try {
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
      const offsets = examOffsets((p.subjects ?? []).length);
      const step = (p.subjects ?? []).findIndex((_, i) => addDays(p.start_date, offsets[i]) === todayKey);
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

      const subject = p.subjects[step];
      const name = SUBJECT_AR[subject] ?? subject;
      const msg =
        phase.key === "morning"
          ? `<b>📚 اليوم امتحانك</b>\n\nامتحان <b>${esc(name)}</b> اليوم الساعة <b>9:00 مساءً</b> بتوقيت بغداد (المرحلة ${step + 1} من ${p.subjects.length}).\n\nجهّز نفسك 💪`
          : phase.key === "h1"
            ? `<b>⏰ باقي ساعة</b>\n\nامتحان <b>${esc(name)}</b> يبدأ الساعة <b>9:00 مساءً</b> — بعد ساعة من الآن.`
            : `<b>🔔 باقي 15 دقيقة</b>\n\nامتحان <b>${esc(name)}</b> يبدأ الساعة <b>9:00 مساءً</b>. افتح تميزك ← الدورات الآن.`;
      const ok = await tgSend(chatId, msg);
      if (ok) sent++; else failed++;
      await new Promise((r) => setTimeout(r, 40));
    }

    return json({ sent, failed, skipped, nodue, phase: phase.key, date: todayKey, total: plans?.length ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
