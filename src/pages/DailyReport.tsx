import { useEffect, useState } from "react";
import { ArrowLeft, Sparkles, RefreshCw, Share2, Trophy, Clock, Target, Brain, Copy, Check, Link2, ListChecks, Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import ExcellenceCompanion from "@/components/ExcellenceCompanion";

const T = {
  en: {
    title: "My Daily Report", back: "Back",
    today: "Today", regenerate: "Refresh insights", generating: "Generating…",
    minutes: "Focused minutes", target: "of daily target",
    sessions: "Sessions", missions: "Missions done", points: "Points today",
    bySubject: "By subject", noActivity: "No study activity recorded for today yet — start a session!",
    coach: "AI Coach insights", summary: "Summary", strengths: "Strengths", weaknesses: "Work on this", plan: "Plan for tomorrow",
    exam: "Days to exam", noCoach: "Press refresh to get personalised AI feedback.",
    parent: "Parent follow-up", parentDesc: "Share this link so a parent can view your progress (read-only).",
    enable: "Enable parent link", revoke: "Revoke link", copy: "Copy link", copied: "Copied!",
    accessCode: "Parent access code", accessCodeDesc: "Give your parent this 6-digit code. They'll need it after opening the link.",
    regenCode: "Generate new code",
    min: "min",
    companion: "Excellence Companion", companionDesc: "Plan your week or work through a problem with AI.",
    todoToday: "Today's to-do list", todoDone: "done", todoOf: "of",
    todoRemaining: "Remaining today", todoEmpty: "No tasks scheduled for today.",
    todoAllDone: "All today's tasks are done. 🎉",
    goal: "Closeness to your goal", goalDesc: "Today's completion + days left to your exam.",
    complete: "complete",
  },
  ar: {
    title: "تقريري اليومي", back: "رجوع",
    today: "اليوم", regenerate: "تحديث الملاحظات", generating: "جارٍ التحليل…",
    minutes: "دقائق التركيز", target: "من الهدف اليومي",
    sessions: "جلسات", missions: "مهام منجزة", points: "نقاط اليوم",
    bySubject: "حسب المادة", noActivity: "لا توجد جلسات اليوم — ابدأ جلسة دراسة!",
    coach: "ملاحظات المدرّب الذكي", summary: "الخلاصة", strengths: "نقاط قوتك", weaknesses: "ما تحتاج تحسينه", plan: "خطة الغد",
    exam: "أيام للامتحان", noCoach: "اضغط على تحديث للحصول على ملاحظات بالذكاء الاصطناعي.",
    parent: "متابعة ولي الأمر", parentDesc: "شارك هذا الرابط ليتابع ولي الأمر تقدمك (للقراءة فقط).",
    enable: "تفعيل رابط ولي الأمر", revoke: "إلغاء الرابط", copy: "نسخ الرابط", copied: "تم النسخ!",
    accessCode: "رمز دخول ولي الأمر", accessCodeDesc: "أعطِ ولي أمرك هذا الرمز المكوّن من 6 أرقام. سيحتاجه بعد فتح الرابط.",
    regenCode: "توليد رمز جديد",
    min: "د",
    companion: "رفيق التميز", companionDesc: "نظّم أسبوعك أو حل مشكلتك مع الذكاء الاصطناعي.",
    todoToday: "قائمة مهام اليوم", todoDone: "مُنجز", todoOf: "من",
    todoRemaining: "المتبقي اليوم", todoEmpty: "لا توجد مهام مجدوَلة لليوم.",
    todoAllDone: "أنهيت كل مهام اليوم. 🎉",
    goal: "قربك من هدفك", goalDesc: "نسبة إنجاز اليوم + الأيام المتبقية للامتحان.",
    complete: "مكتمل",
  },
} as const;

type Report = {
  focused_minutes: number; sessions_count: number; missions_completed: number; points_earned: number;
  subjects_breakdown: Array<{ subject: string; minutes: number; missions: number }>;
  ai_summary: string; ai_strengths: string[]; ai_weaknesses: string[]; ai_plan: string[];
  report_date: string;
  todo_today?: { total: number; done: number; pending: string[]; pct: number };
};

export default function DailyReport({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  const t = T[language];
  const ar = language === "ar";
  const [report, setReport] = useState<Report | null>(null);
  const [meta, setMeta] = useState<{ days_to_exam: number | null; daily_target_minutes: number } | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [token, setToken] = useState<string | null>(null);
  const [accessCode, setAccessCode] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);
  const [copied, setCopied] = useState(false);

  const load = async (force = false) => {
    if (force) setRefreshing(true); else setLoading(true);
    const { data, error } = await supabase.functions.invoke("generate-daily-report", { body: { language, force } });
    if (error) toast.error(error.message);
    else if (data?.report) {
      setReport(data.report);
      if (data.meta) setMeta(data.meta);
    }
    setLoading(false);
    setRefreshing(false);
  };

  const loadToken = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data } = await supabase.from("parent_follow_links").select("token, enabled, revoked_at, access_code")
      .eq("user_id", u.user.id).is("revoked_at", null).eq("enabled", true).maybeSingle();
    setToken(data?.token ?? null);
    setAccessCode((data as any)?.access_code ?? null);
  };

  useEffect(() => { load(false); loadToken(); }, []);

  const enableLink = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const newToken = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "").slice(0, 32);
    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    const { data: ins, error } = await supabase
      .from("parent_follow_links")
      .insert({ user_id: u.user.id, token: newToken, access_code: newCode })
      .select("access_code")
      .single();
    if (error) { toast.error(error.message); return; }
    setToken(newToken);
    setAccessCode((ins as any)?.access_code ?? newCode);
    toast.success(ar ? "تم التفعيل" : "Enabled");
  };
  const regenerateCode = async () => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user || !token) return;
    const newCode = String(Math.floor(100000 + Math.random() * 900000));
    const { error } = await supabase.from("parent_follow_links")
      .update({ access_code: newCode })
      .eq("user_id", u.user.id).eq("token", token);
    if (error) { toast.error(error.message); return; }
    setAccessCode(newCode);
    toast.success(ar ? "تم توليد رمز جديد" : "New code generated");
  };
  const revoke = async () => {
    if (!token) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("parent_follow_links").update({ enabled: false, revoked_at: new Date().toISOString() }).eq("user_id", u.user.id).eq("token", token);
    setToken(null);
    setAccessCode(null);
    toast.success(ar ? "تم الإلغاء" : "Revoked");
  };
  const copyLink = async () => {
    if (!token) return;
    const url = `${location.origin}/follow/${token}`;
    await navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  const copyCode = async () => {
    if (!accessCode) return;
    await navigator.clipboard.writeText(accessCode);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 1500);
  };

  const focusedPct = meta && meta.daily_target_minutes
    ? Math.min(100, Math.round(((report?.focused_minutes ?? 0) / meta.daily_target_minutes) * 100))
    : 0;

  const todo = report?.todo_today ?? { total: 0, done: 0, pending: [], pct: 0 };

  return (
    <main className="min-h-screen px-4 py-12 md:py-16 relative overflow-hidden" dir={ar ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button onClick={onBack} aria-label={t.back}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up mb-10">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.today}</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text leading-[1.1] mb-3">{t.title}</h1>
        <button onClick={() => load(true)} disabled={refreshing}
          className="mt-4 inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 disabled:opacity-50">
          <RefreshCw className={`w-4 h-4 ${refreshing ? "animate-spin" : ""}`} />
          {refreshing ? t.generating : t.regenerate}
        </button>
      </header>

      <section className="max-w-5xl mx-auto z-10 relative space-y-6">
        {loading && !report ? (
          <div className="text-center text-muted-foreground py-20">…</div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <Stat icon={Clock} label={t.minutes} value={`${report?.focused_minutes ?? 0}`} sub={`${focusedPct}% ${t.target}`} />
              <Stat icon={ListChecks} label={t.todoToday} value={`${todo.done}/${todo.total}`} sub={`${todo.pct}% ${t.complete}`} />
              <Stat icon={Trophy} label={t.missions} value={`${report?.missions_completed ?? 0}`} />
              <Stat icon={Target} label={t.points} value={`${report?.points_earned ?? 0}`}
                sub={meta?.days_to_exam != null ? `${meta.days_to_exam} ${t.exam}` : undefined} />
            </div>

            {/* Today's to-do list focus */}
            <div className="rounded-2xl border border-primary/40 bg-primary/5 backdrop-blur p-5">
              <div className="flex items-center gap-2 mb-3">
                <ListChecks className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{t.todoToday}</span>
              </div>
              <div className="flex justify-between text-xs mb-2 text-muted-foreground">
                <span>{todo.done} {t.todoDone} {t.todoOf} {todo.total}</span>
                <span className="text-primary font-semibold tabular-nums">{todo.pct}%</span>
              </div>
              <Progress value={todo.pct} className="h-2" />
              {todo.total === 0 ? (
                <p className="text-sm text-muted-foreground mt-3">{t.todoEmpty}</p>
              ) : todo.pending.length === 0 ? (
                <p className="text-sm text-emerald-400 mt-3">{t.todoAllDone}</p>
              ) : (
                <div className="mt-3">
                  <div className="text-xs font-semibold text-amber-400 mb-1">{t.todoRemaining}</div>
                  <ul className="space-y-1 text-sm">
                    {todo.pending.map((x, i) => (
                      <li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Goal proximity */}
            {meta?.days_to_exam != null && (
              <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
                <div className="flex items-center gap-2 mb-2">
                  <Flag className="w-4 h-4 text-primary" />
                  <span className="text-sm font-semibold">{t.goal}</span>
                </div>
                <p className="text-xs text-muted-foreground mb-3">{t.goalDesc}</p>
                <div className="flex items-end justify-between gap-4">
                  <div>
                    <div className="text-3xl font-bold gradient-text tabular-nums">{todo.pct}%</div>
                    <div className="text-[11px] text-muted-foreground">{t.complete}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-3xl font-bold text-foreground tabular-nums">{meta.days_to_exam}</div>
                    <div className="text-[11px] text-muted-foreground">{t.exam}</div>
                  </div>
                </div>
                <div className="mt-3"><Progress value={todo.pct} className="h-2" /></div>
              </div>
            )}

            {/* Daily target progress */}
            {meta && (
              <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
                <div className="flex justify-between text-xs mb-2 text-muted-foreground">
                  <span>{t.minutes}</span>
                  <span className="text-primary font-semibold tabular-nums">
                    {report?.focused_minutes ?? 0} / {meta.daily_target_minutes} {t.min}
                  </span>
                </div>
                <Progress value={focusedPct} className="h-2" />
              </div>
            )}

            {/* By subject */}
            <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
              <div className="text-sm text-muted-foreground mb-3">{t.bySubject}</div>
              {!report?.subjects_breakdown?.length ? (
                <div className="text-sm text-muted-foreground">{t.noActivity}</div>
              ) : (
                <div className="space-y-3">
                  {report.subjects_breakdown.map((s) => (
                    <div key={s.subject}>
                      <div className="flex justify-between text-xs mb-1"><span>{s.subject}</span><span className="text-primary">{s.minutes} {t.min} · {s.missions} {t.missions}</span></div>
                      <Progress value={Math.min(100, (s.minutes / Math.max(1, report.focused_minutes)) * 100)} className="h-1.5" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* AI Coach */}
            <div className="rounded-2xl border border-primary/40 bg-primary/5 backdrop-blur p-5">
              <div className="flex items-center gap-2 mb-3">
                <Brain className="w-4 h-4 text-primary" />
                <span className="text-sm font-semibold text-primary">{t.coach}</span>
              </div>
              {!report?.ai_summary ? (
                <p className="text-sm text-muted-foreground">{t.noCoach}</p>
              ) : (
                <div className="space-y-4">
                  <p className="text-sm leading-relaxed">{report.ai_summary}</p>
                  {report.ai_strengths?.length ? <Block title={t.strengths} items={report.ai_strengths} color="text-emerald-400" /> : null}
                  {report.ai_weaknesses?.length ? <Block title={t.weaknesses} items={report.ai_weaknesses} color="text-amber-400" /> : null}
                  {report.ai_plan?.length ? <Block title={t.plan} items={report.ai_plan} color="text-primary" /> : null}
                </div>
              )}
            </div>

            {/* Parent link */}
            <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
              <div className="flex items-center gap-2 mb-2"><Share2 className="w-4 h-4 text-primary" /><span className="text-sm font-semibold">{t.parent}</span></div>
              <p className="text-xs text-muted-foreground mb-3">{t.parentDesc}</p>
              {!token ? (
                <button onClick={enableLink} className="h-10 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2">
                  <Link2 className="w-4 h-4" />{t.enable}
                </button>
              ) : (
                <div className="space-y-2">
                  <div className="flex items-center gap-2 p-2 rounded-xl border border-white/10 bg-background/40 text-xs overflow-hidden">
                    <span className="truncate">{location.origin}/follow/{token}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyLink} className="h-9 px-4 rounded-xl border border-primary/40 text-primary text-xs font-semibold inline-flex items-center gap-2">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t.copied : t.copy}
                    </button>
                    <button onClick={revoke} className="h-9 px-4 rounded-xl border border-destructive/40 text-destructive text-xs font-semibold">
                      {t.revoke}
                    </button>
                  </div>
                  {accessCode && (
                    <div className="mt-3 rounded-xl border border-primary/40 bg-primary/5 p-3">
                      <div className="text-[11px] uppercase tracking-wider text-primary font-semibold mb-1">{t.accessCode}</div>
                      <p className="text-[11px] text-muted-foreground mb-2">{t.accessCodeDesc}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-center text-2xl font-bold tabular-nums tracking-[0.4em] py-2 rounded-lg bg-background/60 border border-white/10">
                          {accessCode}
                        </div>
                        <button onClick={copyCode} className="h-10 px-3 rounded-xl border border-primary/40 text-primary text-xs font-semibold inline-flex items-center gap-1">
                          {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                          {codeCopied ? t.copied : t.copy}
                        </button>
                      </div>
                      <button onClick={regenerateCode} className="mt-2 text-[11px] text-muted-foreground hover:text-primary underline">
                        {t.regenCode}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>

          </>
        )}

        {/* Excellence Companion (only on report screen) */}
        <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
          <ExcellenceCompanion language={language} embedded />
        </div>
      </section>
    </main>
  );
}

function Stat({ icon: Icon, label, value, sub }: { icon: any; label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="w-3.5 h-3.5 text-primary" />{label}</div>
      <div className="text-2xl font-bold text-foreground tabular-nums">{value}</div>
      {sub && <div className="text-[11px] text-muted-foreground mt-1">{sub}</div>}
    </div>
  );
}

function Block({ title, items, color }: { title: string; items: string[]; color: string }) {
  return (
    <div>
      <div className={`text-xs font-semibold mb-1 ${color}`}>{title}</div>
      <ul className="space-y-1 text-sm">
        {items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>)}
      </ul>
    </div>
  );
}