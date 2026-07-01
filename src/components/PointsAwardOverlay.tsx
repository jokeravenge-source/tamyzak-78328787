import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Sparkles, Star } from "lucide-react";
import { POINT_VALUES, type PointSource, checkUnseenAwards } from "@/lib/points";

const COPY: Record<PointSource, { en: string; ar: string }> = {
  summary:   { en: "Your summary was approved!",     ar: "تمت الموافقة على ملخصك!" },
  flashcard: { en: "Great work on those flashcards!", ar: "أحسنت في البطاقات!" },
  mcq:       { en: "Perfect score on the quiz!",      ar: "علامة كاملة في الاختبار!" },
  essay:     { en: "Perfect score on the essay!",     ar: "علامة كاملة في المقال!" },
};

type Item = { id: string; source: PointSource; points: number };

const PointsAwardOverlay = ({ language }: { language: "en" | "ar" }) => {
  const [queue, setQueue] = useState<Item[]>([]);

  useEffect(() => {
    const handler = (e: Event) => {
      const d = (e as CustomEvent).detail as { source: PointSource; points: number };
      setQueue((q) => [...q, { id: crypto.randomUUID(), source: d.source, points: d.points }]);
    };
    window.addEventListener("app:point-award", handler);
    // Check for awards earned while user was away
    const t = setTimeout(() => checkUnseenAwards(), 1200);
    return () => { window.removeEventListener("app:point-award", handler); clearTimeout(t); };
  }, []);

  useEffect(() => {
    if (!queue.length) return;
    const t = setTimeout(() => setQueue((q) => q.slice(1)), 3500);
    return () => clearTimeout(t);
  }, [queue]);

  const current = queue[0];
  const isAr = language === "ar";

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: -30, scale: 0.85 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -20, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 260, damping: 22 }}
          className="fixed left-1/2 -translate-x-1/2 z-[100] pointer-events-none px-3"
          style={{ top: "max(1rem, env(safe-area-inset-top))" }}
          dir={isAr ? "rtl" : "ltr"}
        >
          <div className="relative w-[min(400px,calc(100vw-1.5rem))] overflow-hidden rounded-[28px] border border-primary/40 bg-gradient-to-br from-primary/25 via-background/90 to-accent/25 backdrop-blur-2xl p-4 sm:p-5 shadow-[0_25px_70px_-10px_hsl(var(--primary)/0.55)]">
            {/* Glow orbs */}
            <div className="pointer-events-none absolute -top-16 -right-10 w-40 h-40 rounded-full bg-primary/30 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-16 -left-10 w-40 h-40 rounded-full bg-accent/25 blur-3xl" />

            {/* Floating sparkles */}
            {[0, 1, 2].map((i) => (
              <motion.span
                key={i}
                className="pointer-events-none absolute text-primary/70"
                style={{
                  top: `${15 + i * 22}%`,
                  [i % 2 ? "right" : "left"]: `${8 + i * 10}%`,
                }}
                initial={{ opacity: 0, scale: 0, y: 6 }}
                animate={{ opacity: [0, 1, 0], scale: [0.4, 1, 0.6], y: [-2, -12, -20] }}
                transition={{ duration: 2.4, delay: 0.15 + i * 0.15, repeat: Infinity, repeatDelay: 0.4 }}
              >
                <Sparkles className="w-3 h-3" />
              </motion.span>
            ))}

            <div className="relative flex items-center gap-3 sm:gap-4">
              <motion.div
                initial={{ rotate: -25, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.08, type: "spring", stiffness: 320, damping: 16 }}
                className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl bg-gradient-to-br from-primary to-accent text-primary-foreground flex items-center justify-center shadow-[0_10px_25px_-5px_hsl(var(--primary)/0.7)] ring-2 ring-primary/30"
              >
                <Trophy className="w-7 h-7 sm:w-8 sm:h-8 drop-shadow" />
              </motion.div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5 text-[10px] sm:text-xs uppercase tracking-[0.22em] text-primary font-bold mb-1">
                  <Star className="w-3 h-3 fill-current" />
                  <span className="truncate">{isAr ? "تهانينا!" : "Congratulations!"}</span>
                </div>
                <p className="text-sm sm:text-base font-semibold text-foreground leading-snug line-clamp-2">
                  {(() => {
                    const c = COPY[current.source] ?? { en: "Nice work!", ar: "أحسنت!" };
                    return isAr ? c.ar : c.en;
                  })()}
                </p>
                <div className="mt-1.5 flex items-baseline gap-1.5 flex-wrap">
                  <motion.span
                    initial={{ scale: 0.6, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.25, type: "spring", stiffness: 260 }}
                    className="text-2xl sm:text-3xl font-black bg-gradient-to-br from-primary to-accent bg-clip-text text-transparent leading-none"
                  >
                    +{current.points}
                  </motion.span>
                  <span className="text-xs sm:text-sm text-muted-foreground">
                    {isAr ? "نقطة" : "points"}
                  </span>
                </div>
              </div>
            </div>

            {/* Progress bar shimmer */}
            <motion.div
              className="absolute bottom-0 left-0 h-[3px] bg-gradient-to-r from-primary via-accent to-primary rounded-b-[28px]"
              initial={{ width: "100%" }}
              animate={{ width: "0%" }}
              transition={{ duration: 3.4, ease: "linear" }}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PointsAwardOverlay;