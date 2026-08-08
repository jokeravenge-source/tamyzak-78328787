import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer, LineChart, Line, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, PieChart, Pie, Cell, Legend,
} from "recharts";
import { Activity, Users, TrendingUp, Search, Download, Loader2, Flame, LogOut, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { TRACKING_STARTED_AT } from "@/lib/analytics";

type Overview = {
  total_users: number; new_today: number; new_week: number; new_month: number;
  dau: number; wau: number; mau: number; events_total: number;
  tracking_started_at: string | null; d1: number; d7: number; d30: number;
};
type SignupRow = { day: string; total: number; telegram: number; instagram: number; direct: number; referral: number; other: number };
type SourceRow = { source: string; users: number };
type FeatureRow = { feature: string; uses: number; users: number };
type Engagement = {
  streak_buckets: { bucket: string; users: number }[];
  points_buckets: { bucket: string; users: number }[];
  avg_active_days_14: number; full_unlock_users: number; total_users: number;
};
type Dropoff = {
  inactive_7: number; inactive_14: number; inactive_30: number; never_active: number;
  funnel: { signup: number; first_feature: number; returned_next_day: number; active_7d: number };
};
type UserRow = { user_id: string; email: string; display_name: string | null; source: string | null; signed_up: string; last_seen: string | null; points: number };
type TimelineRow = { kind: string; label: string; detail: string | null; at: string };

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#22d3ee", "#a78bfa", "#94a3b8", "#ef4444"];

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 shadow-[var(--shadow-card)] ${className}`}>
    {children}
  </div>
);

const Kpi = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <Card>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
  </Card>
);

const AdminAnalyticsTab = () => {
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(30);
  const [ov, setOv] = useState<Overview | null>(null);
  const [signups, setSignups] = useState<SignupRow[]>([]);
  const [sources, setSources] = useState<SourceRow[]>([]);
  const [features, setFeatures] = useState<FeatureRow[]>([]);
  const [eng, setEng] = useState<Engagement | null>(null);
  const [drop, setDrop] = useState<Dropoff | null>(null);

  const load = async () => {
    setLoading(true);
    try {
      const [o, s, src, f, e, d] = await Promise.all([
        supabase.rpc("admin_analytics_overview"),
        supabase.rpc("admin_analytics_signups", { _days: range }),
        supabase.rpc("admin_analytics_sources"),
        supabase.rpc("admin_analytics_features", { _days: range }),
        supabase.rpc("admin_analytics_engagement"),
        supabase.rpc("admin_analytics_dropoff"),
      ]);
      const err = o.error || s.error || src.error || f.error || e.error || d.error;
      if (err) throw err;
      setOv(o.data as unknown as Overview);
      setSignups((s.data ?? []) as unknown as SignupRow[]);
      setSources((src.data ?? []) as unknown as SourceRow[]);
      setFeatures((f.data ?? []) as unknown as FeatureRow[]);
      setEng(e.data as unknown as Engagement);
      setDrop(d.data as unknown as Dropoff);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed to load analytics");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [range]);

  // ---- user lookup ----
  const [q, setQ] = useState("");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [searching, setSearching] = useState(false);
  const [picked, setPicked] = useState<UserRow | null>(null);
  const [timeline, setTimeline] = useState<TimelineRow[]>([]);

  const search = async () => {
    if (q.trim().length < 2) return toast.error("Type at least 2 characters");
    setSearching(true);
    const { data, error } = await supabase.rpc("admin_analytics_search_users", { _q: q.trim() });
    setSearching(false);
    if (error) return toast.error(error.message);
    setUsers((data ?? []) as unknown as UserRow[]);
  };

  const openUser = async (u: UserRow) => {
    setPicked(u);
    setTimeline([]);
    const { data, error } = await supabase.rpc("admin_analytics_user_timeline", { _user_id: u.user_id, _limit: 100 });
    if (error) return toast.error(error.message);
    setTimeline((data ?? []) as unknown as TimelineRow[]);
  };

  const activeUsers = ov?.mau || 0;
  const dauMau = ov && ov.mau ? Math.round((ov.dau / ov.mau) * 1000) / 10 : 0;

  const snapshot = useMemo(() => {
    if (!ov) return "";
    const top = features[0];
    const srcLine = sources.map((s) => `${s.source}: ${s.users}`).join(", ");
    return [
      `Tamyzak — marketing snapshot (${new Date().toISOString().slice(0, 10)})`,
      `Tracking started: ${TRACKING_STARTED_AT}`,
      ``,
      `Total users: ${ov.total_users}`,
      `New signups — today: ${ov.new_today} | 7d: ${ov.new_week} | 30d: ${ov.new_month}`,
      `DAU: ${ov.dau} | WAU: ${ov.wau} | MAU: ${ov.mau} | DAU/MAU: ${dauMau}%`,
      `Retention — D1: ${ov.d1}% | D7: ${ov.d7}% | D30: ${ov.d30}%`,
      `Top feature: ${top ? `${top.feature} (${top.uses} uses, ${top.users} users)` : "n/a"}`,
      `Avg active days (last 14): ${eng?.avg_active_days_14 ?? 0}`,
      `Users with 14/14 daily use: ${eng?.full_unlock_users ?? 0}`,
      `Signup sources: ${srcLine || "n/a"}`,
      ``,
      `Note: source attribution only covers users tracked from ${TRACKING_STARTED_AT} onward.`,
    ].join("\n");
  }, [ov, features, sources, eng, dauMau]);

  const exportSnapshot = () => {
    const blob = new Blob([snapshot], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `tamyzak-snapshot-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Snapshot exported");
  };

  if (loading && !ov) {
    return <div className="flex justify-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }

  const funnel = drop ? [
    { step: "Signup", value: drop.funnel.signup },
    { step: "First feature", value: drop.funnel.first_feature },
    { step: "Returned D+1", value: drop.funnel.returned_next_day },
    { step: "7-day active", value: drop.funnel.active_7d },
  ] : [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-2 justify-between">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Activity className="w-4 h-4 text-primary" /> Analytics</h3>
          <p className="text-xs text-muted-foreground">Event tracking live from {TRACKING_STARTED_AT} — earlier activity and signup sources are not attributed.</p>
        </div>
        <div className="flex items-center gap-2">
          {[7, 30, 90].map((d) => (
            <button key={d} onClick={() => setRange(d)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold border ${range === d ? "bg-primary text-primary-foreground border-primary" : "border-border/60 bg-card/60"}`}>
              {d}d
            </button>
          ))}
          <button onClick={load} className="px-3 py-1.5 rounded-lg text-xs font-semibold border border-border/60 bg-card/60 inline-flex items-center gap-1">
            <RefreshCw className="w-3 h-3" /> Refresh
          </button>
          <button onClick={exportSnapshot} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1">
            <Download className="w-3 h-3" /> Snapshot
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Total users" value={ov?.total_users ?? 0} />
        <Kpi label="New today" value={ov?.new_today ?? 0} sub={`7d: ${ov?.new_week ?? 0} · 30d: ${ov?.new_month ?? 0}`} />
        <Kpi label="DAU / WAU / MAU" value={`${ov?.dau ?? 0} / ${ov?.wau ?? 0} / ${ov?.mau ?? 0}`} sub={`DAU/MAU ${dauMau}%`} />
        <Kpi label="Retention D1 / D7 / D30" value={`${ov?.d1 ?? 0}% / ${ov?.d7 ?? 0}% / ${ov?.d30 ?? 0}%`} sub={`${ov?.events_total ?? 0} events logged`} />
      </div>

      {/* Growth */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card className="lg:col-span-2">
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" /> Signups over time</p>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={signups}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip />
                <Line type="monotone" dataKey="total" stroke={COLORS[0]} strokeWidth={2} dot={false} name="Signups" />
                <Line type="monotone" dataKey="telegram" stroke={COLORS[2]} strokeWidth={1.5} dot={false} name="Telegram" />
                <Line type="monotone" dataKey="instagram" stroke={COLORS[3]} strokeWidth={1.5} dot={false} name="Instagram" />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold mb-3">Signup sources</p>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={sources} dataKey="users" nameKey="source" innerRadius={45} outerRadius={80} paddingAngle={2}>
                  {sources.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Feature usage */}
      <Card>
        <p className="text-sm font-semibold mb-3">Feature adoption (last {range} days)</p>
        {features.length === 0 ? (
          <p className="text-xs text-muted-foreground py-8 text-center">No feature events yet — tracking just started.</p>
        ) : (
          <>
            <div className="h-72" dir="ltr">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={features.slice(0, 15)}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                  <XAxis dataKey="feature" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={70} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="uses" fill={COLORS[0]} radius={[6, 6, 0, 0]} name="Uses" />
                  <Bar dataKey="users" fill={COLORS[1]} radius={[6, 6, 0, 0]} name="Users" />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-3 max-h-56 overflow-auto text-xs">
              <table className="w-full">
                <thead className="text-muted-foreground"><tr><th className="text-start py-1">Feature</th><th className="text-start">Uses</th><th className="text-start">Users</th><th className="text-start">% of active</th></tr></thead>
                <tbody>
                  {features.map((f) => (
                    <tr key={f.feature} className="border-t border-border/40">
                      <td className="py-1">{f.feature}</td><td>{f.uses}</td><td>{f.users}</td>
                      <td>{activeUsers ? Math.round((f.users / activeUsers) * 1000) / 10 : 0}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

      {/* Engagement */}
      <div className="grid lg:grid-cols-3 gap-4">
        <Card>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Flame className="w-4 h-4 text-ember" /> Active days (last 14)</p>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eng?.streak_buckets ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="users" fill={COLORS[2]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <p className="text-[11px] text-muted-foreground mt-2">
            Full-unlock milestone (14/14 days): <strong>{eng?.full_unlock_users ?? 0}</strong>
            {eng?.total_users ? ` (${Math.round(((eng.full_unlock_users / eng.total_users) * 1000)) / 10}%)` : ""}
          </p>
        </Card>
        <Card>
          <p className="text-sm font-semibold mb-3">Points distribution</p>
          <div className="h-56" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={eng?.points_buckets ?? []}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="bucket" tick={{ fontSize: 10 }} /><YAxis allowDecimals={false} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="users" fill={COLORS[3]} radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold mb-3 flex items-center gap-2"><LogOut className="w-4 h-4 text-destructive" /> Inactivity</p>
          <div className="space-y-2 text-sm">
            {[["Inactive 7+ days", drop?.inactive_7], ["Inactive 14+ days", drop?.inactive_14], ["Inactive 30+ days", drop?.inactive_30], ["Never active", drop?.never_active]].map(([l, v]) => (
              <div key={l as string} className="flex items-center justify-between rounded-xl border border-border/50 bg-background/40 px-3 py-2">
                <span className="text-xs text-muted-foreground">{l as string}</span>
                <span className="font-bold tabular-nums">{(v as number) ?? 0}</span>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Funnel */}
      <Card>
        <p className="text-sm font-semibold mb-3">Funnel: signup → first feature → next-day return → 7-day active</p>
        <div className="h-56" dir="ltr">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={funnel} layout="vertical" margin={{ left: 90 }}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
              <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} />
              <YAxis type="category" dataKey="step" tick={{ fontSize: 11 }} width={90} />
              <Tooltip /><Bar dataKey="value" fill={COLORS[0]} radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      {/* User lookup */}
      <Card>
        <p className="text-sm font-semibold mb-3 flex items-center gap-2"><Users className="w-4 h-4 text-primary" /> User lookup</p>
        <div className="flex gap-2">
          <input value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="Email or display name…"
            className="flex-1 rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-sm" />
          <button onClick={search} className="px-3 py-2 rounded-xl bg-primary text-primary-foreground text-sm inline-flex items-center gap-1">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} Search
          </button>
        </div>
        {users.length > 0 && (
          <div className="mt-3 space-y-2 max-h-56 overflow-auto">
            {users.map((u) => (
              <button key={u.user_id} onClick={() => openUser(u)}
                className="w-full text-start rounded-xl border border-border/50 bg-background/40 px-3 py-2 hover:border-primary/50 transition">
                <p className="text-sm font-semibold">{u.display_name || "—"} <span className="text-xs text-muted-foreground">{u.email}</span></p>
                <p className="text-[11px] text-muted-foreground">
                  source: {u.source || "unknown"} · points: {u.points} · joined {new Date(u.signed_up).toLocaleDateString()} ·
                  last seen {u.last_seen ? new Date(u.last_seen).toLocaleDateString() : "never"}
                </p>
              </button>
            ))}
          </div>
        )}
        {picked && (
          <div className="mt-4 rounded-xl border border-border/50 bg-background/40 p-3">
            <p className="text-sm font-semibold mb-2">Timeline — {picked.display_name || picked.email}</p>
            {timeline.length === 0 ? (
              <p className="text-xs text-muted-foreground">No recorded activity.</p>
            ) : (
              <ul className="space-y-1 max-h-72 overflow-auto text-xs">
                {timeline.map((t, i) => (
                  <li key={i} className="flex items-center justify-between gap-3 border-b border-border/30 py-1">
                    <span className="font-medium">{t.kind} · {t.label}</span>
                    <span className="text-muted-foreground truncate max-w-[45%]">{t.detail}</span>
                    <span className="text-muted-foreground tabular-nums">{new Date(t.at).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-2">Marketing snapshot preview</p>
        <pre className="text-[11px] whitespace-pre-wrap text-muted-foreground" dir="ltr">{snapshot}</pre>
      </Card>
    </div>
  );
};

export default AdminAnalyticsTab;
