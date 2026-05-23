import { useState } from "react";
import { ArrowLeft, Sparkles, Microscope, RotateCcw } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    badge: "Biology Drawings",
    title: "Biology Drawings",
    description: "Pick a chapter to start labeling diagrams.",
    chapter: "Chapter",
    pickChapter: "Choose a chapter",
    cellTitle: "The Animal Cell",
    cellHint: "Type the name of each pointed structure in the empty box.",
    reset: "Reset labels",
    placeholder: "Label…",
    soon: "More drawings coming soon for this chapter.",
  },
  ar: {
    badge: "رسومات الأحياء",
    title: "رسومات الأحياء",
    description: "اختر الفصل لتبدأ تمييز الرسومات.",
    chapter: "الفصل",
    pickChapter: "اختر الفصل",
    cellTitle: "الخلية الحيوانية",
    cellHint: "اكتب اسم كل جزء مُشار إليه في الصندوق الفارغ.",
    reset: "مسح الإجابات",
    placeholder: "الاسم…",
    soon: "المزيد من الرسومات قريباً لهذا الفصل.",
  },
} as const;

type Part = {
  id: string;
  // anchor on the cell (where arrow starts), in %
  ax: number;
  ay: number;
  // label box position, in %
  lx: number;
  ly: number;
};

// Arrows fan out from various organelles inside the cell to empty boxes around it.
const PARTS: Part[] = [
  { id: "nucleus", ax: 50, ay: 48, lx: 78, ly: 18 },
  { id: "membrane", ax: 8, ay: 50, lx: 2, ly: 30 },
  { id: "mitochondrion", ax: 70, ay: 65, lx: 88, ly: 78 },
  { id: "ribosome", ax: 38, ay: 70, lx: 12, ly: 88 },
  { id: "er", ax: 60, ay: 35, lx: 84, ly: 6 },
  { id: "golgi", ax: 32, ay: 32, lx: 6, ly: 10 },
];

const BiologyDrawings = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [chapter, setChapter] = useState<number | null>(null);
  const [labels, setLabels] = useState<Record<string, string>>({});

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
                onClick={() => { setChapter(n); setLabels({}); }}
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
            {chapter === 1 ? (
              <CellDiagram
                title={t.cellTitle}
                hint={t.cellHint}
                placeholder={t.placeholder}
                resetLabel={t.reset}
                labels={labels}
                setLabels={setLabels}
                dir={language === "ar" ? "rtl" : "ltr"}
              />
            ) : (
              <div className="rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-12 text-center text-muted-foreground">
                {t.soon}
              </div>
            )}
          </motion.section>
        )}
      </AnimatePresence>
    </main>
  );
};

const CellDiagram = ({
  title,
  hint,
  placeholder,
  resetLabel,
  labels,
  setLabels,
  dir,
}: {
  title: string;
  hint: string;
  placeholder: string;
  resetLabel: string;
  labels: Record<string, string>;
  setLabels: (l: Record<string, string>) => void;
  dir: "ltr" | "rtl";
}) => {
  return (
    <div className="rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-6 md:p-8">
      <div className="flex items-center justify-between mb-2 gap-3 flex-wrap">
        <h2 className="text-2xl font-semibold">{title}</h2>
        <button
          onClick={() => setLabels({})}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/40"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {resetLabel}
        </button>
      </div>
      <p className="text-sm text-muted-foreground mb-6">{hint}</p>

      <div className="relative w-full aspect-[4/3] bg-background/40 rounded-2xl overflow-hidden" dir="ltr">
        {/* SVG arrows + cell */}
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

          {/* Cell membrane */}
          <ellipse cx="50" cy="50" rx="32" ry="22" fill="url(#cellGrad)" stroke="hsl(var(--primary))" strokeWidth="0.6" />
          {/* Nucleus */}
          <ellipse cx="50" cy="48" rx="9" ry="7" fill="hsl(var(--primary) / 0.5)" stroke="hsl(var(--primary))" strokeWidth="0.4" />
          <circle cx="50" cy="48" r="2.5" fill="hsl(var(--primary))" opacity="0.7" />
          {/* Mitochondria */}
          <ellipse cx="70" cy="60" rx="5" ry="2.5" fill="hsl(var(--accent) / 0.5)" stroke="hsl(var(--accent))" strokeWidth="0.3" />
          {/* ER squiggles */}
          <path d="M55 38 Q60 36 62 40 Q64 44 68 41" stroke="hsl(var(--primary))" strokeWidth="0.5" fill="none" opacity="0.7" />
          {/* Golgi */}
          <path d="M28 30 Q32 28 36 30 M28 32 Q32 30 36 32 M28 34 Q32 32 36 34" stroke="hsl(var(--accent))" strokeWidth="0.5" fill="none" />
          {/* Ribosomes */}
          <g fill="hsl(var(--primary))">
            <circle cx="36" cy="64" r="0.8" /><circle cx="40" cy="66" r="0.8" /><circle cx="42" cy="62" r="0.8" />
          </g>

          {/* Arrows with animation */}
          {PARTS.map((p, i) => {
            // shorten line so it stops at box edge
            const x1 = p.ax;
            const y1 = p.ay;
            const x2 = p.lx + (p.lx > 50 ? -2 : 10);
            const y2 = p.ly + 4;
            return (
              <motion.line
                key={p.id}
                x1={x1} y1={y1} x2={x1} y2={y1}
                animate={{ x2, y2 }}
                transition={{ delay: 0.2 + i * 0.12, duration: 0.6, ease: "easeOut" }}
                stroke="hsl(var(--primary))"
                strokeWidth="0.4"
                markerEnd="url(#arrowHead)"
              />
            );
          })}
        </svg>

        {/* Empty label boxes */}
        {PARTS.map((p, i) => (
          <motion.div
            key={p.id}
            initial={{ opacity: 0, scale: 0.7 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.6 + i * 0.12, duration: 0.35 }}
            className="absolute"
            style={{ left: `${p.lx}%`, top: `${p.ly}%`, width: "13%", minWidth: 80 }}
            dir={dir}
          >
            <input
              value={labels[p.id] ?? ""}
              onChange={(e) => setLabels({ ...labels, [p.id]: e.target.value })}
              placeholder={placeholder}
              className="w-full text-xs md:text-sm px-2 py-1.5 rounded-md border border-primary/50 bg-background/80 backdrop-blur text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 transition"
            />
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default BiologyDrawings;