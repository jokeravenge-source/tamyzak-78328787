import { Coins, Flame, Lock, TrendingUp } from "lucide-react";
import { POINT_RULES, STREAK_BONUSES, type UnlockAction } from "@/lib/unlocks";

const ORDER: UnlockAction[] = [
  "daily_login",
  "flashcard_session",
  "mcq_quiz",
  "ministerial_set",
  "video_to_notes",
  "accuracy_bonus",
];

/** Full "how the points system works" explanation. */
const PointsExplainer = ({ language }: { language: "en" | "ar" }) => {
  const isAr = language === "ar";
  return (
    <section className="space-y-5" dir={isAr ? "rtl" : "ltr"}>
      <div>
        <h2 className="flex items-center gap-2 text-lg font-black text-foreground">
          <Coins className="h-5 w-5 text-primary" />
          {isAr ? "كيف يعمل نظام النقاط؟" : "How the points system works"}
        </h2>
        <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
          {isAr
            ? "كل نشاط دراسي تكمله يمنحك نقاطاً تُضاف إلى رصيدك الدائم. النقاط لا تنقص أبداً، وكلما ارتفع رصيدك فُتحت لك أدوات جديدة تلقائياً."
            : "Every study action you complete grants points that add to your lifetime balance. Points never go down, and as your balance grows new tools unlock automatically."}
        </p>
      </div>

      <div className="overflow-hidden rounded-xl border border-border bg-card/60">
        <div className="grid grid-cols-[1fr_auto_auto] gap-2 border-b border-border px-4 py-2 text-[11px] uppercase tracking-wider text-muted-foreground">
          <span>{isAr ? "النشاط" : "Action"}</span>
          <span className="text-center">{isAr ? "النقاط" : "Points"}</span>
          <span className="text-center">{isAr ? "الحد اليومي" : "Daily cap"}</span>
        </div>
        {ORDER.map((a) => {
          const r = POINT_RULES[a];
          return (
            <div
              key={a}
              className="grid grid-cols-[1fr_auto_auto] items-center gap-2 border-b border-border/50 px-4 py-2.5 last:border-0"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">{isAr ? r.ar : r.en}</p>
                <p className="truncate text-xs text-muted-foreground">{isAr ? r.hintAr : r.hintEn}</p>
              </div>
              <span className="w-14 text-center font-mono text-sm font-bold tabular-nums text-primary">
                +{r.points}
              </span>
              <span className="w-16 text-center text-xs text-muted-foreground">
                {r.dailyCap}×
              </span>
            </div>
          );
        })}
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Flame className="h-4 w-4 text-primary" />
          {isAr ? "مكافآت المواظبة" : "Streak bonuses"}
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          {isAr
            ? "أي نشاط تكسب منه نقاطاً يحسب يومك. حافظ على السلسلة لتحصل على مكافآت لمرة واحدة:"
            : "Any point-earning action counts your day. Keep the streak alive for one-time bonuses:"}
        </p>
        <div className="mt-3 flex flex-wrap gap-2">
          {STREAK_BONUSES.map((s) => (
            <span
              key={s.days}
              className="rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium"
            >
              {isAr ? `${s.days} أيام` : `${s.days} days`} → +{s.bonus}
            </span>
          ))}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card/60 p-4">
        <h3 className="flex items-center gap-2 text-sm font-bold text-foreground">
          <Lock className="h-4 w-4 text-primary" />
          {isAr ? "فتح الأدوات" : "Unlocking tools"}
        </h3>
        <ul className="mt-2 space-y-1.5 text-xs text-muted-foreground">
          <li className="flex gap-2">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {isAr
              ? "كل أداة لها حد نقاط معيّن — تُفتح فوراً عند وصولك إليه وتبقى مفتوحة للأبد."
              : "Each tool has a point threshold — it opens the moment you reach it and stays open forever."}
          </li>
          <li className="flex gap-2">
            <TrendingUp className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
            {isAr
              ? "احتساب النقاط يتم على الخادم، لذلك لا يمكن التلاعب بها، والحدود اليومية تُحسب بتوقيت بغداد."
              : "Points are awarded server-side so they can't be gamed, and daily caps reset on Baghdad time."}
          </li>
        </ul>
      </div>
    </section>
  );
};

export default PointsExplainer;
