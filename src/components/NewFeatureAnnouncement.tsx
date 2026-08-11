import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Sparkles, X } from "lucide-react";

export type FeatureAnnouncement = {
  /** Unique id — bump it to re-show a card. */
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
};

/**
 * Add one entry here every time a new feature ships.
 * Each card is shown once per user (tracked in localStorage by `id`).
 */
export const FEATURE_ANNOUNCEMENTS: FeatureAnnouncement[] = [
  {
    id: "join-tamayzak-2026-08",
    titleAr: "انضم الى تميزك",
    titleEn: "Join Tamayzak",
    descAr: "صار بإمكانك التسجيل معنا مباشرة من التطبيق — املأ اسمك ومعرف تيليجرام واسم مدرّسك وسنتواصل معك.",
    descEn: "You can now sign up straight from the app — fill in your name, Telegram handle and teacher, and we'll reach out.",
  },
  {
    id: "canvas-notes-free-2026-08",
    titleAr: "اللوحة والملاحظات مفتوحة للجميع",
    titleEn: "Canvas & Notes unlocked",
    descAr: "لم تعد بحاجة إلى نقاط — استخدم اللوحة والملاحظات مجاناً الآن.",
    descEn: "No points needed anymore — use Canvas and Notes for free.",
  },
];

const KEY = "seen_feature_announcements_v1";

function readSeen(): string[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]") as string[];
  } catch {
    return [];
  }
}

const NewFeatureAnnouncement = ({ language }: { language: "en" | "ar" }) => {
  const isAr = language === "ar";
  const [queue, setQueue] = useState<FeatureAnnouncement[]>([]);

  useEffect(() => {
    const seen = readSeen();
    setQueue(FEATURE_ANNOUNCEMENTS.filter((f) => !seen.includes(f.id)));
  }, []);

  const current = queue[0];
  const dismiss = () => {
    if (!current) return;
    try {
      localStorage.setItem(KEY, JSON.stringify([...readSeen(), current.id]));
    } catch {
      /* ignore */
    }
    setQueue((q) => q.slice(1));
  };

  return (
    <AnimatePresence>
      {current && (
        <motion.div
          className="fixed inset-0 z-[90] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          dir={isAr ? "rtl" : "ltr"}
        >
          <div className="absolute inset-0 bg-background/70 backdrop-blur-sm" onClick={dismiss} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.96 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-md rounded-3xl border border-primary/40 bg-card/95 p-7 text-center shadow-[var(--shadow-glow)]"
          >
            <button
              onClick={dismiss}
              aria-label={isAr ? "إغلاق" : "Close"}
              className="absolute top-3 end-3 text-muted-foreground hover:text-foreground transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15">
              <Sparkles className="h-7 w-7 text-primary" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground">
              {isAr ? "ميزة جديدة" : "New feature"}
            </p>
            <h2 className="mt-2 text-2xl font-bold gradient-text">
              {isAr ? current.titleAr : current.titleEn}
            </h2>
            <p className="mt-3 text-sm text-muted-foreground">
              {isAr ? current.descAr : current.descEn}
            </p>
            <button
              onClick={dismiss}
              className="mt-6 h-11 w-full rounded-xl bg-primary font-semibold text-primary-foreground transition-opacity hover:opacity-90"
            >
              {isAr ? "تمام" : "Got it"}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default NewFeatureAnnouncement;
