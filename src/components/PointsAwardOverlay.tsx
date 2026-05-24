import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Trophy, Sparkles } from "lucide-react";
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
          initial={{ opacity: 0, y: -40, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -30, scale: 0.95 }}
          transition={{ type: "spring", stiffness: 280, damping: 24 }}
          className="fixed top-6 left-1/2 -translate-x-1/2 z-[100] pointer-events-none"
          dir={isAr ? "rtl" : "ltr"}
        >
          <div className="relative w-[min(380px,calc(100vw-2rem))] rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-secondary/95 to-accent/20 backdrop-blur-xl p-5 shadow-[0_20px_60px_hsl(var(--primary)/0.45)]">
            <div className="absolute -top-3 -right-3">
              <motion.div
                initial={{ rotate: -20, scale: 0 }}
                animate={{ rotate: 0, scale: 1 }}
                transition={{ delay: 0.1, type: "spring", stiffness: 300 }}
                className="w-12 h-12 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg"
              >
                <Trophy className="w-6 h-6" />
              </motion.div>
            </div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary font-semibold mb-2">
              <Sparkles className="w-3.5 h-3.5" />
              {isAr ? "تهانينا!" : "Congratulations!"}
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              {isAr ? COPY[current.source].ar : COPY[current.source].en}
            </p>
            <p className="text-sm text-muted-foreground">
              {isAr ? "لقد ربحت" : "You earned"}{" "}
              <span className="text-primary font-bold text-lg">+{current.points}</span>{" "}
              {isAr ? "نقطة" : "points"}
            </p>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default PointsAwardOverlay;