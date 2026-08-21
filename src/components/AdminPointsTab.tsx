import { useCallback, useEffect, useState } from "react";
import { Coins, Loader2, RefreshCw, Search, Plus, Download, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip } from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { readDaily, writeDaily } from "@/lib/dailyCache";

type Overview = {
  total_points: number;
  total_entries: number;
  points_today: number;
  points_week: number;
  by_source: { source: string; points: number; entries: number; users: number }[];
  by_day: { day: string; points: number }[];
  top_users: { user_id: string; points: number; entries: number; display_name: string; email: string | null }[];
};

type Detail = {
  user_id: string;
  display_name: string;
  email: string | null;
  lifetime_points: number;
  sum_points: number;
  by_source: { source: string; points: number; entries: number }[];
  entries: { id: string; source: string; points: number; ref_id: string | null; created_at: string }[];
};

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 shadow-[var(--shadow-card)] ${className}`}>{children}</div>
);

const Kpi = ({ label, value }: { label: string; value: string | number }) => (
  <Card>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
  </Card>
);

const AdminPointsTab = () => {
  const [data, setData] = useState<Overview | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [cachedDay, setCachedDay] = useState(false);

  const [query, setQuery] = useState("");
  const [results, setResults] = useState<{ user_id: string; email: string; display_name: string | null; points: number }[]>([]);
  const [searching, setSearching] = useState(false);

  const [detail, setDetail] = useState<Detail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const [grantAmount, setGrantAmount] = useState("");
  const [grantReason, setGrantReason] = useState("");
  const [granting, setGranting] = useState(false);

  const load = useCallback(async (force = false) => {
    if (!force) {
      const cached = readDaily<Overview>("admin_points_overview");
      if (cached) { setData(cached); setCachedDay(true); setLoading(false); return; }
    }
    const { data: res, error } = await supabase.rpc("admin_points_overview", { _limit: 50 });
    if (error) { toast.error(error.message); setLoading(false); return; }
    const ov = res as unknown as Overview;
    setData(ov);
    writeDaily("admin_points_overview", ov);
    setCachedDay(!force);
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const search = async () => {
    if (query.trim().length < 2) return;
    setSearching(true);
    const { data: res, error } = await supabase.rpc("admin_analytics_search_users", { _q: query.trim() });
    setSearching(false);
    if (error) { toast.error(error.message); return; }
    setResults((res ?? []) as any);
  };

  const openUser = async (userId: string) => {
    setDetailLoading(true);
    const { data: res, error } = await supabase.rpc("admin_points_user_detail", { _user_id: userId, _limit: 200 });
    setDetailLoading(false);
    if (error) { toast.error(error.message); return; }
    setDetail(res as unknown as Detail);
  };

  const grant = async () => {
    if (!detail) return;
    const amount = parseInt(grantAmount, 10);
    if (!Number.isFinite(amount) || amount === 0) { toast.error("أدخل عدد نقاط صحيح"); return; }
    setGranting(true);
    const { error } = await supabase.rpc("admin_grant_points", {
      _user_id: detail.user_id,
      _points: amount,
      _reason: grantReason.trim() || null,
    });
    setGranting(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`تم ${amount > 0 ? "إضافة" : "خصم"} ${Math.abs(amount)} نقطة`);
    setGrantAmount(""); setGrantReason("");
    openUser(detail.user_id);
  };

  const exportCsv = () => {
    if (!detail) return;
    const csv = ["created_at,source,points,ref_id"]
      .concat(detail.entries.map((e) => `${e.created_at},${e.source},${e.points},"${e.ref_id ?? ""}"`))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `points-${detail.display_name}.csv`;
    a.click();
  };

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;

  if (detail) {
    return (
      <div className="space-y-4">
        <button onClick={() => setDetail(null)} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-4 h-4" /> رجوع
        </button>

        <Card>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-bold text-lg">{detail.display_name}</p>
              <p className="text-xs text-muted-foreground">{detail.email}</p>
            </div>
            <div className="flex gap-6 text-right">
              <div>
                <p className="text-xs text-muted-foreground">مجموع السجلات</p>
                <p className="text-xl font-bold tabular-nums">{detail.sum_points}</p>
              </div>
              <div>
                <p className="text-xs text-muted-foreground">النقاط الحالية</p>
                <p className="text-xl font-bold tabular-nums text-primary">{detail.lifetime_points}</p>
              </div>
            </div>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3">إضافة / خصم نقاط</p>
          <div className="flex flex-wrap gap-2">
            <input value={grantAmount} onChange={(e) => setGrantAmount(e.target.value)} placeholder="مثال: 50 أو 50-"
              className="w-32 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm" />
            <input value={grantReason} onChange={(e) => setGrantReason(e.target.value)} placeholder="السبب (اختياري)"
              className="flex-1 min-w-[180px] px-3 py-2 rounded-xl bg-background border border-border/60 text-sm" />
            <button onClick={grant} disabled={granting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-primary-foreground text-sm font-medium disabled:opacity-60">
              {granting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />} تطبيق
            </button>
          </div>
        </Card>

        <Card>
          <p className="text-sm font-semibold mb-3">مصادر النقاط</p>
          <div className="flex flex-wrap gap-2">
            {detail.by_source.map((s) => (
              <span key={s.source} className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 border border-border/60">
                {s.source} · <b className="tabular-nums">{s.points}</b> ({s.entries})
              </span>
            ))}
          </div>
        </Card>

        <Card>
          <div className="flex items-center justify-between mb-3">
            <p className="text-sm font-semibold">سجل النقاط (آخر 200)</p>
            <button onClick={exportCsv} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <Download className="w-3.5 h-3.5" /> CSV
            </button>
          </div>
          <div className="max-h-[420px] overflow-auto">
            <table className="w-full text-sm">
              <thead className="text-xs text-muted-foreground sticky top-0 bg-card">
                <tr><th className="text-right py-2">التاريخ</th><th className="text-right">المصدر</th><th className="text-right">النقاط</th><th className="text-right">المرجع</th></tr>
              </thead>
              <tbody>
                {detail.entries.map((e) => (
                  <tr key={e.id} className="border-t border-border/40">
                    <td className="py-2 text-xs text-muted-foreground">{new Date(e.created_at).toLocaleString()}</td>
                    <td className="text-xs">{e.source}</td>
                    <td className={`tabular-nums font-semibold ${e.points < 0 ? "text-destructive" : "text-primary"}`}>{e.points > 0 ? `+${e.points}` : e.points}</td>
                    <td className="text-[11px] text-muted-foreground truncate max-w-[220px]">{e.ref_id ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="inline-flex items-center gap-2 text-sm text-muted-foreground">
          <Coins className="w-4 h-4 text-primary" />
          {cachedDay ? "بيانات محفوظة لهذا اليوم (تحدّث مرة واحدة يومياً)" : "بيانات محدّثة الآن"}
        </p>
        <button onClick={async () => { setRefreshing(true); await load(true); setRefreshing(false); }}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground">
          <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? "animate-spin" : ""}`} /> تحديث
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="إجمالي النقاط" value={data?.total_points ?? 0} />
        <Kpi label="عدد السجلات" value={data?.total_entries ?? 0} />
        <Kpi label="نقاط اليوم" value={data?.points_today ?? 0} />
        <Kpi label="نقاط الأسبوع" value={data?.points_week ?? 0} />
      </div>

      <Card>
        <p className="text-sm font-semibold mb-3">النقاط حسب المصدر</p>
        <div className="h-64">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.by_source ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="source" tick={{ fontSize: 10 }} interval={0} angle={-30} textAnchor="end" height={60} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="points" fill="hsl(var(--primary))" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-3">آخر 30 يوم</p>
        <div className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data?.by_day ?? []}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="day" tick={{ fontSize: 9 }} />
              <YAxis tick={{ fontSize: 10 }} />
              <Tooltip />
              <Bar dataKey="points" fill="#f59e0b" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-3">بحث عن طالب (لإضافة نقاط أو تتبعها)</p>
        <div className="flex gap-2">
          <input value={query} onChange={(e) => setQuery(e.target.value)} onKeyDown={(e) => e.key === "Enter" && search()}
            placeholder="الاسم أو البريد الإلكتروني"
            className="flex-1 px-3 py-2 rounded-xl bg-background border border-border/60 text-sm" />
          <button onClick={search} disabled={searching}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-secondary text-sm">
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />} بحث
          </button>
        </div>
        {results.length > 0 && (
          <ul className="mt-3 space-y-1">
            {results.map((r) => (
              <li key={r.user_id}>
                <button onClick={() => openUser(r.user_id)}
                  className="w-full text-right px-3 py-2 rounded-xl hover:bg-secondary/60 flex items-center justify-between gap-3">
                  <span className="text-sm truncate">{r.display_name || "Student"} <span className="text-xs text-muted-foreground">{r.email}</span></span>
                  <span className="text-sm font-bold tabular-nums text-primary">{r.points}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-3">أعلى 50 طالب</p>
        {detailLoading && <Loader2 className="w-4 h-4 animate-spin text-primary mb-2" />}
        <ol className="space-y-1">
          {(data?.top_users ?? []).map((u, i) => (
            <li key={u.user_id}>
              <button onClick={() => openUser(u.user_id)}
                className="w-full px-3 py-2 rounded-xl hover:bg-secondary/60 flex items-center gap-3">
                <span className="w-6 text-xs text-muted-foreground">#{i + 1}</span>
                <span className="flex-1 text-right text-sm truncate">{u.display_name} <span className="text-xs text-muted-foreground">{u.email}</span></span>
                <span className="text-xs text-muted-foreground">{u.entries} سجل</span>
                <span className="text-sm font-bold tabular-nums text-primary w-14 text-left">{u.points}</span>
              </button>
            </li>
          ))}
        </ol>
      </Card>
    </div>
  );
};

export default AdminPointsTab;
