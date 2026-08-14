import { useMemo } from "react";
import { ResponsiveContainer, PieChart, Pie, Cell, Tooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid } from "recharts";
import { Coins, AlertTriangle, Download } from "lucide-react";
import { toast } from "sonner";
import { CREDITS_SNAPSHOT as S, categorize, type CreditCategory } from "@/data/creditUsageSnapshot";

const COLORS = ["hsl(var(--primary))", "#f59e0b", "#22d3ee", "#a78bfa", "#94a3b8", "#ef4444"];

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={`rounded-2xl border border-border/60 bg-card/70 backdrop-blur-xl p-4 shadow-[var(--shadow-card)] ${className}`}>{children}</div>
);

const Kpi = ({ label, value, sub }: { label: string; value: string; sub?: string }) => (
  <Card>
    <p className="text-xs text-muted-foreground">{label}</p>
    <p className="text-2xl font-bold tabular-nums mt-1">{value}</p>
    {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
  </Card>
);

const fmt = (n: number) => n.toFixed(2);

const AdminCreditsTab = () => {
  const byCategory = useMemo(() => {
    const map = new Map<CreditCategory, number>();
    S.items.forEach((i) => map.set(categorize(i.item), (map.get(categorize(i.item)) ?? 0) + i.credits));
    return Array.from(map, ([name, credits]) => ({ name, credits: Math.round(credits * 100) / 100 }))
      .sort((a, b) => b.credits - a.credits);
  }, []);

  const items = useMemo(() => [...S.items].sort((a, b) => b.credits - a.credits), []);
  const pct = (n: number) => Math.round((n / S.periodUsed) * 1000) / 10;

  const exportCsv = () => {
    const csv = ["item,category,credits,percent_of_period"]
      .concat(items.map((i) => `"${i.item}",${categorize(i.item)},${i.credits},${pct(i.credits)}`))
      .join("\n");
    const a = document.createElement("a");
    a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    a.download = `tamyzak-credits-${S.capturedAt}.csv`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Credits CSV exported");
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-lg font-bold flex items-center gap-2"><Coins className="w-4 h-4 text-primary" /> Credits</h3>
          <p className="text-xs text-muted-foreground">
            Billing period {S.periodStart} → {S.periodEnd} · snapshot captured {S.capturedAt}
          </p>
        </div>
        <button onClick={exportCsv} className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-primary text-primary-foreground inline-flex items-center gap-1">
          <Download className="w-3 h-3" /> Export CSV
        </button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Kpi label="Used this period" value={fmt(S.periodUsed)} sub="credits" />
        <Kpi label="Remaining now" value={fmt(S.totalRemaining)} sub={`daily ${fmt(S.dailyRemaining)} / ${S.dailyGrant}`} />
        <Kpi label="Total granted" value={fmt(S.totalGranted)} sub="all grant types" />
        <Kpi label="Biggest cost" value={byCategory[0]?.name ?? "—"} sub={`${fmt(byCategory[0]?.credits ?? 0)} credits · ${pct(byCategory[0]?.credits ?? 0)}%`} />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card>
          <p className="text-sm font-semibold mb-3">Where credits go (by category)</p>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={byCategory} dataKey="credits" nameKey="name" innerRadius={45} outerRadius={85} paddingAngle={2}>
                  {byCategory.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                </Pie>
                <Tooltip /><Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card>
          <p className="text-sm font-semibold mb-3">Top cost drivers</p>
          <div className="h-64" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={items.slice(0, 8).map((i) => ({ name: i.item.replace("AI Gateway ", "").slice(0, 28), credits: Math.round(i.credits * 100) / 100 }))} layout="vertical" margin={{ left: 110 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis type="number" tick={{ fontSize: 10 }} />
                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                <Tooltip /><Bar dataKey="credits" fill={COLORS[0]} radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card>
        <p className="text-sm font-semibold mb-3">Grant balances</p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {S.grants.map((g) => (
            <div key={g.key} className="rounded-xl border border-border/50 bg-background/40 px-3 py-2">
              <p className="text-[11px] text-muted-foreground capitalize">{g.key}</p>
              <p className="text-sm font-bold tabular-nums">{fmt(g.remaining)} / {fmt(g.granted)}</p>
              <div className="h-1.5 rounded-full bg-muted mt-2 overflow-hidden">
                <div className="h-full bg-primary" style={{ width: `${Math.min(100, (g.remaining / Math.max(g.granted, 1)) * 100)}%` }} />
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card>
        <p className="text-sm font-semibold mb-3">Every billable item</p>
        <div className="max-h-96 overflow-auto text-xs">
          <table className="w-full">
            <thead className="text-muted-foreground sticky top-0 bg-card/95">
              <tr><th className="text-start py-1">Item</th><th className="text-start">Category</th><th className="text-start">Credits</th><th className="text-start">% of period</th></tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={i.item} className="border-t border-border/40">
                  <td className="py-1 pe-2">{i.item}</td>
                  <td>{categorize(i.item)}</td>
                  <td className="tabular-nums">{i.credits.toFixed(3)}</td>
                  <td className="tabular-nums">{pct(i.credits)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card className="border-amber-500/40">
        <p className="text-sm font-semibold mb-2 flex items-center gap-2"><AlertTriangle className="w-4 h-4 text-amber-500" /> What is eating the credits</p>
        <ul className="text-xs text-muted-foreground space-y-1 list-disc ps-5">
          <li><strong>Cloud realtime ({pct(243.391159785)}%)</strong> — live study rooms, chat and presence subscriptions. Biggest single driver.</li>
          <li><strong>Build mode messages ({pct(182)}%)</strong> — editing the app with the assistant.</li>
          <li><strong>Cloud egress + compute ({pct(29.912991274 + 12.381936)}%)</strong> — data served to clients, mainly PDFs, images and heavy queries.</li>
          <li><strong>AI models ({pct(byCategory.find((c) => c.name === "AI models")?.credits ?? 0)}%)</strong> — grading, MCQ generation, tutor and notes.</li>
        </ul>
        <p className="text-[11px] text-muted-foreground mt-2">
          Lovable billing data can't be read from the app, so this page reads a stored snapshot. Ask the assistant to "refresh the credits snapshot" to update the numbers.
        </p>
      </Card>
    </div>
  );
};

export default AdminCreditsTab;
