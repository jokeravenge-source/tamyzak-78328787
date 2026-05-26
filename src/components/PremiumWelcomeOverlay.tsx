import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Crown, Sparkles, X } from "lucide-react";
import { PremiumBadge } from "@/components/PremiumBadge";
import type { AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    title: "Welcome to Premium!",
    sub: "You've unlocked unlimited AI everywhere, an animated badge next to your name, and exclusive ways to style your character.",
    cta: "Awesome",
    list: [
      "Unlimited Essay Coach, MCQ, Video Notes & Subject Agent",
      "Animated Premium badge next to your name",
      "New skin tones, hair colors, shirts & royal crown",
    ],
  },
  ar: {
    title: "أهلاً بك في البريميوم!",
    sub: "فتحت استخدامًا غير محدود للذكاء الاصطناعي، شارة متحركة بجانب اسمك، وأزياء حصرية لشخصيتك.",
    cta: "رائع",
    list: [
      "استخدام غير محدود لمدرّب المقالات والأسئلة وملاحظات الفيديو ووكلاء المواد",
      "شارة بريميوم متحركة بجانب اسمك",
      "ألوان بشرة وشعر وقمصان جديدة وتاج ملكي",
    ],
  },
} as const;

const KEY = "premium_welcome_shown_v1";

export function PremiumWelcomeOverlay({ language }: { language: AppLanguage }) {
  const [open, setOpen] = useState(false);
  const t = copy[language];

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "success" && !sessionStorage.getItem(KEY)) {
      setOpen(true);
      sessionStorage.setItem(KEY, "1");
      const url = new URL(window.location.href);
      url.searchParams.delete("premium");
      window.history.replaceState({}, "", url.toString());
    }
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-background/80 backdrop-blur-md px-4"
          dir={language === "ar" ? "rtl" : "ltr"}
          onClick={() => setOpen(false)}
        >
          {/* Confetti-like sparkles */}
          {Array.from({ length: 14 }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 0, x: 0, rotate: 0 }}
              animate={{
                opacity: [0, 1, 0],
                y: [-20, -180 - Math.random() * 120],
                x: [(Math.random() - 0.5) * 80, (Math.random() - 0.5) * 240],
                rotate: 360,
              }}
              transition={{ duration: 1.6 + Math.random() * 0.8, delay: 0.05 * i, ease: "easeOut" }}
              className="absolute top-1/2 left-1/2 pointer-events-none"
            >
              <Sparkles className="w-4 h-4 text-amber-400" />
            </motion.span>
          ))}

          <motion.div
            initial={{ scale: 0.85, y: 30, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ type: "spring", stiffness: 220, damping: 22 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-secondary to-yellow-300/10 backdrop-blur-2xl p-8 shadow-[0_30px_80px_-20px_rgba(251,191,36,0.5)] overflow-hidden"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 rounded-full bg-background/40 hover:bg-background/70 flex items-center justify-center text-muted-foreground hover:text-foreground transition"
              aria-label="close"
            >
              <X className="w-4 h-4" />
            </button>

            <motion.div
              initial={{ scale: 0, rotate: -30 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 14, delay: 0.15 }}
              className="mx-auto w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 to-yellow-300 flex items-center justify-center shadow-[0_15px_40px_-10px_rgba(251,191,36,0.7)] mb-5"
            >
              <Crown className="w-10 h-10 text-amber-900" strokeWidth={2.4} />
            </motion.div>

            <div className="flex justify-center mb-3"><PremiumBadge size="md" /></div>

            <h2 className="text-3xl font-bold text-center gradient-text mb-2">{t.title}</h2>
            <p className="text-center text-muted-foreground text-sm mb-5">{t.sub}</p>

            <ul className="space-y-2 mb-6">
              {t.list.map((line, i) => (
                <motion.li
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.3 + i * 0.1 }}
                  className="flex items-start gap-2 text-sm"
                >
                  <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <span className="text-foreground/90">{line}</span>
                </motion.li>
              ))}
            </ul>

            <button
              onClick={() => setOpen(false)}
              className="w-full h-12 rounded-xl font-bold text-white"
              style={{
                background: "linear-gradient(110deg, #f59e0b, #fbbf24, #f59e0b)",
                boxShadow: "0 10px 30px -10px rgba(251, 191, 36, 0.6)",
              }}
            >
              {t.cta}
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}