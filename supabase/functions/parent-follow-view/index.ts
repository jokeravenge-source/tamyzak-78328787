import { protect } from "../_shared/guard.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: corsHeaders });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const guard = await protect(req, "parent-follow-view", { max: 20, windowSeconds: 60 });
  if (!guard.ok) return new Response(JSON.stringify({ error: guard.error }), { status: guard.status, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  try {
    const { token, code } = await req.json().catch(() => ({}));
    if (!token || typeof token !== "string") return json({ error: "missing_token" }, 400);

    const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: link } = await admin.from("parent_follow_links")
      .select("user_id, enabled, parent_name, revoked_at, access_code")
      .eq("token", token).maybeSingle();
    if (!link || !link.enabled || link.revoked_at) return json({ error: "invalid_or_revoked" }, 404);
    if (!code || typeof code !== "string" || String(code).trim() !== String(link.access_code ?? "").trim()) {
      return json({ error: "code_required" }, 401);
    }

    const userId = link.user_id;
    const [{ data: profile }, { data: studentProfile }, { data: report }, { data: todosRow }] = await Promise.all([
      admin.from("profiles").select("display_name").eq("user_id", userId).maybeSingle(),
      admin.from("student_profile").select("exam_date, target_grade, weekly_goal_hours").eq("user_id", userId).maybeSingle(),
      admin.from("daily_reports").select("*").eq("user_id", userId).order("report_date", { ascending: false }).limit(1).maybeSingle(),
      admin.from("student_todos").select("items, week_key, updated_at").eq("user_id", userId).maybeSingle(),
    ]);

    // 7-day study sessions for chart
    const start = new Date(); start.setUTCDate(start.getUTCDate() - 6);
    const { data: sessions7 } = await admin.from("study_sessions")
      .select("duration_seconds, created_at, subject, mission, mission_completed, points")
      .eq("user_id", userId).gte("created_at", start.toISOString());
    const byDay: Record<string, number> = {};
    for (let i = 0; i < 7; i++) {
      const d = new Date(); d.setUTCDate(d.getUTCDate() - (6 - i));
      byDay[d.toISOString().slice(0, 10)] = 0;
    }
    for (const s of (sessions7 ?? []) as any[]) {
      const k = String(s.created_at).slice(0, 10);
      if (k in byDay) byDay[k] += Math.round((s.duration_seconds || 0) / 60);
    }

    // Today's activity: study time + per-subject minutes + tools used (feature_usage)
    const todayStr = new Date().toISOString().slice(0, 10);
    const todaySessions = (sessions7 ?? []).filter((s: any) => String(s.created_at).slice(0, 10) === todayStr);
    const todaySeconds = todaySessions.reduce((a: number, s: any) => a + (s.duration_seconds || 0), 0);
    const todayPerSubject: Record<string, { minutes: number; sessions: number; missions: number }> = {};
    for (const s of todaySessions as any[]) {
      const subj = s.subject || "other";
      if (!todayPerSubject[subj]) todayPerSubject[subj] = { minutes: 0, sessions: 0, missions: 0 };
      todayPerSubject[subj].minutes += Math.round((s.duration_seconds || 0) / 60);
      todayPerSubject[subj].sessions += 1;
      if (s.mission_completed) todayPerSubject[subj].missions += 1;
    }

    const { data: usageRows } = await admin.from("feature_usage")
      .select("feature").eq("user_id", userId).eq("used_on", todayStr);
    const toolCounts: Record<string, number> = {};
    for (const r of (usageRows ?? []) as any[]) {
      toolCounts[r.feature] = (toolCounts[r.feature] || 0) + 1;
    }
    const tools_used_today = Object.entries(toolCounts)
      .map(([feature, count]) => ({ feature, count }))
      .sort((a, b) => b.count - a.count);
    const questions_solved_today = (toolCounts["mcq"] || 0) + (toolCounts["generate-mcq"] || 0);

    // points total
    const { data: pts } = await admin.from("user_points").select("points").eq("user_id", userId);
    const totalPoints = (pts ?? []).reduce((a: number, r: any) => a + (r.points || 0), 0);

    let daysToExam: number | null = null;
    if (studentProfile?.exam_date) {
      const dx = (new Date(studentProfile.exam_date).getTime() - Date.now()) / 86400000;
      daysToExam = Math.max(0, Math.round(dx));
    }

    // Filter today's todos by day-of-week label (EN + AR)
    const dayIdx = new Date().getDay(); // 0=Sun..6=Sat
    const enDays = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
    const arDays = ["الأحد","الإثنين","الثلاثاء","الأربعاء","الخميس","الجمعة","السبت"];
    const todayEn = enDays[dayIdx];
    const todayAr1 = arDays[dayIdx];
    const todayAr2 = dayIdx === 1 ? "الاثنين" : null;
    const allItems = Array.isArray(todosRow?.items) ? (todosRow!.items as Array<{ id: string; text: string; done: boolean; day?: string }>) : [];
    const todaysTodos = allItems.filter((t) => {
      if (!t || typeof t.text !== "string") return false;
      if (!t.day) return true;
      return t.day === todayEn || t.day === todayAr1 || (todayAr2 && t.day === todayAr2);
    });

    return json({
      student_name: profile?.display_name ?? "Student",
      parent_name: link.parent_name,
      total_points: totalPoints,
      days_to_exam: daysToExam,
      target_grade: studentProfile?.target_grade ?? null,
      weekly_goal_hours: studentProfile?.weekly_goal_hours ?? null,
      last_7_days: Object.entries(byDay).map(([date, minutes]) => ({ date, minutes })),
      last_report: report ?? null,
      todays_todos: todaysTodos,
      all_todos: allItems,
      today_seconds: todaySeconds,
      today_minutes: Math.round(todaySeconds / 60),
      today_per_subject: todayPerSubject,
      tools_used_today,
      questions_solved_today,
      channel: `todos:${userId}`,
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});