import { useState } from "react";
import { ArrowLeft, Sparkles, Microscope, Pencil, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import LabeledDiagram from "@/components/LabeledDiagram";
import { CHAPTER_DIAGRAMS } from "@/data/biologyDiagrams";

const copy = {
  en: {
    badge: "Biology Drawings",
    title: "Biology Drawings",
    description: "Pick a chapter to practice labeling.",
    chapter: "Chapter",
    practiceTab: "Drag & drop",
    soon: "Interactive drawings for this chapter are coming soon.",
    prev: "Previous", next: "Next", of: "of",
  },
  ar: {
    badge: "رسومات الأحياء",
    title: "رسومات الأحياء",
    description: "اختر الفصل لتدرب على التسميات.",
    chapter: "الفصل",
    practiceTab: "سحب وإفلات",
    soon: "الرسومات التفاعلية لهذا الفصل قريباً.",
    prev: "السابق", next: "التالي", of: "من",
  },
} as const;

const BiologyDrawings = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [chapter, setChapter] = useState<number | null>(null);
  const [diagramIdx, setDiagramIdx] = useState(0);

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={() => (chapter === null ? onBack() : setChapter(null))}
        aria-label="Back"
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Microscope className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text leading-[1.1] mb-4">{t.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">
          {chapter === null ? t.description : `${t.chapter} ${chapter}`}
        </p>
      </header>

      <AnimatePresence mode="wait">
        {chapter === null ? (
          <motion.section
            key="picker"
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto mt-14 grid grid-cols-2 sm:grid-cols-5 gap-4 z-10 relative"
          >
            {[1, 3].map((n, i) => (
              <motion.button
                key={n}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setChapter(n); setDiagramIdx(0); }}
                className="group relative aspect-square rounded-3xl border border-primary/40 bg-secondary/40 backdrop-blur flex flex-col items-center justify-center gap-2 hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all"
              >
                <Sparkles className="w-5 h-5 text-primary opacity-60 group-hover:opacity-100 transition" />
                <span className="text-3xl md:text-4xl font-bold gradient-text">{n}</span>
                <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t.chapter}</span>
              </motion.button>
            ))}
          </motion.section>
        ) : (
          <motion.section
            key={`ch-${chapter}`}
            initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="max-w-5xl mx-auto mt-10 z-10 relative"
          >
            <div className="flex justify-center mb-6">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl border border-white/10 bg-secondary/50 backdrop-blur text-sm font-medium text-primary-foreground">
                <Pencil className="w-4 h-4" />
                <span>{t.practiceTab}</span>
              </div>
            </div>

            <PracticeView chapter={chapter} idx={diagramIdx} setIdx={setDiagramIdx} language={language} t={t} />
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
};

const PracticeView = ({
  chapter, idx, setIdx, language, t,
}: {
  chapter: number; idx: number; setIdx: (n: number) => void;
  language: AppLanguage; t: typeof copy["en"] | typeof copy["ar"];
}) => {
  const diagrams = CHAPTER_DIAGRAMS[chapter] ?? [];
  if (!diagrams.length) {
    return (
      <div className="rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-12 text-center text-muted-foreground">
        {t.soon}
      </div>
    );
  }
  const safeIdx = Math.min(idx, diagrams.length - 1);
  const current = diagrams[safeIdx];
  const dir = language === "ar" ? "rtl" : "ltr";

  return (
    <div className="space-y-4" dir={dir}>
      {/* nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
          {safeIdx + 1} {t.of} {diagrams.length}
        </div>
        <div className="flex items-center gap-2" dir="ltr">
          <button
            onClick={() => setIdx(Math.max(0, safeIdx - 1))}
            disabled={safeIdx === 0}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border border-white/10 bg-secondary/60 hover:border-primary/40 transition disabled:opacity-40"
          >
            <ChevronLeft className="w-4 h-4" /> {t.prev}
          </button>
          <button
            onClick={() => setIdx(Math.min(diagrams.length - 1, safeIdx + 1))}
            disabled={safeIdx === diagrams.length - 1}
            className="inline-flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border border-white/10 bg-secondary/60 hover:border-primary/40 transition disabled:opacity-40"
          >
            {t.next} <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* horizontal pill picker */}
      <div className="flex gap-2 overflow-x-auto pb-1">
        {diagrams.map((d, i) => (
          <button
            key={d.id}
            onClick={() => setIdx(i)}
            className={`shrink-0 px-3 py-1.5 rounded-full text-xs border transition ${i === safeIdx ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground hover:border-primary/40"}`}
          >
            {d.title[language]}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current.id}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }}
          transition={{ duration: 0.25 }}
        >
          <LabeledDiagram diagram={current} language={language} />
        </motion.div>
      </AnimatePresence>
    </div>
  );
};

export default BiologyDrawings;