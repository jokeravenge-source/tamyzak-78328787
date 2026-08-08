import { motion } from "framer-motion";
import { Calculator, Lock, Network, Notebook, PenTool, Sparkles, type LucideIcon } from "lucide-react";
import type { FeatureTier } from "@/lib/unlocks";

const ICONS: Record<string, LucideIcon> = {
  network: Network,
  notebook: Notebook,
  "pen-tool": PenTool,
  calculator: Calculator,
  sparkles: Sparkles,
};

export const FeatureIcon = ({ name, className }: { name: string; className?: string }) => {
  const Icon = ICONS[name] ?? Sparkles;
  return <Icon className={className} />;
};

/** Angular cut-gem card in the Facet visual language: dimmed while locked. */
const FeatureFacetCard = ({
  tier,
  language,
  lifetimePoints,
  unlocked,
  highlighted = false,
  onOpen,
}: {
  tier: FeatureTier;
  language: "en" | "ar";
  lifetimePoints: number;
  unlocked: boolean;
  highlighted?: boolean;
  onOpen?: () => void;
}) => {
  const isAr = language === "ar";
  const name = isAr ? tier.display_name_ar : tier.display_name_en;
  const remaining = Math.max(0, tier.unlock_threshold - lifetimePoints);
  const pct = Math.min(100, Math.round((lifetimePoints / tier.unlock_threshold) * 100));
  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className={`relative overflow-hidden border p-5 transition-colors ${
        unlocked
          ? "border-primary/50 bg-gradient-to-br from-primary/20 via-card to-accent/15"
          : "border-border/70 bg-card/60"
      } ${highlighted ? "ring-2 ring-primary shadow-[0_0_40px_-8px_hsl(var(--primary)/0.6)]" : ""}`}
      style={{
        clipPath:
          "polygon(20px 0, 100% 0, 100% calc(100% - 20px), calc(100% - 20px) 100%, 0 100%, 0 20px)",
      }}
    >
      {unlocked && (
        <div className="pointer-events-none absolute -top-16 -right-10 h-40 w-40 rounded-full bg-primary/25 blur-3xl" />
      )}
      <div className="relative flex items-start gap-4">
        <div
          className={`flex h-14 w-14 shrink-0 items-center justify-center ${
            unlocked
              ? "bg-gradient-to-br from-primary to-accent text-primary-foreground"
              : "bg-muted text-muted-foreground"
          }`}
          style={{ clipPath: "polygon(50% 0%, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%)" }}
        >
          {unlocked ? (
            <FeatureIcon name={tier.icon} className="h-6 w-6" />
          ) : (
            <Lock className="h-5 w-5" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-baseline justify-between gap-2">
            <h3
              className={`truncate text-base font-bold ${
                unlocked ? "text-foreground" : "text-muted-foreground"
              }`}
            >
              {name}
            </h3>
            <span className="shrink-0 font-mono text-xs tabular-nums text-muted-foreground">
              {Math.min(lifetimePoints, tier.unlock_threshold)}/{tier.unlock_threshold}
            </span>
          </div>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-muted">
            <motion.div
              className={`h-full rounded-full ${
                unlocked ? "bg-gradient-to-r from-primary to-accent" : "bg-primary/50"
              }`}
              initial={{ width: 0 }}
              animate={{ width: `${pct}%` }}
              transition={{ duration: 0.8, ease: "easeOut" }}
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            {unlocked
              ? isAr
                ? "مفتوحة — استمتع بها"
                : "Unlocked — enjoy it"
              : isAr
                ? `${remaining} نقطة للفتح`
                : `${remaining} points to unlock`}
          </p>
          {unlocked && onOpen && (
            <button
              onClick={onOpen}
              className="mt-3 h-9 px-4 bg-primary text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              style={{ clipPath: "polygon(10px 0, 100% 0, calc(100% - 10px) 100%, 0 100%)" }}
            >
              {isAr ? "افتح" : "Open"}
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default FeatureFacetCard;