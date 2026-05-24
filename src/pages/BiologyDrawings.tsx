import { useState } from "react";
import { ArrowLeft, Sparkles, Microscope, BookOpen, Pencil, X, ImageIcon, ChevronLeft, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import LabeledDiagram from "@/components/LabeledDiagram";
import { CHAPTER_DIAGRAMS } from "@/data/biologyDiagrams";

const copy = {
  en: {
    badge: "Biology Drawings",
    title: "Biology Drawings",
    description: "Pick a chapter to study or practice labeling.",
    chapter: "Chapter",
    studyTab: "Study sheets",
    practiceTab: "Drag & drop",
    soon: "No required drawings for this chapter.",
    practiceSoon: "Interactive drawings for this chapter are coming soon.",
    prev: "Previous", next: "Next", of: "of",
  },
  ar: {
    badge: "رسومات الأحياء",
    title: "رسومات الأحياء",
    description: "اختر الفصل للدراسة أو لتدريب التسميات.",
    chapter: "الفصل",
    studyTab: "صفحات الدراسة",
    practiceTab: "سحب وإفلات",
    soon: "لا توجد رسومات مطلوبة في هذا الفصل.",
    practiceSoon: "الرسومات التفاعلية لهذا الفصل قريباً.",
    prev: "السابق", next: "التالي", of: "من",
  },
} as const;

const CHAPTER_IMAGES: Record<number, string[]> = {
  1: ["/drawings/p-03.jpg","/drawings/p-04.jpg","/drawings/p-05.jpg","/drawings/p-06.jpg","/drawings/p-07.jpg","/drawings/p-08.jpg","/drawings/p-09.jpg","/drawings/p-10.jpg"],
  2: ["/drawings/p-12.jpg","/drawings/p-13.jpg","/drawings/p-14.jpg","/drawings/p-15.jpg","/drawings/p-16.jpg"],
  3: ["/drawings/p-18.jpg","/drawings/p-19.jpg","/drawings/p-20.jpg","/drawings/p-21.jpg","/drawings/p-22.jpg","/drawings/p-23.jpg","/drawings/p-24.jpg"],
  4: [],
  5: ["/drawings/p-27.jpg"],
};

const BiologyDrawings = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [chapter, setChapter] = useState<number | null>(null);
  const [tab, setTab] = useState<"study" | "practice">("study");
  const [lightbox, setLightbox] = useState<string | null>(null);
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
            {[1, 2, 3, 4, 5].map((n, i) => (
              <motion.button
                key={n}
                initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.04 }} whileTap={{ scale: 0.95 }}
                onClick={() => { setChapter(n); setTab("study"); setDiagramIdx(0); }}
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
              <div className="inline-flex p-1 rounded-2xl border border-white/10 bg-secondary/50 backdrop-blur">
                <TabBtn active={tab === "study"}    onClick={() => setTab("study")}    icon={<BookOpen className="w-4 h-4" />} label={t.studyTab} />
                <TabBtn active={tab === "practice"} onClick={() => setTab("practice")} icon={<Pencil   className="w-4 h-4" />} label={t.practiceTab} />
              </div>
            </div>

            {tab === "practice" ? (
              <PracticeView chapter={chapter} idx={diagramIdx} setIdx={setDiagramIdx} language={language} t={t} />
            ) : (
              <DrawingsGallery images={CHAPTER_IMAGES[chapter] ?? []} soon={t.soon} onOpen={setLightbox} />
            )}
          </motion.section>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {lightbox && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-background/90 backdrop-blur-md flex items-center justify-center p-4"
            onClick={() => setLightbox(null)}
          >
            <button className="absolute top-6 right-6 w-11 h-11 rounded-full border border-white/10 bg-secondary/80 flex items-center justify-center hover:border-primary/40 transition">
              <X className="w-5 h-5" />
            </button>
            <motion.img
              key={lightbox} initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={lightbox} alt="drawing"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[90vh] max-w-[95vw] rounded-2xl shadow-[var(--shadow-elegant)] border border-white/10 bg-white"
            />
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

const TabBtn = ({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) => (
  <button
    onClick={onClick}
    className={`relative px-4 py-2 rounded-xl text-sm font-medium inline-flex items-center gap-2 transition ${active ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
  >
    {active && (
      <motion.div layoutId="bio-tab-active" className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_6px_20px_hsl(var(--primary)/0.4)]" transition={{ type: "spring", stiffness: 380, damping: 32 }} />
    )}
    <span className="relative z-10 inline-flex items-center gap-2">{icon}{label}</span>
  </button>
);

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
        {t.practiceSoon}
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

const DrawingsGallery = ({ images, soon, onOpen }: { images: string[]; soon: string; onOpen: (src: string) => void }) => {
  if (!images.length) {
    return (
      <div className="rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-12 text-center text-muted-foreground">
        {soon}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
      {images.map((src, i) => (
        <motion.button
          key={src}
          initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.04 }}
          whileHover={{ y: -3 }}
          onClick={() => onOpen(src)}
          className="group relative rounded-2xl overflow-hidden border border-white/10 bg-white shadow-[0_8px_30px_hsl(var(--primary)/0.15)] hover:border-primary/50 hover:shadow-[var(--shadow-glow)] transition"
        >
          <img src={src} loading="lazy" alt={`drawing ${i + 1}`} className="w-full aspect-[3/4] object-cover" />
          <div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 px-3 py-2 bg-gradient-to-t from-black/70 to-transparent text-white text-xs">
            <span className="inline-flex items-center gap-1.5"><ImageIcon className="w-3.5 h-3.5" /> #{i + 1}</span>
          </div>
        </motion.button>
      ))}
    </div>
  );
};

export default BiologyDrawings;
