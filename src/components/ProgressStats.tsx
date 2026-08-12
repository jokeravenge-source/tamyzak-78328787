import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Trophy, Medal, Clock, CalendarClock } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { rankFor, RANKS } from "@/lib/points";

const SUBJECT_LABELS: Record<string, { en: string; ar: string }> = {
  islamic: { en: "Islamic", ar: "التربية الإسلامية" },
  arabic: { en: "Arabic", ar: "العربية" },
  english: { en: "English", ar: "الإنجليزية" },
  french: { en: "French", ar: "الفرنسية" },
  math: { en: "Math", ar: "الرياضيات" },
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
};

function formatHours(totalSeconds: number, isAr: boolean) {
  const hours = totalSeconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)} ${isAr ? "س" : "h"}`;
  const mins = Math.max(0, Math.round(totalSeconds / 60));
  return `${mins} ${isAr ? "د" : "m"}`;
}

const ProgressStats = ({ language }: { language: AppLanguage }) => {
  const isAr = language === "ar";
  const [loading, setLoading] = useState(true);
  const [points, setPoints] = useState(0);
  const [currentMonthPoints, setCurrentMonthPoints] = useState(0);
  const [monthlyPoints, setMonthlyPoints] = useState<{ key: string; label: string; points: number }[]>([]);
  const [subjectSeconds, setSubjectSeconds] = useState<Record<string, number>>({});
  const [todaySubjectSeconds, setTodaySubjectSeconds] = useState<Record<string, number>>({});
  const [weeklyTotals, setWeeklyTotals] = useState<{ key: string; date: Date; seconds: number }[]>([]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) { setLoading(false); return; }
      const { data: pts } = await supabase
        .from("user_points")
        .select("points, created_at")
        .eq("user_id", u.user.id);
      const all = (pts ?? []) as { points: number; created_at: string }[];
      setPoints(all.reduce((s, r) => s + (r.points ?? 0), 0));
      const byMonth = new Map<string, number>();
      all.forEach((r) => {
        if (!r.created_at) return;
        const d = new Date(new Date(r.created_at).getTime() + 3 * 3600 * 1000);
        const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
        byMonth.set(key, (byMonth.get(key) ?? 0) + (r.points ?? 0));
      });
      const nowB = new Date(Date.now() + 3 * 3600 * 1000);
      const curKey = `${nowB.getUTCFullYear()}-${String(nowB.getUTCMonth() + 1).padStart(2, "0")}`;
      setCurrentMonthPoints(byMonth.get(curKey) ?? 0);
      setMonthlyPoints(
        Array.from(byMonth.entries())
          .sort((a, b) => (a[0] < b[0] ? 1 : -1))
          .map(([key, p]) => {
            const [y, m] = key.split("-").map(Number);
            const label = new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString(isAr ? "ar-EG" : "en-US", { month: "long", year: "numeric" });
            return { key, label, points: p };
          })
      );

      const totals: Record<string, number> = {};
      const todayTotals: Record<string, number> = {};
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);
      const startMs = startOfDay.getTime();
      const dayBuckets: { key: string; date: Date; seconds: number }[] = [];
      const dayIndex: Record<string, number> = {};
      for (let i = 6; i >= 0; i--) {
        const d = new Date(startOfDay);
        d.setDate(d.getDate() - i);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
        dayIndex[key] = dayBuckets.length;
        dayBuckets.push({ key, date: d, seconds: 0 });
      }
      const weekStartMs = dayBuckets[0].date.getTime();
      const pageSize = 1000;
      let from = 0;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: page, error } = await supabase
          .from("study_sessions")
          .select("subject,duration_seconds,created_at")
          .eq("user_id", u.user.id)
          .range(from, from + pageSize - 1);
        if (error) break;
        (page ?? []).forEach((r: any) => {
          const secs = r.duration_seconds ?? 0;
          totals[r.subject] = (totals[r.subject] ?? 0) + secs;
          if (r.created_at) {
            const t = new Date(r.created_at);
            const tMs = t.getTime();
            if (tMs >= startMs) todayTotals[r.subject] = (todayTotals[r.subject] ?? 0) + secs;
            if (tMs >= weekStartMs) {
              const k = `${t.getFullYear()}-${t.getMonth() + 1}-${t.getDate()}`;
              const idx = dayIndex[k];
              if (idx !== undefined) dayBuckets[idx].seconds += secs;
            }
          }
        });
        if (!page || page.length < pageSize) break;
        from += pageSize;
      }
      setSubjectSeconds(totals);
      setTodaySubjectSeconds(todayTotals);
      setWeeklyTotals(dayBuckets);
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rank = rankFor(points);
  const nextRank = RANKS.find((r) => r.min > points);
  const toNext = nextRank ? nextRank.min - points : 0;

  if (loading) return null;

  return (
    <div className="space-y-5">
      {/* Points + rank */}
      <div className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-secondary/60 to-accent/15 backdrop-blur-xl p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">{isAr ? "نقاطك" : "Your Points"}</p>
            <p className="text-5xl font-bold gradient-text leading-none">{points}</p>
          </div>
          <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
            <Trophy className="w-7 h-7 text-primary" />
          </div>
        </div>
        <div className="mt-4 flex items-center justify-between">
          <span
            className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold"
            style={{ backgroundColor: `${rank.color}22`, color: rank.color, border: `1px solid ${rank.color}66` }}
          >
            <Medal className="w-3.5 h-3.5" />
            {isAr ? rank.label.ar : rank.label.en}
          </span>
          {nextRank && (
            <span className="text-xs text-muted-foreground">
              {toNext} {isAr ? "للمرتبة التالية" : "to next rank"} ({isAr ? nextRank.label.ar : nextRank.label.en})
            </span>
          )}
        </div>
        <div className="mt-4 pt-4 border-t border-white/10 flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">
              {isAr ? "هذا الشهر (المتصدرون)" : "This month (leaderboard)"}
            </p>
            <p className="text-2xl font-bold gradient-text leading-none mt-1">{currentMonthPoints}</p>
          </div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground max-w-[55%] text-right">
            {isAr
              ? "تُصفَّر المتصدرون بداية كل شهر — أرشيفك محفوظ بالأسفل."
              : "Leaderboard resets on the 1st of each month — your history is saved below."}
          </p>
        </div>
      </div>

      {/* Monthly history */}
      {monthlyPoints.length > 0 && (
        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <CalendarClock className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{isAr ? "أرشيف النقاط الشهري" : "Monthly Points History"}</h2>
              <p className="text-xs text-muted-foreground">{isAr ? "كم نقطة جمعت في كل شهر" : "How many points you earned each month"}</p>
            </div>
          </div>
          <ul className="space-y-2">
            {monthlyPoints.map((m) => (
              <li key={m.key} className="flex items-center justify-between rounded-2xl border border-white/5 bg-background/30 px-4 py-3">
                <span className="text-sm font-medium">{m.label}</span>
                <span className="text-lg font-bold gradient-text">{m.points}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Today + 7 day trend */}
      <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{isAr ? "اليوم" : "Today"}</h2>
            <p className="text-xs text-muted-foreground">{isAr ? "ساعاتك اليوم لكل مادة" : "Your hours today per subject"}</p>
          </div>
          <div className="ms-auto text-right">
            <p className="text-2xl font-bold gradient-text leading-none">
              {formatHours(Object.values(todaySubjectSeconds).reduce((s, n) => s + n, 0), isAr)}
            </p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">{isAr ? "إجمالي" : "Total"}</p>
          </div>
        </div>
        {Object.keys(todaySubjectSeconds).length === 0 ? (
          <p className="text-sm text-muted-foreground">{isAr ? "لم تدرس بعد اليوم." : "No study time today yet."}</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(todaySubjectSeconds)
              .sort((a, b) => b[1] - a[1])
              .map(([subj, secs]) => {
                const meta = SUBJECT_LABELS[subj];
                const label = meta ? (isAr ? meta.ar : meta.en) : subj;
                return (
                  <li key={subj} className="flex items-center justify-between rounded-xl border border-white/5 bg-background/30 px-3 py-2.5">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                      {formatHours(secs, isAr)}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}

        <div className="mt-5 pt-5 border-t border-white/10">
          <div className="flex items-end justify-between mb-3">
            <div>
              <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{isAr ? "آخر 7 أيام" : "Last 7 days"}</p>
              <p className="text-xs text-muted-foreground/80 mt-0.5">{isAr ? "اتجاه ساعات الدراسة" : "Study hours trend"}</p>
            </div>
            <p className="text-sm font-mono text-primary">{formatHours(weeklyTotals.reduce((s, d) => s + d.seconds, 0), isAr)}</p>
          </div>
          {(() => {
            const max = Math.max(1, ...weeklyTotals.map((d) => d.seconds));
            const dayNames = isAr
              ? ["أحد", "إثن", "ثلا", "أرب", "خمي", "جمع", "سبت"]
              : ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
            return (
              <div className="flex items-end justify-between gap-1.5 h-28">
                {weeklyTotals.map((d, i) => {
                  const pct = (d.seconds / max) * 100;
                  const isToday = i === weeklyTotals.length - 1;
                  const hrs = d.seconds / 3600;
                  const label = hrs >= 1 ? `${hrs.toFixed(1)}h` : `${Math.round(d.seconds / 60)}m`;
                  return (
                    <div key={d.key} className="flex-1 flex flex-col items-center gap-1.5">
                      <span className="text-[9px] font-mono text-muted-foreground tabular-nums">{d.seconds > 0 ? label : ""}</span>
                      <div className="w-full flex-1 flex items-end">
                        <div
                          className={`w-full rounded-md transition-all ${isToday ? "bg-gradient-to-t from-primary to-primary/60 shadow-[0_0_12px_hsl(var(--primary)/0.4)]" : "bg-primary/30"}`}
                          style={{ height: `${Math.max(pct, d.seconds > 0 ? 6 : 2)}%` }}
                          title={label}
                        />
                      </div>
                      <span className={`text-[10px] ${isToday ? "text-primary font-semibold" : "text-muted-foreground"}`}>
                        {dayNames[d.date.getDay()]}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}
        </div>
      </div>

      {/* All-time hours */}
      <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <Clock className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">{isAr ? "إجمالي ساعات الدراسة" : "All-time Study Hours"}</h2>
            <p className="text-xs text-muted-foreground">{isAr ? "إجمالي وقتك لكل مادة" : "Your total time per subject"}</p>
          </div>
        </div>
        {Object.keys(subjectSeconds).length === 0 ? (
          <p className="text-sm text-muted-foreground">{isAr ? "لا توجد جلسات بعد. ابدأ جلسة دراسة!" : "No sessions yet. Start a study session!"}</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(subjectSeconds)
              .sort((a, b) => b[1] - a[1])
              .map(([subj, secs]) => {
                const meta = SUBJECT_LABELS[subj];
                const label = meta ? (isAr ? meta.ar : meta.en) : subj;
                return (
                  <li key={subj} className="flex items-center justify-between rounded-xl border border-white/5 bg-background/30 px-3 py-2.5">
                    <span className="text-sm font-medium">{label}</span>
                    <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                      {formatHours(secs, isAr)}
                    </span>
                  </li>
                );
              })}
          </ul>
        )}
      </div>
    </div>
  );
};

export default ProgressStats;
