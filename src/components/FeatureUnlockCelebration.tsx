import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { toast } from "sonner";
import { Flame, Lock, Sparkles } from "lucide-react";
import { FEATURE_MENU, fetchTiers, type FeatureKey, type FeatureTier } from "@/lib/unlocks";
import { FeatureIcon } from "@/components/FeatureFacetCard";

/**
 * Listens for server-confirmed unlocks and streak bonuses and surfaces them:
 * a centred Facet-style celebration modal, plus a non-blocking streak toast.
 */
const FeatureUnlockCelebration = ({
  language,
  onOpenFeature,
}: {
  language: "en" | "ar";
  onOpenFeature?: (menu: string) => void;
}) => {
  const isAr = language === "ar";
  const [tiers, setTiers] = useState<FeatureTier[]>([]);
  const [queue, setQueue] = useState<FeatureKey[]>([]);

  useEffect(() => {
    fetchTiers().then(setTiers);
  }, []);

  useEffect(() => {
    const onUnlock = (e: Event) => {
      const keys = (e as CustomEvent).detail?.features as FeatureKey[] | undefined;
      if (keys?.length) setQueue((q) => [...q, ...keys]);
    };
    const onStreak = (e: Event) => {
      const d = (e as CustomEvent).detail as { bonus: number; streak: number };
      toast.success(
        isAr
          ? `🔥 ${d.streak} أيام متتالية! +${d.bonus} نقطة مكافأة`
          : `🔥 ${d.streak}-day streak! +${d.bonus} bonus points`,
        { duration: 6000 },
      );
    };
    window.addEventListener("app:feature-unlocked", onUnlock);
    window.addEventListener("app:streak-bonus", onStreak);
    return () => {
      window.removeEventListener("app:feature-unlocked", onUnlock);
      window.removeEventListener("app:streak-bonus", onStreak);
    };
  }, [isAr]);

  const currentKey = queue[0];
  const tier = tiers.find((t) => t.feature_key === currentKey);
  const close = () => setQueue((q) => q.slice(1));
  const menu = currentKey ? FEATURE_MENU[currentKey] : null;

  return (
    <AnimatePresence>
      {currentKey && (
        <motion.div
          key={currentKey}
          className="fixed inset-0 z-[120] flex items-center justify-center px-4 bg-background/80 backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={isAr ? "rtl" : "ltr"}
          onClick={close}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            onClick={(e) => e.stopPropagation()}
            initial={{ scale: 0.85, y: 24, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 240, damping: 20 }}
            className="relative w-full max-w-sm overflow-hidden border border-primary/40 bg-gradient-to-br from-primary/25 via-card to-accent/20 p-7 text-center shadow-[0_30px_80px_-15px_hsl(var(--primary)/0.6)]"
            style={{
              clipPath:
                "polygon(22px 0, 100% 0, 100% calc(100% - 22px), calc(100% - 22px) 100%, 0 100%, 0 22px)",
            }}
          >
            <div className="pointer-events-none absolute -top-20 -right-10 h-48 w-48 rounded-full bg-primary/30 blur-3xl" />
            {[0, 1, 2, 3].map((i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute text-primary/70"
                style={{ top: `${12 + i * 20}%`, [i % 2 ? "right" : "left"]: `${10 + i * 7}%` }}
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.5], y: [0, -18] }}
                transition={{ duration: 2.2, delay: i * 0.18, repeat: Infinity, repeatDelay: 0.5 }}
              >
                <Sparkles className="h-4 w-4" />
              </motion.span>
            ))}

            <motion.div
              initial={{ rotate: -20, scale: 0 }}
              animate={{ rotate: 0, scale: 1 }}
              transition={{ delay: 0.1, type: "spring", stiffness: 300, damping: 15 }}
              className="relative mx-auto flex h-20 w-20 items-center justify-center bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_12px_30px_-6px_hsl(var(--primary)/0.7)]"
              style={{ clipPath: "polygon(50% 0%, 96% 25%, 96% 75%, 50% 100%, 4% 75%, 4% 25%)" }}
            >
              <FeatureIcon name={tier?.icon ?? "sparkles"} className="h-9 w-9" />
            </motion.div>

            <p className="relative mt-5 text-xs font-bold uppercase tracking-[0.28em] text-primary">
              {isAr ? "تم الفتح!" : "Unlocked!"}
            </p>
            <h2 className="relative mt-2 text-2xl font-black text-foreground">
              {tier ? (isAr ? tier.display_name_ar : tier.display_name_en) : currentKey}
            </h2>
            <p className="relative mt-2 text-sm text-muted-foreground">
              {isAr
                ? `وصلت إلى ${tier?.unlock_threshold ?? 0} نقطة — الأداة صارت متاحة لك للأبد.`
                : `You reached ${tier?.unlock_threshold ?? 0} points — this tool is yours for good.`}
            </p>

            <div className="relative mt-6 flex flex-col gap-2">
              {menu && onOpenFeature && (
                <button
                  onClick={() => {
                    close();
                    onOpenFeature(menu);
                  }}
                  className="h-11 w-full bg-primary text-sm font-semibold text-primary-foreground transition-opacity hover:opacity-90"
                  style={{ clipPath: "polygon(12px 0, 100% 0, calc(100% - 12px) 100%, 0 100%)" }}
                >
                  {isAr ? "افتح الأداة الآن" : "Open the tool"}
                </button>
              )}
              <button
                onClick={close}
                className="h-10 w-full border border-border bg-card text-sm font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                {isAr ? "لاحقاً" : "Later"}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default FeatureUnlockCelebration;
export { Flame, Lock };