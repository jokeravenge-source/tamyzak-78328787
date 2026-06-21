import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";
const AI_MODEL = "google/gemini-2.5-flash";

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

function dateNDaysAgo(n: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - n);
  return d.toISOString().slice(0, 10);
}

const DAY_EN = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAY_AR = ["الأحد", "الإثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
function todayNames(dateIso: string): { en: string; ar: string } {
  const d = new Date(`${dateIso}T00:00:00Z`);
  const i = d.getUTCDay();
  return { en: DAY_EN[i], ar: DAY_AR[i] };
}
function normalizeDay(s?: string): string {
  return (s || "").trim().toLowerCase();
}

async function loadTodayTodos(admin: any, userId: string, dateIso: string) {
  try {
    const { data } = await admin
      .from("student_todos").select("items").eq("user_id", userId).maybeSingle();
    const items: Array<{ id: string; text: string; done: boolean; day?: string }> =
      Array.isArray(data?.items) ? data.items : [];
    const names = todayNames(dateIso);
    const matches = (d?: string) => {
      if (!d) return true;
      const n = normalizeDay(d);
      return n === normalizeDay(names.en) || n === normalizeDay(names.ar);
    };
    const today = items.filter((i) => matches(i.day));
    const total = today.length;
    const done = today.filter((i) => i.done).length;
    const pending = today.filter((i) => !i.done).map((i) => i.text).slice(0, 10);
    const pct = total ? Math.round((done / total) * 100) : 0;
    return { total, done, pending, pct, items_today: today };
  } catch {
    return { total: 0, done: 0, pending: [], pct: 0, items_today: [] };
  }
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: corsHeaders });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const auth = req.headers.get("Authorization") ?? "";
    const supaUrl = Deno.env.get("SUPABASE_URL")!;
    const anon = Deno.env.get("SUPABASE_ANON_KEY")!;
    const service = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const userClient = createClient(supaUrl, anon, { global: { headers: { Authorization: auth } } });
    const admin = createClient(supaUrl, service);

    const { data: u } = await userClient.auth.getUser();
    if (!u?.user) return json({ error: "unauthorized" }, 401);
    const userId = u.user.id;

    const body = await req.json().catch(() => ({}));
    const language: "en" | "ar" = body.language === "ar" ? "ar" : "en";
    const date: string = body.date && /^\d{4}-\d{2}-\d{2}$/.test(body.date) ? body.date : todayIso();
    const force: boolean = !!body.force;

    // Cache: return existing report for today unless force
    if (!force) {
      const { data: cached } = await admin
        .from("daily_reports").select("*")
        .eq("user_id", userId).eq("report_date", date).eq("language", language).maybeSingle();
      if (cached && cached.ai_summary) {
        const todoSnap = await loadTodayTodos(admin, userId, date);
        const { data: prof0 } = await admin
          .from("student_profile").select("exam_date, weekly_goal_hours").eq("user_id", userId).maybeSingle();
        let dte: number | null = null;
        if (prof0?.exam_date) {
          const dx = (new Date(prof0.exam_date).getTime() - new Date(date).getTime()) / 86400000;
          dte = Math.max(0, Math.round(dx));
        }
        const dtm = prof0?.weekly_goal_hours ? Math.round((prof0.weekly_goal_hours * 60) / 7) : 120;
        return json({
          report: { ...cached, todo_today: todoSnap },
          meta: { days_to_exam: dte, daily_target_minutes: dtm },
          cached: true,
        });
      }
    }

    // Pull today's sessions
    const startToday = `${date}T00:00:00Z`;
    const endToday = `${date}T23:59:59Z`;
    const { data: sessionsToday } = await admin
      .from("study_sessions").select("subject, mission, duration_seconds, mission_completed, points, created_at")
      .eq("user_id", userId).gte("created_at", startToday).lte("created_at", endToday);

    const sessions = sessionsToday ?? [];
    const focusedMinutes = Math.round(sessions.reduce((s, r: any) => s + (r.duration_seconds || 0), 0) / 60);
    const missionsCompleted = sessions.filter((s: any) => s.mission_completed).length;
    const pointsEarned = sessions.reduce((s, r: any) => s + (r.points || 0), 0);

    const bySubjectMap = new Map<string, { minutes: number; missions: number }>();
    for (const s of sessions as any[]) {
      const cur = bySubjectMap.get(s.subject) || { minutes: 0, missions: 0 };
      cur.minutes += Math.round((s.duration_seconds || 0) / 60);
      if (s.mission_completed) cur.missions += 1;
      bySubjectMap.set(s.subject, cur);
    }
    const subjectsBreakdown = Array.from(bySubjectMap.entries()).map(([subject, v]) => ({ subject, ...v }));

    // 7-day history
    const start7 = dateNDaysAgo(7);
    const { data: sessions7 } = await admin
      .from("study_sessions").select("subject, duration_seconds, mission_completed, created_at")
      .eq("user_id", userId).gte("created_at", `${start7}T00:00:00Z`);
    const last7Minutes = Math.round((sessions7 ?? []).reduce((s, r: any) => s + (r.duration_seconds || 0), 0) / 60);
    const last7BySubject = new Map<string, number>();
    for (const s of (sessions7 ?? []) as any[]) {
      last7BySubject.set(s.subject, (last7BySubject.get(s.subject) || 0) + Math.round((s.duration_seconds || 0) / 60));
    }

    // Student profile
    const { data: profile } = await admin
      .from("student_profile").select("*").eq("user_id", userId).maybeSingle();

    let daysToExam: number | null = null;
    if (profile?.exam_date) {
      const dx = (new Date(profile.exam_date).getTime() - new Date(date).getTime()) / 86400000;
      daysToExam = Math.max(0, Math.round(dx));
    }
    const dailyTargetMin = profile?.weekly_goal_hours ? Math.round((profile.weekly_goal_hours * 60) / 7) : 120;

    // Today's to-do list snapshot
    const todoSnap = await loadTodayTodos(admin, userId, date);

    // AI call
    const apiKey = Deno.env.get("LOVABLE_API_KEY");
    let aiSummary = "";
    let aiStrengths: string[] = [];
    let aiWeaknesses: string[] = [];
    let aiPlan: string[] = [];

    if (apiKey) {
      const ar = language === "ar";
      const system = ar
        ? `أنت مدرّب دراسي شخصي. ركّز ملاحظاتك على قائمة المهام اليومية وكم اقترب الطالب من هدفه (نسبة الإنجاز وأيام الامتحان). أعد JSON صالحاً فقط بالشكل: {"summary":"...","strengths":["..."],"weaknesses":["..."],"plan":["..."]}. الملخص جملة أو اثنتان تذكر فيهما تقدّم اليوم في القائمة والقرب من الهدف. نقاط الضعف = المهام المتبقية اليوم. الخطة = 3 خطوات لإنهاء مهام اليوم.`
        : `You are a personal study coach. Center your feedback on the student's TODAY to-do list and how close they are to their goal (completion % and days to exam). Return ONLY valid JSON: {"summary":"...","strengths":["..."],"weaknesses":["..."],"plan":["..."]}. Summary = 1–2 sentences naming today's progress on the list and proximity to the goal. Weaknesses = remaining tasks for today. Plan = 3 concrete steps to finish today's tasks before the day ends.`;
      const userPayload = {
        date,
        todo_today_total: todoSnap.total,
        todo_today_done: todoSnap.done,
        todo_today_completion_pct: todoSnap.pct,
        todo_today_pending: todoSnap.pending,
        focused_minutes_today: focusedMinutes,
        daily_target_minutes: dailyTargetMin,
        missions_completed_today: missionsCompleted,
        points_today: pointsEarned,
        subjects_today: subjectsBreakdown,
        last_7_days_minutes: last7Minutes,
        last_7_days_by_subject: Array.from(last7BySubject.entries()).map(([s, m]) => ({ subject: s, minutes: m })),
        weak_subjects: profile?.weak_subjects ?? [],
        target_grade: profile?.target_grade ?? null,
        days_to_exam: daysToExam,
      };

      try {
        const r = await fetch(AI_URL, {
          method: "POST",
          headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
          body: JSON.stringify({
            model: AI_MODEL,
            messages: [
              { role: "system", content: system },
              { role: "user", content: JSON.stringify(userPayload) },
            ],
            response_format: { type: "json_object" },
          }),
        });
        if (r.ok) {
          const j = await r.json();
          const text = j?.choices?.[0]?.message?.content ?? "{}";
          const parsed = JSON.parse(text);
          aiSummary = String(parsed.summary || "");
          aiStrengths = Array.isArray(parsed.strengths) ? parsed.strengths.slice(0, 5).map(String) : [];
          aiWeaknesses = Array.isArray(parsed.weaknesses) ? parsed.weaknesses.slice(0, 5).map(String) : [];
          aiPlan = Array.isArray(parsed.plan) ? parsed.plan.slice(0, 5).map(String) : [];
        } else {
          console.error("ai non-ok", r.status, await r.text());
        }
      } catch (e) {
        console.error("ai err", e);
      }
    }

    const row = {
      user_id: userId,
      report_date: date,
      language,
      focused_minutes: focusedMinutes,
      sessions_count: sessions.length,
      missions_completed: missionsCompleted,
      points_earned: pointsEarned,
      subjects_breakdown: subjectsBreakdown,
      ai_summary: aiSummary,
      ai_strengths: aiStrengths,
      ai_weaknesses: aiWeaknesses,
      ai_plan: aiPlan,
    };
    const { data: saved, error } = await admin
      .from("daily_reports")
      .upsert(row, { onConflict: "user_id,report_date,language" })
      .select("*").maybeSingle();
    if (error) return json({ error: error.message }, 500);

    return json({
      report: { ...saved, todo_today: todoSnap },
      meta: { days_to_exam: daysToExam, daily_target_minutes: dailyTargetMin, last_7_days_minutes: last7Minutes },
    });
  } catch (e) {
    return json({ error: String(e) }, 500);
  }
});