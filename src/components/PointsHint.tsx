import { Coins } from "lucide-react";
import { POINT_RULES, type UnlockAction } from "@/lib/unlocks";

/**
 * Small inline badge telling the user exactly how many points this feature grants.
 * Pass `bonus` to also mention the 80% accuracy bonus.
 */
const PointsHint = ({
  action,
  language,
  bonus = false,
  className = "",
}: {
  action: UnlockAction;
  language: "en" | "ar";
  bonus?: boolean;
  className?: string;
}) => {
  const isAr = language === "ar";
  const rule = POINT_RULES[action];
  const acc = POINT_RULES.accuracy_bonus;
  const main = isAr
    ? `+${rule.points} نقطة — ${rule.hintAr}`
    : `+${rule.points} points — ${rule.hintEn}`;
  const bonusText = bonus
    ? isAr
      ? ` (+${acc.points} إضافية عند ٨٠٪ فأكثر)`
      : ` (+${acc.points} more at 80%+)`
    : "";
  const cap = isAr
    ? `حتى ${rule.dailyCap} ${rule.dailyCap === 1 ? "مرة" : "مرات"} يومياً`
    : `up to ${rule.dailyCap}×/day`;
  return (
    <div
      className={
        "inline-flex flex-wrap items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 text-xs font-medium text-foreground " +
        className
      }
      dir={isAr ? "rtl" : "ltr"}
    >
      <Coins className="h-3.5 w-3.5 shrink-0 text-primary" />
      <span>
        {main}
        {bonusText}
      </span>
      <span className="text-muted-foreground">· {cap}</span>
    </div>
  );
};

export default PointsHint;
