import { useEffect, useState } from "react";
import { Clock, Target, Trophy, CalendarDays, GraduationCap, Brain, ListChecks, CheckCircle2, Circle, Lock, Wrench, Hourglass } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Progress } from "@/components/ui/progress";

type Snapshot = {
  student_name: string;
  parent_name: string | null;
  total_points: number;
  days_to_exam: number | null;
  target_grade: number | null;
  weekly_goal_hours: number | null;
  last_7_days: Array<{ date: string; minutes: number }>;
  last_report: any;
  todays_todos?: Array<{ id: string; text: string; done: boolean; day?: string }>;
  channel?: string;
  today_minutes?: number;
  today_seconds?: number;
  today_per_subject?: Record<string, { minutes: number; sessions: number; missions: number }>;
  tools_used_today?: Array<{ feature: string; count: number }>;
  questions_solved_today?: number;
};

const TOOL_LABELS: Record<string, string> = {
  mcq: "MCQ practice",
  "generate-mcq": "MCQ generator",
  agent: "Subject AI agent",
  video: "Video notes",
  "video-notes": "Video notes",
  "essay-coach": "Al-Musahhih",
  essay: "Al-Musahhih",
  english_essay: "English essay check",
  "hadith-verify": "Hadith verify",
  "poem-verify": "Poem verify",
  "surah-verify": "Surah verify",
};

export default function ParentFollow({ token }: { token: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [code, setCode] = useState<string>(() => sessionStorage.getItem(`pf_code_${token}`) ?? "");
  const [unlocked, setUnlocked] = useState<boolean>(() => !!sessionStorage.getItem(`pf_code_${token}`));
  const [submitting, setSubmitting] = useState(false);

  const fetchSnapshot = async (codeArg?: string) => {
    const c = codeArg ?? code;
    const { data: d, error } = await supabase.functions.invoke("parent-follow-view", { body: { token, code: c } });
    if (error) { setErr(error.message); return null; }
    if ((d as any)?.error) {
      if ((d as any).error === "code_required") {
        sessionStorage.removeItem(`pf_code_${token}`);
        setUnlocked(false);
        setErr("Incorrect access code. Ask the student for the 6-digit code shown in their app.");
        return null;
      }
      setErr((d as any).error);
      return null;
    }
    setData(d as Snapshot);
    setErr(null);
    return d as Snapshot;
  };

  useEffect(() => {
    if (!unlocked) return;
    (async () => {
      setLoading(true);
      await fetchSnapshot();
      setLoading(false);
    })();
  }, [token, unlocked]);

  // Live updates: subscribe to the student's broadcast channel and refetch on changes.
  useEffect(() => {
    const channelName = data?.channel;
    if (!channelName) return;
    const ch = supabase
      .channel(channelName)
      .on("broadcast", { event: "todos-changed" }, () => { fetchSnapshot(); })
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [data?.channel]);

  const submitCode = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = code.trim();
    if (clean.length < 4) { setErr("Enter the access code"); return; }
    setSubmitting(true);
    const res = await fetchSnapshot(clean);
    setSubmitting(false);
    if (res) {
      sessionStorage.setItem(`pf_code_${token}`, clean);
      setUnlocked(true);
    }
  };

  if (!unlocked) {
    return (
      <main className="min-h-screen flex items-center justify-center p-6">
        <form onSubmit={submitCode} className="w-full max-w-sm rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-5 text-center">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mx-auto">
            <Lock className="w-7 h-7 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">Parent access</h1>
            <p className="text-sm text-muted-foreground mt-1">Enter the 6-digit access code your student gave you.</p>
          </div>
          <input
            inputMode="numeric"
            autoFocus
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className="w-full h-14 text-center text-2xl tracking-[0.6em] rounded-xl border border-white/10 bg-background/60 outline-none focus:border-primary/60"
          />
          {err && <p className="text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={submitting} className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold disabled:opacity-50">
            {submitting ? "Checking…" : "Unlock"}
          </button>
        </form>
      </main>
    );
  }

  if (loading) return <main className="min-h-screen flex items-center justify-center"><div className="w-10 h-10 rounded-full border-2 border-primary/30 border-t-primary animate-spin" /></main>;
  if (err || !data) return (
    <main className="min-h-screen flex items-center justify-center p-6">
      <div className="max-w-md text-center rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-8">
        <h1 className="text-2xl font-bold mb-2">Link not available</h1>
        <p className="text-muted-foreground text-sm">This follow-up link is invalid or has been revoked by the student.</p>
      </div>
    </main>
  );

  const max = Math.max(1, ...data.last_7_days.map((d) => d.minutes));
  const r = data.last_report;
  const todayHours = ((data.today_seconds ?? 0) / 3600);
  const perSubject = Object.entries(data.today_per_subject ?? {}).sort((a, b) => b[1].minutes - a[1].minutes);
  const tools = data.tools_used_today ?? [];
  const totalToolUses = tools.reduce((a, t) => a + t.count, 0);

  return (
    <main className="min-h-screen px-4 py-10 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="max-w-3xl mx-auto relative z-10 space-y-6">
        <header className="text-center animate-fade-up">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mb-3">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">{data.student_name}'s study</h1>
          <p className="text-muted-foreground text-sm mt-2">Read-only parent view</p>
        </header>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card icon={Hourglass} label="Studied today" value={todayHours >= 1 ? `${todayHours.toFixed(1)} h` : `${data.today_minutes ?? 0} min`} />
          <Card icon={Trophy} label="Total points" value={`${data.total_points}`} />
          <Card icon={Target} label="Target grade" value={data.target_grade != null ? `${data.target_grade}%` : "—"} />
          <Card icon={CalendarDays} label="Days to exam" value={data.days_to_exam != null ? `${data.days_to_exam}` : "—"} />
        </div>

        <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
          <div className="flex items-center gap-2 mb-3"><Wrench className="w-4 h-4 text-primary" /><span className="text-sm font-semibold">Today's activity</span></div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
            <Mini label="Study time" value={todayHours >= 1 ? `${todayHours.toFixed(1)} h` : `${data.today_minutes ?? 0} min`} />
            <Mini label="Sessions" value={`${r?.sessions_count ?? 0}`} />
            <Mini label="Tools used" value={`${tools.length}`} />
            <Mini label="Questions solved" value={`${data.questions_solved_today ?? 0}`} />
          </div>

          {perSubject.length > 0 && (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">By subject</div>
              <ul className="space-y-1.5 mb-4">
                {perSubject.map(([subj, v]) => (
                  <li key={subj} className="flex justify-between text-sm">
                    <span className="capitalize">{subj}</span>
                    <span className="text-muted-foreground tabular-nums">{v.minutes} min · {v.sessions} sess · {v.missions} ✓</span>
                  </li>
                ))}
              </ul>
            </>
          )}

          {tools.length > 0 ? (
            <>
              <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">Tools & AI features used ({totalToolUses} total)</div>
              <ul className="space-y-1.5">
                {tools.map((t) => (
                  <li key={t.feature} className="flex justify-between text-sm">
                    <span>{TOOL_LABELS[t.feature] ?? t.feature}</span>
                    <span className="text-primary tabular-nums">× {t.count}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">No AI tools used yet today.</p>
          )}
        </div>

        <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
          <div className="text-sm text-muted-foreground mb-3">Last 7 days · focused minutes</div>
          <div className="flex items-end justify-between gap-2 h-32">
            {data.last_7_days.map((d) => (
              <div key={d.date} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full rounded-t bg-primary/70" style={{ height: `${(d.minutes / max) * 100}%`, minHeight: 2 }} />
                <div className="text-[10px] text-muted-foreground">{d.date.slice(5)}</div>
                <div className="text-[10px] text-foreground tabular-nums">{d.minutes}</div>
              </div>
            ))}
          </div>
        </div>

        {r?.ai_summary && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 backdrop-blur p-5">
            <div className="flex items-center gap-2 mb-2"><Brain className="w-4 h-4 text-primary" /><span className="text-sm font-semibold text-primary">AI Coach summary</span></div>
            <p className="text-sm leading-relaxed mb-3">{r.ai_summary}</p>
            {r.ai_strengths?.length ? <Section title="Strengths" items={r.ai_strengths} /> : null}
            {r.ai_weaknesses?.length ? <Section title="Needs work" items={r.ai_weaknesses} /> : null}
            {r.ai_plan?.length ? <Section title="Plan for tomorrow" items={r.ai_plan} /> : null}
          </div>
        )}

        <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
          <div className="flex items-center gap-2 mb-3"><ListChecks className="w-4 h-4 text-primary" /><span className="text-sm font-semibold">Today's to-do list</span></div>
          {!data.todays_todos?.length ? (
            <p className="text-sm text-muted-foreground">No tasks planned for today.</p>
          ) : (
            <ul className="space-y-2">
              {data.todays_todos.map((td) => (
                <li key={td.id} className={`flex items-center gap-3 rounded-xl border p-3 ${td.done ? "border-primary/40 bg-primary/10" : "border-white/10 bg-background/40"}`}>
                  {td.done ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" /> : <Circle className="w-5 h-5 text-muted-foreground shrink-0" />}
                  <span className={`text-sm ${td.done ? "line-through text-muted-foreground" : "text-foreground"}`}>{td.text}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </main>
  );
}

function Card({ icon: Icon, label, value }: { icon: any; label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-4">
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1"><Icon className="w-3.5 h-3.5 text-primary" />{label}</div>
      <div className="text-2xl font-bold tabular-nums">{value}</div>
    </div>
  );
}
function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-background/40 p-3">
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
    </div>
  );
}
function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold mb-1 text-primary">{title}</div>
      <ul className="space-y-1 text-sm">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>)}</ul>
    </div>
  );
}