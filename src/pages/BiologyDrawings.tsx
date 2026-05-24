import { useMemo, useState } from "react";
import { ArrowLeft, Sparkles, Microscope, RotateCcw, BookOpen, Pencil, X, ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    badge: "Biology Drawings",
    title: "Biology Drawings",
    description: "Pick a chapter to study or practice labeling.",
    chapter: "Chapter",
    cellTitle: "The Animal Cell",
    cellHint: "Drag each label to its matching arrow.",
    reset: "Reset labels",
    studyTab: "Study sheets",
    practiceTab: "Drag & drop",
    soon: "No required drawings for this chapter.",
    correct: "Correct!",
    wrong: "Try again",
    bank: "Label bank",
    drop: "Drop",
  },
  ar: {
    badge: "رسومات الأحياء",
    title: "رسومات الأحياء",
    description: "اختر الفصل للدراسة أو لتدريب التسميات.",
    chapter: "الفصل",
    cellTitle: "الخلية الحيوانية",
    cellHint: "اسحب كل تسمية إلى السهم المطابق لها.",
    reset: "مسح الإجابات",
    studyTab: "صفحات الدراسة",
    practiceTab: "سحب وإفلات",
    soon: "لا توجد رسومات مطلوبة في هذا الفصل.",
    correct: "صحيح!",
    wrong: "حاول مرة أخرى",
    bank: "بنك التسميات",
    drop: "أفلت هنا",
  },
} as const;

type Part = {
  id: string;
  label: { en: string; ar: string };
  ax: number; ay: number; // arrow anchor on cell
  lx: number; ly: number; // drop box position
};

const PARTS: Part[] = [
  { id: "nucleus",       label: { en: "Nucleus",       ar: "النواة" },              ax: 50, ay: 48, lx: 78, ly: 18 },
  { id: "membrane",      label: { en: "Cell membrane", ar: "الغشاء الخلوي" },        ax: 8,  ay: 50, lx: 2,  ly: 30 },
  { id: "mitochondrion", label: { en: "Mitochondrion", ar: "الميتوكوندريا" },        ax: 70, ay: 65, lx: 86, ly: 78 },
  { id: "ribosome",      label: { en: "Ribosome",      ar: "الرايبوسوم" },           ax: 38, ay: 70, lx: 10, ly: 86 },
  { id: "er",            label: { en: "ER",            ar: "الشبكة الإندوبلازمية" }, ax: 60, ay: 35, lx: 84, ly: 6  },
  { id: "golgi",         label: { en: "Golgi",         ar: "جهاز جولجي" },           ax: 32, ay: 32, lx: 4,  ly: 6  },
];

// Chapter image files in /public/drawings
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="max-w-3xl mx-auto mt-14 grid grid-cols-2 sm:grid-cols-5 gap-4 z-10 relative"
          >
            {[1, 2, 3, 4, 5].map((n, i) => (
              <motion.button
                key={n}
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.07 }}
                whileHover={{ y: -4, scale: 1.04 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => { setChapter(n); setTab("study"); }}
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
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.35 }}
            className="max-w-5xl mx-auto mt-10 z-10 relative"
          >
            {/* Tabs */}
            <div className="flex justify-center mb-6">
              <div className="inline-flex p-1 rounded-2xl border border-white/10 bg-secondary/50 backdrop-blur">
                <TabBtn active={tab === "study"} onClick={() => setTab("study")} icon={<BookOpen className="w-4 h-4" />} label={t.studyTab} />
                {chapter === 1 && (
                  <TabBtn active={tab === "practice"} onClick={() => setTab("practice")} icon={<Pencil className="w-4 h-4" />} label={t.practiceTab} />
                )}
              </div>
            </div>

            {tab === "practice" && chapter === 1 ? (
              <CellDiagram t={t} language={language} />
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
              key={lightbox}
              initial={{ scale: 0.9 }} animate={{ scale: 1 }}
              src={lightbox}
              alt="drawing"
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
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
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

/* ---------------- Drag & Drop Cell Diagram ---------------- */

type Placement = Record<string, string | null>; // partId -> labelId placed
const shuffle = <T,>(arr: T[]) => arr.slice().sort(() => Math.random() - 0.5);

const CellDiagram = ({ t, language }: { t: typeof copy["en"] | typeof copy["ar"]; language: AppLanguage }) => {
  const dir = language === "ar" ? "rtl" : "ltr";
  const [placed, setPlaced] = useState<Placement>({});
  const [bank, setBank] = useState<string[]>(() => shuffle(PARTS.map((p) => p.id)));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  const reset = () => {
    setPlaced({});
    setBank(shuffle(PARTS.map((p) => p.id)));
  };

  const onDropTo = (partId: string) => {
    if (!dragId) return;
    setPlaced((prev) => {
      const next: Placement = { ...prev };
      // if target already has a chip, send it back to bank
      const previous = next[partId];
      next[partId] = dragId;
      // remove dragged chip from anywhere else
      Object.keys(next).forEach((k) => {
        if (k !== partId && next[k] === dragId) next[k] = null;
      });
      setBank((b) => {
        let nb = b.filter((id) => id !== dragId);
        if (previous && !nb.includes(previous)) nb = [...nb, previous];
        return nb;
      });
      return next;
    });
    setDragId(null);
    setOverId(null);
  };

  const onDropToBank = () => {
    if (!dragId) return;
    setPlaced((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k] === dragId) next[k] = null; });
      return next;
    });
    setBank((b) => (b.includes(dragId) ? b : [...b, dragId]));
    setDragId(null);
    setOverId(null);
  };

  const labelText = (id: string) => PARTS.find((p) => p.id === id)?.label[language] ?? "";

  const allCorrect = useMemo(() => PARTS.every((p) => placed[p.id] === p.id), [placed]);

  return (
    <div className="rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-5 md:p-7">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold">{t.cellTitle}</h2>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/40"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {t.reset}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-5">{t.cellHint}</p>

      <div className="relative w-full aspect-[4/3] bg-background/40 rounded-2xl overflow-hidden mb-5" dir="ltr">
        <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <radialGradient id="cellGrad" cx="50%" cy="50%" r="50%">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.35)" />
              <stop offset="70%" stopColor="hsl(var(--primary) / 0.15)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.05)" />
            </radialGradient>
            <marker id="arrowHead" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
            </marker>
          </defs>
          <ellipse cx="50" cy="50" rx="32" ry="22" fill="url(#cellGrad)" stroke="hsl(var(--primary))" strokeWidth="0.6" />
          <ellipse cx="50" cy="48" rx="9" ry="7" fill="hsl(var(--primary) / 0.5)" stroke="hsl(var(--primary))" strokeWidth="0.4" />
          <circle cx="50" cy="48" r="2.5" fill="hsl(var(--primary))" opacity="0.7" />
          <ellipse cx="70" cy="60" rx="5" ry="2.5" fill="hsl(var(--accent) / 0.5)" stroke="hsl(var(--accent))" strokeWidth="0.3" />
          <path d="M55 38 Q60 36 62 40 Q64 44 68 41" stroke="hsl(var(--primary))" strokeWidth="0.5" fill="none" opacity="0.7" />
          <path d="M28 30 Q32 28 36 30 M28 32 Q32 30 36 32 M28 34 Q32 32 36 34" stroke="hsl(var(--accent))" strokeWidth="0.5" fill="none" />
          <g fill="hsl(var(--primary))">
            <circle cx="36" cy="64" r="0.8" /><circle cx="40" cy="66" r="0.8" /><circle cx="42" cy="62" r="0.8" />
          </g>
          {PARTS.map((p, i) => {
            const x1 = p.ax, y1 = p.ay;
            const x2 = p.lx + (p.lx > 50 ? -2 : 10);
            const y2 = p.ly + 4;
            return (
              <motion.line
                key={p.id}
                x1={x1} y1={y1} x2={x1} y2={y1}
                animate={{ x2, y2 }}
                transition={{ delay: 0.2 + i * 0.1, duration: 0.5, ease: "easeOut" }}
                stroke="hsl(var(--primary))"
                strokeWidth="0.4"
                markerEnd="url(#arrowHead)"
              />
            );
          })}
        </svg>

        {PARTS.map((p, i) => {
          const chipId = placed[p.id] ?? null;
          const correct = chipId && chipId === p.id;
          const wrong = chipId && chipId !== p.id;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.7 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.5 + i * 0.1 }}
              className="absolute"
              style={{ left: `${p.lx}%`, top: `${p.ly}%`, width: "16%", minWidth: 96 }}
              dir={dir}
              onDragOver={(e) => { e.preventDefault(); setOverId(p.id); }}
              onDragLeave={() => setOverId((v) => (v === p.id ? null : v))}
              onDrop={() => onDropTo(p.id)}
            >
              {chipId ? (
                <button
                  draggable
                  onDragStart={() => setDragId(chipId)}
                  onClick={() => onDropToBank()}
                  className={`w-full text-xs md:text-sm px-2 py-1.5 rounded-md border bg-background/90 backdrop-blur text-foreground truncate cursor-grab active:cursor-grabbing transition ${correct ? "border-emerald-500/70 ring-2 ring-emerald-500/30" : wrong ? "border-rose-500/70 ring-2 ring-rose-500/30" : "border-primary/50"}`}
                  title={labelText(chipId)}
                >
                  {labelText(chipId)}
                </button>
              ) : (
                <div className={`w-full text-[10px] md:text-xs px-2 py-1.5 rounded-md border-2 border-dashed text-muted-foreground/70 bg-background/40 text-center transition ${overId === p.id ? "border-primary bg-primary/10" : "border-primary/40"}`}>
                  {t.drop}
                </div>
              )}
            </motion.div>
          );
        })}

        {allCorrect && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute top-3 left-1/2 -translate-x-1/2 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-medium"
          >
            ✓ {t.correct}
          </motion.div>
        )}
      </div>

      {/* Label bank */}
      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropToBank}
        className="rounded-2xl border border-white/10 bg-background/40 p-3"
      >
        <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t.bank}</div>
        <div className="flex flex-wrap gap-2 min-h-[2.5rem]">
          <AnimatePresence>
            {bank.map((id) => (
              <motion.button
                key={id}
                layout
                initial={{ opacity: 0, scale: 0.85 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.85 }}
                draggable
                onDragStart={() => setDragId(id)}
                onDragEnd={() => setDragId(null)}
                className="px-3 py-1.5 rounded-full text-sm font-medium bg-gradient-to-br from-primary/90 to-accent/90 text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.4)] cursor-grab active:cursor-grabbing hover:scale-105 transition"
              >
                {labelText(id)}
              </motion.button>
            ))}
          </AnimatePresence>
          {bank.length === 0 && (
            <div className="text-xs text-muted-foreground py-1.5">—</div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BiologyDrawings;
