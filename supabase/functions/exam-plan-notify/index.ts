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

    const { data: plans, error } = await admin
      .from("course_exam_plans")
      .select("user_id, subjects, start_date, interval_days");
    if (error) return json({ error: error.message }, 500);

    let sent = 0, skipped = 0, failed = 0, nodue = 0;

    for (const p of (plans ?? []) as { user_id: string; subjects: string[]; start_date: string; interval_days: number }[]) {
      const step = (p.subjects ?? []).findIndex((_, i) => addDays(p.start_date, i * (p.interval_days || 5)) === todayKey);
      if (step < 0) { nodue++; continue; }

      const { data: tg } = await admin
        .from("telegram_verifications")
        .select("telegram_user_id, verified")
        .eq("user_id", p.user_id)
        .maybeSingle();
      const chatId = (tg as { telegram_user_id: number | null } | null)?.telegram_user_id;
      if (!tg || !(tg as { verified: boolean }).verified || !chatId) { skipped++; continue; }

      const key = `exam-plan:${p.user_id}:${todayKey}`;
      const { error: dupErr } = await admin
        .from("telegram_notifications_sent")
        .insert({ notification_key: key, telegram_user_id: chatId });
      if (dupErr) { skipped++; continue; }

      const subject = p.subjects[step];
      const name = SUBJECT_AR[subject] ?? subject;
      const msg = `<b>📚 موعد امتحانك اليوم</b>\n\nحان وقت امتحان <b>${esc(name)}</b> (المرحلة ${step + 1} من ${p.subjects.length}).\n\nافتح تميزك ← الدورات وابدأ الامتحان الآن.`;
      const ok = await tgSend(chatId, msg);
      if (ok) sent++; else failed++;
      await new Promise((r) => setTimeout(r, 40));
    }

    return json({ sent, failed, skipped, nodue, date: todayKey, total: plans?.length ?? 0 });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
