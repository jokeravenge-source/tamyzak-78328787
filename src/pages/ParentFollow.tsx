import { useEffect, useState } from "react";
import { CalendarDays, GraduationCap, Brain, ListChecks, CheckCircle2, Circle, Lock, Wrench } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

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

  const PARCHMENT = "min-h-screen bg-background text-foreground";
  const FONT_STYLE = { fontFamily: "Inter, 'IBM Plex Sans Arabic', system-ui, sans-serif" };

  if (!unlocked) {
    return (
      <main className={`${PARCHMENT} flex items-center justify-center p-6`} style={FONT_STYLE}>
        <form onSubmit={submitCode} className="w-full max-w-sm border border-border bg-card text-card-foreground p-8 space-y-6 text-center clip-facet">
          <div className="inline-flex w-12 h-12 border border-border items-center justify-center mx-auto">
            <Lock className="w-5 h-5 text-foreground" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Tamyzak</p>
            <h1 className="text-2xl font-bold tracking-tight" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>Parent access</h1>
            <p className="text-sm text-muted-foreground mt-2">Enter the 6-digit access code your student gave you.</p>
          </div>
          <input
            inputMode="numeric"
            autoFocus
            maxLength={8}
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
            placeholder="••••••"
            className="w-full h-14 text-center font-mono text-2xl tracking-[0.6em] border border-border bg-muted/30 text-foreground outline-none focus:border-primary"
          />
          {err && <p className="text-sm text-destructive">{err}</p>}
          <button type="submit" disabled={submitting} className="w-full h-11 bg-primary text-primary-foreground font-semibold uppercase tracking-[0.16em] text-xs disabled:opacity-50 clip-facet-badge hover:opacity-90">
            {submitting ? "Checking…" : "Unlock"}
          </button>
        </form>
      </main>
    );
  }

  if (loading)
    return (
      <main className={`${PARCHMENT} flex items-center justify-center`}>
        <div className="w-8 h-8 rounded-full border-2 border-border border-t-primary animate-spin" />
      </main>
    );

  if (err || !data)
    return (
      <main className={`${PARCHMENT} flex items-center justify-center p-6`} style={FONT_STYLE}>
        <div className="max-w-md text-center border border-border bg-card text-card-foreground p-8 clip-facet">
          <h1 className="text-2xl font-bold mb-2 tracking-tight" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>Link not available</h1>
          <p className="text-muted-foreground text-sm">This follow-up link is invalid or has been revoked by the student.</p>
        </div>
      </main>
    );

  const max = Math.max(1, ...data.last_7_days.map((d) => d.minutes));
  const r = data.last_report;
  const todayHours = (data.today_seconds ?? 0) / 3600;
  const studiedToday = todayHours >= 1 ? `${todayHours.toFixed(1)} h` : `${data.today_minutes ?? 0} min`;
  const perSubject = Object.entries(data.today_per_subject ?? {}).sort((a, b) => b[1].minutes - a[1].minutes);
  const tools = data.tools_used_today ?? [];
  const totalToolUses = tools.reduce((a, t) => a + t.count, 0);

  return (
    <main className={PARCHMENT} style={FONT_STYLE}>
      <div className="max-w-4xl mx-auto px-5 md:px-8 py-10 md:py-14">
        {/* Header */}
        <header className="mb-10">
          <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground mb-2">Parent follow-up · read-only</p>
          <div className="flex items-end gap-3 flex-wrap">
            <h1 className="text-3xl md:text-[44px] font-bold tracking-tight leading-[1.05]" style={{ fontFamily: "'Space Grotesk', Inter, sans-serif" }}>
              {data.student_name}
            </h1>
            <span className="text-sm text-muted-foreground pb-1">·  today's study</span>
          </div>
        </header>

        {/* Top measurements */}
        <section className="grid grid-cols-2 md:grid-cols-4 border-t border-b border-border divide-x divide-border mb-10">
          <Measure label="Studied today" value={studiedToday} />
          <Measure label="Total points" value={`${data.total_points}`} accent />
          <Measure label="Target grade" value={data.target_grade != null ? `${data.target_grade}` : "—"} unit={data.target_grade != null ? "%" : undefined} />
          <Measure label="Days to exam" value={data.days_to_exam != null ? `${data.days_to_exam}` : "—"} />
        </section>

        <div className="space-y-10">
          {/* Today's activity */}
          <Panel icon={Wrench} title="Today's activity">
            <div className="grid grid-cols-2 md:grid-cols-4 border border-border divide-x divide-y md:divide-y-0 divide-border mb-6">
              <Mini label="Study time" value={studiedToday} />
              <Mini label="Sessions" value={`${r?.sessions_count ?? 0}`} />
              <Mini label="Tools used" value={`${tools.length}`} />
              <Mini label="Questions solved" value={`${data.questions_solved_today ?? 0}`} />
            </div>

            {perSubject.length > 0 && (
              <div className="mb-6">
                <SubHeading>By subject</SubHeading>
                <ul className="divide-y divide-border">
                  {perSubject.map(([subj, v]) => (
                    <li key={subj} className="flex justify-between items-baseline py-2 text-sm">
                      <span className="capitalize">{subj}</span>
                      <span className="font-mono text-muted-foreground tabular-nums">
                        {v.minutes} min · {v.sessions} sess · {v.missions} done
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {tools.length > 0 ? (
              <div>
                <SubHeading>
                  Tools & AI features used <span className="font-mono normal-case tracking-normal">({totalToolUses} total)</span>
                </SubHeading>
                <ul className="divide-y divide-border">
                  {tools.map((t) => (
                    <li key={t.feature} className="flex justify-between items-baseline py-2 text-sm">
                      <span>{TOOL_LABELS[t.feature] ?? t.feature}</span>
                      <span className="font-mono tabular-nums">× {t.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No AI tools used yet today.</p>
            )}
          </Panel>

          {/* Last 7 days chart */}
          <Panel icon={CalendarDays} title="Last 7 days · focused minutes">
            <div className="flex items-end justify-between gap-2 h-36 mt-2 border-b border-border pb-1">
              {data.last_7_days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1.5 min-w-0">
                  <div
                    className="w-full bg-primary transition-all"
                    style={{ height: `${Math.max(2, (d.minutes / max) * 100)}%` }}
                  />
                </div>
              ))}
            </div>
            <div className="flex justify-between gap-2 mt-2">
              {data.last_7_days.map((d) => (
                <div key={d.date} className="flex-1 flex flex-col items-center">
                  <div className="font-mono text-[10px] text-muted-foreground tabular-nums">{d.date.slice(5)}</div>
                  <div className="font-mono text-xs font-semibold tabular-nums">{d.minutes}</div>
                </div>
              ))}
            </div>
          </Panel>

          {/* AI Coach */}
          {r?.ai_summary && (
            <Panel icon={Brain} title="AI Coach summary">
              <p className="text-[15px] leading-relaxed mb-5">{r.ai_summary}</p>
              {r.ai_strengths?.length ? <Section title="Strengths" items={r.ai_strengths} /> : null}
              {r.ai_weaknesses?.length ? <Section title="Needs work" items={r.ai_weaknesses} /> : null}
              {r.ai_plan?.length ? <Section title="Plan for tomorrow" items={r.ai_plan} /> : null}
            </Panel>
          )}

          {/* To-do */}
          <Panel icon={ListChecks} title="Today's to-do list">
            {!data.todays_todos?.length ? (
              <p className="text-sm text-muted-foreground">No tasks planned for today.</p>
            ) : (
              <ul className="divide-y divide-border border-y border-border">
                {data.todays_todos.map((td, i) => (
                  <li key={td.id} className="flex items-center gap-3 py-3">
                    <span className="font-mono text-[11px] text-muted-foreground tabular-nums w-6 shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    {td.done ? (
                      <CheckCircle2 className="w-4 h-4 text-primary shrink-0" />
                    ) : (
                      <Circle className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                    <span className={`text-sm flex-1 ${td.done ? "line-through text-muted-foreground" : ""}`}>
                      {td.text}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <p className="text-center text-[10px] uppercase tracking-[0.28em] text-muted-foreground pt-4">
            <GraduationCap className="w-3 h-3 inline-block mb-0.5 me-1.5" />
            Tamyzak parent view
          </p>
        </div>
      </div>
    </main>
  );
}

function Measure({ label, value, unit, accent }: { label: string; value: string; unit?: string; accent?: boolean }) {
  return (
    <div className="p-5 md:p-6">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-2">{label}</div>
      <div className={`font-mono text-3xl md:text-4xl font-bold tabular-nums leading-none ${accent ? "text-primary" : "text-foreground"}`}>
        {value}
        {unit && <span className="text-base font-normal text-muted-foreground ms-1">{unit}</span>}
      </div>
    </div>
  );
}

function Panel({ icon: Icon, title, children }: { icon: any; title: string; children: React.ReactNode }) {
  return (
    <section className="border border-border bg-card text-card-foreground p-5 md:p-6 clip-facet">
      <header className="mb-4 inline-flex items-center gap-2">
        <Icon className="w-3.5 h-3.5 text-primary" />
        <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold">{title}</h2>
      </header>
      {children}
    </section>
  );
}

function Mini({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-4">
      <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground mb-1.5">{label}</div>
      <div className="font-mono text-xl font-bold tabular-nums leading-none">{value}</div>
    </div>
  );
}

function SubHeading({ children }: { children: React.ReactNode }) {
  return <div className="text-[10px] uppercase tracking-[0.22em] font-semibold text-muted-foreground mb-2">{children}</div>;
}

function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-4">
      <SubHeading>{title}</SubHeading>
      <ul className="space-y-1.5 text-sm">
        {items.map((x, i) => (
          <li key={i} className="flex gap-3 items-baseline">
            <span className="font-mono text-muted-foreground tabular-nums text-[11px] w-5 shrink-0">{String(i + 1).padStart(2, "0")}</span>
            <span className="flex-1">{x}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}