import { useEffect, useState } from "react";
import { ArrowLeft, RefreshCw, Share2, Trophy, Clock, Target, Brain, Copy, Check, Link2, ListChecks, Flag, Crown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import ExcellenceCompanion from "@/components/ExcellenceCompanion";
import { useSubscription } from "@/hooks/useSubscription";

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
    premiumOnly: "Premium only", premiumDesc: "Parent follow-up is a Premium feature. Upgrade to share your progress with a parent.", upgrade: "Upgrade to Premium",
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
    premiumOnly: "للبريميوم فقط", premiumDesc: "متابعة ولي الأمر ميزة بريميوم. رقّ لمشاركة تقدمك مع ولي أمرك.", upgrade: "الترقية إلى البريميوم",
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
    <main
      className="min-h-screen bg-background text-foreground"
      dir={ar ? "rtl" : "ltr"}
      style={{ fontFamily: ar ? "'IBM Plex Sans Arabic', system-ui, sans-serif" : "Inter, system-ui, sans-serif" }}
    >
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* Header — calm, no glow, no gradient */}
        <div className="flex items-start justify-between gap-4 mb-10">
          <div className="min-w-0">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground mb-4"
            >
              <ArrowLeft className="w-3.5 h-3.5" />{t.back}
            </button>
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground">{t.today}</p>
            <h1
              className="text-3xl md:text-[44px] font-bold tracking-tight leading-[1.05] mt-1"
              style={{ fontFamily: ar ? "'Cairo', 'IBM Plex Sans Arabic', sans-serif" : "'Space Grotesk', Inter, sans-serif" }}
            >
              {t.title}
            </h1>
          </div>
          <button
            onClick={() => load(true)}
            disabled={refreshing}
            className="shrink-0 inline-flex items-center gap-2 h-10 px-4 border border-border hover:border-foreground/50 text-foreground text-xs font-semibold uppercase tracking-[0.14em] disabled:opacity-50 transition-colors clip-facet-badge"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} />
            {refreshing ? t.generating : t.regenerate}
          </button>
        </div>

        {loading && !report ? (
          <div className="py-24 text-center text-muted-foreground text-sm">…</div>
        ) : (
          <div className="space-y-10">
            {/* Primary measurements — 4 quiet number blocks divided by hairlines */}
            <section className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-border divide-x divide-border rtl:divide-x-reverse">
              <Measure label={t.minutes} value={`${report?.focused_minutes ?? 0}`} unit={t.min} sub={meta ? `${focusedPct}% ${t.target}` : undefined} />
              <Measure label={t.todoToday} value={`${todo.done}/${todo.total}`} sub={`${todo.pct}% ${t.complete}`} />
              <Measure label={t.missions} value={`${report?.missions_completed ?? 0}`} />
              <Measure label={t.points} value={`${report?.points_earned ?? 0}`} accent sub={meta?.days_to_exam != null ? `${meta.days_to_exam} ${t.exam}` : undefined} />
            </section>

            {/* Today's to-do — calm parchment card, single-cut corner */}
            <Panel icon={ListChecks} title={t.todoToday}>
              <div className="flex items-baseline justify-between mb-3">
                <span className="text-sm text-muted-foreground">
                  <span className="font-mono text-foreground font-semibold tabular-nums">{todo.done}</span>{" "}
                  {t.todoDone} {t.todoOf}{" "}
                  <span className="font-mono tabular-nums">{todo.total}</span>
                </span>
                <span className="font-mono text-lg font-semibold tabular-nums">{todo.pct}%</span>
              </div>
              <Bar value={todo.pct} />
              {todo.total === 0 ? (
                <p className="text-sm text-muted-foreground mt-4">{t.todoEmpty}</p>
              ) : todo.pending.length === 0 ? (
                <p className="text-sm text-emerald-600 dark:text-emerald-400 mt-4">{t.todoAllDone}</p>
              ) : (
                <div className="mt-5">
                  <div className="text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground mb-2">{t.todoRemaining}</div>
                  <ul className="space-y-1.5 text-sm">
                    {todo.pending.map((x, i) => (
                      <li key={i} className="flex gap-3 items-baseline">
                        <span className="font-mono text-muted-foreground/70 tabular-nums text-[11px] mt-0.5 w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
                        <span className="flex-1">{x}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </Panel>

            {/* Goal proximity */}
            {meta?.days_to_exam != null && (
              <Panel icon={Flag} title={t.goal} subtitle={t.goalDesc}>
                <div className="grid grid-cols-2 gap-px bg-border mt-2 border border-border">
                  <div className="bg-background p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{t.complete}</div>
                    <div className="font-mono text-4xl font-bold tabular-nums">{todo.pct}<span className="text-xl text-muted-foreground/70">%</span></div>
                  </div>
                  <div className="bg-background p-5">
                    <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1">{t.exam}</div>
                    <div className="font-mono text-4xl font-bold tabular-nums">{meta.days_to_exam}</div>
                  </div>
                </div>
                <div className="mt-4"><Bar value={todo.pct} /></div>
              </Panel>
            )}

            {/* Daily target progress */}
            {meta && (
              <Panel icon={Clock} title={t.minutes}>
                <div className="flex items-baseline justify-between mb-3">
                  <span className="text-sm text-muted-foreground">{t.target}</span>
                  <span className="font-mono text-lg font-semibold tabular-nums">
                    {report?.focused_minutes ?? 0} <span className="text-muted-foreground/70">/</span> {meta.daily_target_minutes} <span className="text-sm text-muted-foreground/70">{t.min}</span>
                  </span>
                </div>
                <Bar value={focusedPct} />
              </Panel>
            )}

            {/* By subject */}
            <Panel icon={Target} title={t.bySubject}>
              {!report?.subjects_breakdown?.length ? (
                <div className="text-sm text-muted-foreground">{t.noActivity}</div>
              ) : (
                <div className="space-y-4 mt-1">
                  {report.subjects_breakdown.map((s) => {
                    const pct = Math.min(100, (s.minutes / Math.max(1, report.focused_minutes)) * 100);
                    return (
                      <div key={s.subject}>
                        <div className="flex justify-between text-sm mb-1.5">
                          <span className="capitalize">{s.subject}</span>
                          <span className="font-mono text-muted-foreground tabular-nums">
                            {s.minutes} {t.min} · {s.missions} {t.missions}
                          </span>
                        </div>
                        <Bar value={pct} />
                      </div>
                    );
                  })}
                </div>
              )}
            </Panel>

            {/* AI Coach */}
            <Panel icon={Brain} title={t.coach}>
              {!report?.ai_summary ? (
                <p className="text-sm text-muted-foreground">{t.noCoach}</p>
              ) : (
                <div className="space-y-5">
                  <p className="text-[15px] leading-relaxed">{report.ai_summary}</p>
                  {report.ai_strengths?.length ? <Block title={t.strengths} items={report.ai_strengths} /> : null}
                  {report.ai_weaknesses?.length ? <Block title={t.weaknesses} items={report.ai_weaknesses} /> : null}
                  {report.ai_plan?.length ? <Block title={t.plan} items={report.ai_plan} /> : null}
                </div>
              )}
            </Panel>

            {/* Parent link */}
            <Panel icon={Share2} title={t.parent} subtitle={t.parentDesc}>
              {!token ? (
                <button
                  onClick={enableLink}
                  className="h-10 px-5 bg-foreground text-background text-xs font-semibold uppercase tracking-[0.14em] inline-flex items-center gap-2 clip-facet-badge hover:opacity-90"
                >
                  <Link2 className="w-3.5 h-3.5" />{t.enable}
                </button>
              ) : (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 p-3 border border-border font-mono text-xs overflow-hidden">
                    <span className="truncate">{location.origin}/follow/{token}</span>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={copyLink} className="h-9 px-4 border border-border hover:border-foreground/50 text-xs font-semibold uppercase tracking-[0.12em] inline-flex items-center gap-1.5 clip-facet-badge">
                      {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                      {copied ? t.copied : t.copy}
                    </button>
                    <button onClick={revoke} className="h-9 px-4 border border-destructive/40 text-destructive hover:border-destructive/70 text-xs font-semibold uppercase tracking-[0.12em] clip-facet-badge">
                      {t.revoke}
                    </button>
                  </div>
                  {accessCode && (
                    <div className="mt-3 border border-border p-4">
                      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-1">{t.accessCode}</div>
                      <p className="text-[11px] text-muted-foreground mb-3">{t.accessCodeDesc}</p>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 text-center font-mono text-2xl font-bold tabular-nums tracking-[0.5em] py-3 bg-foreground/5 border border-border">
                          {accessCode}
                        </div>
                        <button onClick={copyCode} className="h-12 px-3 border border-border hover:border-foreground/50 text-xs font-semibold uppercase tracking-[0.12em] inline-flex items-center gap-1 clip-facet-badge">
                          {codeCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        </button>
                      </div>
                      <button onClick={regenerateCode} className="mt-3 text-[11px] uppercase tracking-[0.14em] text-muted-foreground hover:text-foreground underline underline-offset-4">
                        {t.regenCode}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </Panel>
          </div>
        )}

        {/* Excellence Companion — kept here per product spec, framed like the rest */}
        <div className="mt-10 border border-border bg-background p-5 clip-facet">
          <ExcellenceCompanion language={language} embedded />
        </div>
      </div>
    </main>
  );
}

/* Calm primary measurement cell — divided columns, mono numeral, no chrome */
function Measure({ label, value, unit, sub, accent }: { label: string; value: string; unit?: string; sub?: string; accent?: boolean }) {
  return (
    <div className="p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</div>
      <div className={`font-mono text-3xl md:text-4xl font-bold tabular-nums leading-none ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
        {unit && <span className="text-base font-normal text-muted-foreground/70 ms-1">{unit}</span>}
      </div>
      {sub && <div className="text-[11px] text-muted-foreground mt-2 font-mono tabular-nums">{sub}</div>}
    </div>
  );
}

/* Parchment panel with a single beveled corner — the quiet "facet echo" */
function Panel({ icon: Icon, title, subtitle, children }: { icon: any; title: string; subtitle?: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-background p-5 md:p-6 clip-facet">
      <header className="mb-4">
        <div className="inline-flex items-center gap-2 mb-1">
          <Icon className="w-3.5 h-3.5 text-foreground" />
          <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold text-foreground">{title}</h2>
        </div>
        {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
      </header>
      {children}
    </section>
  );
}

/* Hairline progress bar — ink-on-parchment, no gradient */
function Bar({ value }: { value: number }) {
  return (
    <div className="h-[3px] w-full bg-foreground/10 overflow-hidden">
      <div
        className="h-full bg-foreground transition-[width] duration-700 ease-out"
        style={{ width: `${Math.max(0, Math.min(100, value))}%` }}
      />
    </div>
  );
}

function Block({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-[0.22em] font-semibold mb-2 text-muted-foreground">{title}</div>
      <ul className="space-y-1.5 text-sm">
        {items.map((x, i) => (
          <li key={i} className="flex gap-3 items-baseline">
            <span className="font-mono text-muted-foreground/70 tabular-nums text-[11px] w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1">{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}