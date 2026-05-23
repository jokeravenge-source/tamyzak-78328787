import { useState } from "react";
import { Sparkles, MoreHorizontal, UserCog, Layers, BookMarked, FileText, GraduationCap, HelpCircle, ListChecks, MessageSquareQuote, Headphones, PenLine, ArrowRight, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";

type TabKey = "basic" | "other" | "account";

const labels = {
  en: { basic: "Basics", other: "More", account: "Account", title: "Quick menu" },
  ar: { basic: "الأساسيات", other: "المزيد", account: "الحساب", title: "قائمة سريعة" },
} as const;

const itemTitles = {
  en: {
    flashcards: "Flashcards", malazam: "Malazam", summaries: "Summaries", sessions: "Sessions",
    mcq: "MCQ Generator", missions: "My Missions", advices: "Advices", essay: "Essay Coach", videoNotes: "Video to Notes",
    account: "Account Center",
  },
  ar: {
    flashcards: "البطاقات", malazam: "الملازم", summaries: "الملخصات", sessions: "الجلسات",
    mcq: "مولّد الأسئلة", missions: "مهماتي", advices: "النصائح", essay: "مدرّب المقالات", videoNotes: "من فيديو إلى ملاحظات",
    account: "مركز الحساب",
  },
} as const;

const groups: Record<TabKey, { key: MainMenuChoice; Icon: React.ComponentType<{ className?: string }> }[]> = {
  basic: [
    { key: "flashcards", Icon: Layers },
    { key: "malazam", Icon: BookMarked },
    { key: "summaries", Icon: FileText },
    { key: "sessions", Icon: GraduationCap },
  ],
  other: [
    { key: "mcq", Icon: HelpCircle },
    { key: "missions", Icon: ListChecks },
    { key: "advices", Icon: MessageSquareQuote },
    { key: "essay", Icon: PenLine },
    { key: "videoNotes", Icon: Headphones },
  ],
  account: [
    { key: "account", Icon: UserCog },
  ],
};

const CurvedNavBar = ({ language, onSelect }: { language: AppLanguage; onSelect: (c: MainMenuChoice) => void }) => {
  const [open, setOpen] = useState<TabKey | null>(null);
  const L = labels[language];
  const T = itemTitles[language];

  return (
    <>
      <AnimatePresence mode="wait">
        {open && (
          <motion.div
            key={open}
            initial={{ opacity: 0, scale: 0.98, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98, y: 12 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            dir={language === "ar" ? "rtl" : "ltr"}
            className="fixed inset-0 z-[60] bg-background/95 backdrop-blur-xl overflow-y-auto"
          >
            <div className="min-h-screen flex flex-col px-5 py-8 md:py-14 max-w-5xl mx-auto w-full">
              <div className="flex items-center justify-between mb-10">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground mb-2">{L.title}</p>
                  <motion.h2
                    key={`title-${open}`}
                    initial={{ opacity: 0, x: -16 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.35 }}
                    className="text-3xl md:text-4xl font-bold gradient-text"
                  >
                    {L[open]}
                  </motion.h2>
                </div>
                <button
                  onClick={() => setOpen(null)}
                  aria-label="Close"
                  className="w-12 h-12 rounded-full border border-primary/30 bg-secondary/60 hover:border-primary hover:bg-primary/10 flex items-center justify-center transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <motion.div
                key={`grid-${open}`}
                initial="hidden"
                animate="show"
                variants={{ hidden: {}, show: { transition: { staggerChildren: 0.06 } } }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 flex-1"
              >
                {groups[open].map(({ key, Icon }) => (
                  <motion.button
                    key={key}
                    variants={{ hidden: { opacity: 0, y: 20 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -4 }}
                    whileTap={{ scale: 0.97 }}
                    transition={{ duration: 0.3 }}
                    onClick={() => { setOpen(null); onSelect(key); }}
                    className="group relative text-left rounded-3xl p-6 h-40 border border-primary/30 bg-secondary/40 backdrop-blur overflow-hidden hover:border-primary hover:shadow-[var(--shadow-glow)]"
                  >
                    <div className="flex items-start justify-between">
                      <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center">
                        <Icon className="w-7 h-7 text-primary" />
                      </div>
                      <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                    </div>
                    <h3 className="mt-6 text-xl font-semibold">{T[key as keyof typeof T]}</h3>
                  </motion.button>
                ))}
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <nav
        aria-label="Quick navigation"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
        dir="ltr"
      >
        <div className="relative pointer-events-auto">
          {/* Curved SVG background */}
          <svg width="320" height="80" viewBox="0 0 320 80" className="drop-shadow-[0_8px_30px_hsl(var(--primary)/0.35)]">
            <defs>
              <linearGradient id="curvedBg" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.95" />
                <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.95" />
              </linearGradient>
            </defs>
            <path
              d="M0,40 Q0,15 25,15 L115,15 Q130,15 138,28 Q160,55 182,28 Q190,15 205,15 L295,15 Q320,15 320,40 L320,65 Q320,80 305,80 L15,80 Q0,80 0,65 Z"
              fill="url(#curvedBg)"
              stroke="hsl(var(--primary) / 0.4)"
              strokeWidth="1"
            />
          </svg>

          {/* Center floating button (Other / More) */}
          <motion.button
            whileTap={{ scale: 0.9 }}
            animate={{ rotate: open === "other" ? 90 : 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 18 }}
            onClick={() => setOpen(open === "other" ? null : "other")}
            aria-label={L.other}
            className="absolute left-1/2 -translate-x-1/2 -top-2 w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[var(--shadow-glow)] flex items-center justify-center"
          >
            <MoreHorizontal className="w-6 h-6" />
          </motion.button>

          {/* Left tab: Basics */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(open === "basic" ? null : "basic")}
            className={`absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-2 transition ${
              open === "basic" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <motion.span animate={{ scale: open === "basic" ? 1.15 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
              <Sparkles className="w-5 h-5" />
            </motion.span>
            <span className="text-[10px] font-medium tracking-wide">{L.basic}</span>
          </motion.button>

          {/* Right tab: Account */}
          <motion.button
            whileTap={{ scale: 0.92 }}
            onClick={() => setOpen(open === "account" ? null : "account")}
            className={`absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-2 transition ${
              open === "account" ? "text-primary" : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <motion.span animate={{ scale: open === "account" ? 1.15 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
              <UserCog className="w-5 h-5" />
            </motion.span>
            <span className="text-[10px] font-medium tracking-wide">{L.account}</span>
          </motion.button>
        </div>
      </nav>
    </>
  );
};

export default CurvedNavBar;