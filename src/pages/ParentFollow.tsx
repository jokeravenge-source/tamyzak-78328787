import { useEffect, useState } from "react";
import { Clock, Target, Trophy, CalendarDays, GraduationCap, Brain } from "lucide-react";
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
};

export default function ParentFollow({ token }: { token: string }) {
  const [data, setData] = useState<Snapshot | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: d, error } = await supabase.functions.invoke("parent-follow-view", { body: { token } });
      if (error) setErr(error.message);
      else if ((d as any)?.error) setErr((d as any).error);
      else setData(d as Snapshot);
      setLoading(false);
    })();
  }, [token]);

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
          <Card icon={Clock} label="Focused today" value={`${r?.focused_minutes ?? 0} min`} />
          <Card icon={Trophy} label="Total points" value={`${data.total_points}`} />
          <Card icon={Target} label="Target grade" value={data.target_grade != null ? `${data.target_grade}%` : "—"} />
          <Card icon={CalendarDays} label="Days to exam" value={data.days_to_exam != null ? `${data.days_to_exam}` : "—"} />
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
function Section({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="mt-3">
      <div className="text-xs font-semibold mb-1 text-primary">{title}</div>
      <ul className="space-y-1 text-sm">{items.map((x, i) => <li key={i} className="flex gap-2"><span className="text-primary">•</span>{x}</li>)}</ul>
    </div>
  );
}