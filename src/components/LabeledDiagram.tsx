import { useMemo, useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Check } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

export type DiagramPart = {
  id: string;
  label: { en: string; ar: string };
  /** arrow anchor on the artwork, in % of the 100x75 viewBox */
  ax: number;
  ay: number;
  /** label drop-box position, in % of the container (0-100) */
  lx: number;
  ly: number;
  /** label box width in % (default 17) */
  lw?: number;
};

export type DiagramDef = {
  id: string;
  title: { en: string; ar: string };
  /** rendered into the central <svg viewBox="0 0 100 75"> */
  art: React.ReactNode;
  parts: DiagramPart[];
  /** optional aspect ratio override, default 4/3 */
  aspect?: string;
};

const shuffle = <T,>(arr: T[]) => arr.slice().sort(() => Math.random() - 0.5);

const TEXT = {
  en: { reset: "Reset", bank: "Label bank", drop: "Drop", correct: "All correct!", hint: "Drag each label to its arrow." },
  ar: { reset: "إعادة", bank: "بنك التسميات", drop: "أفلت", correct: "كل الإجابات صحيحة!", hint: "اسحب كل تسمية إلى السهم المطابق." },
};

const LabeledDiagram = ({ diagram, language }: { diagram: DiagramDef; language: AppLanguage }) => {
  const dir = language === "ar" ? "rtl" : "ltr";
  const t = TEXT[language];
  const aspect = diagram.aspect ?? "4/3";

  const [placed, setPlaced] = useState<Record<string, string | null>>({});
  const [bank, setBank] = useState<string[]>(() => shuffle(diagram.parts.map((p) => p.id)));
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);

  useEffect(() => {
    setPlaced({});
    setBank(shuffle(diagram.parts.map((p) => p.id)));
  }, [diagram.id]);

  const reset = () => {
    setPlaced({});
    setBank(shuffle(diagram.parts.map((p) => p.id)));
  };

  const onDropTo = (partId: string) => {
    if (!dragId) return;
    const drag = dragId;
    setPlaced((prev) => {
      const next = { ...prev };
      const previous = next[partId];
      next[partId] = drag;
      Object.keys(next).forEach((k) => { if (k !== partId && next[k] === drag) next[k] = null; });
      setBank((b) => {
        let nb = b.filter((id) => id !== drag);
        if (previous && !nb.includes(previous)) nb = [...nb, previous];
        return nb;
      });
      return next;
    });
    setDragId(null); setOverId(null);
  };

  const onDropToBank = () => {
    if (!dragId) return;
    const drag = dragId;
    setPlaced((prev) => {
      const next = { ...prev };
      Object.keys(next).forEach((k) => { if (next[k] === drag) next[k] = null; });
      return next;
    });
    setBank((b) => (b.includes(drag) ? b : [...b, drag]));
    setDragId(null); setOverId(null);
  };

  const labelText = (id: string) => diagram.parts.find((p) => p.id === id)?.label[language] ?? "";
  const allCorrect = useMemo(
    () => diagram.parts.every((p) => placed[p.id] === p.id),
    [placed, diagram.parts],
  );

  return (
    <div className="rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-5 md:p-7">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <h3 className="text-xl md:text-2xl font-semibold">{diagram.title[language]}</h3>
        <button
          onClick={reset}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition px-3 py-1.5 rounded-full border border-white/10 hover:border-primary/40"
        >
          <RotateCcw className="w-3.5 h-3.5" /> {t.reset}
        </button>
      </div>
      <p className="text-xs text-muted-foreground mb-4">{t.hint}</p>

      <div className="relative w-full bg-background/40 rounded-2xl overflow-hidden mb-5" style={{ aspectRatio: aspect }} dir="ltr">
        <svg viewBox="0 0 100 75" preserveAspectRatio="none" className="absolute inset-0 w-full h-full">
          <defs>
            <marker id={`ah-${diagram.id}`} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,0 L10,5 L0,10 z" fill="hsl(var(--primary))" />
            </marker>
          </defs>
          {diagram.art}
          {diagram.parts.map((p, i) => {
            // label box is positioned at lx%, ly% of the container.
            // SVG viewBox is 100 x 75, so container-y% -> viewBox y = ly * 0.75
            const w = p.lw ?? 17;
            const x2 = p.lx > 50 ? p.lx - 1.5 : p.lx + w + 1.5;
            const y2 = (p.ly + 3) * 0.75;
            return (
              <motion.line
                key={p.id}
                x1={p.ax} y1={p.ay * 0.75} x2={p.ax} y2={p.ay * 0.75}
                animate={{ x2, y2 }}
                transition={{ delay: 0.15 + i * 0.07, duration: 0.5, ease: "easeOut" }}
                stroke="hsl(var(--primary))" strokeWidth="0.35"
                markerEnd={`url(#ah-${diagram.id})`}
              />
            );
          })}
        </svg>

        {diagram.parts.map((p, i) => {
          const chipId = placed[p.id] ?? null;
          const correct = chipId && chipId === p.id;
          const wrong = chipId && chipId !== p.id;
          const w = p.lw ?? 17;
          return (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.45 + i * 0.07 }}
              className="absolute"
              style={{ left: `${p.lx}%`, top: `${p.ly}%`, width: `${w}%`, minWidth: 92 }}
              dir={dir}
              onDragOver={(e) => { e.preventDefault(); setOverId(p.id); }}
              onDragLeave={() => setOverId((v) => (v === p.id ? null : v))}
              onDrop={() => onDropTo(p.id)}
            >
              {chipId ? (
                <button
                  draggable
                  onDragStart={() => setDragId(chipId)}
                  onClick={onDropToBank}
                  className={`w-full text-[11px] md:text-xs px-2 py-1.5 rounded-md border bg-background/95 backdrop-blur text-foreground truncate cursor-grab active:cursor-grabbing transition ${correct ? "border-emerald-500/80 ring-2 ring-emerald-500/40" : wrong ? "border-rose-500/80 ring-2 ring-rose-500/40" : "border-primary/60"}`}
                  title={labelText(chipId)}
                >
                  {labelText(chipId)}
                </button>
              ) : (
                <div className={`w-full text-[10px] md:text-[11px] px-2 py-1.5 rounded-md border-2 border-dashed text-muted-foreground/70 bg-background/50 text-center transition ${overId === p.id ? "border-primary bg-primary/10" : "border-primary/40"}`}>
                  {t.drop}
                </div>
              )}
            </motion.div>
          );
        })}

        <AnimatePresence>
          {allCorrect && (
            <motion.div
              initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="absolute top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/50 text-emerald-300 text-xs font-semibold"
            >
              <Check className="w-3.5 h-3.5" /> {t.correct}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <div
        onDragOver={(e) => e.preventDefault()}
        onDrop={onDropToBank}
        className="rounded-2xl border border-white/10 bg-background/40 p-3"
      >
        <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mb-2">{t.bank}</div>
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
                className="px-3 py-1.5 rounded-full text-xs md:text-sm font-medium bg-gradient-to-br from-primary to-accent text-primary-foreground shadow-[0_4px_14px_hsl(var(--primary)/0.4)] cursor-grab active:cursor-grabbing hover:scale-105 transition"
              >
                {labelText(id)}
              </motion.button>
            ))}
          </AnimatePresence>
          {bank.length === 0 && <div className="text-xs text-muted-foreground py-1.5">—</div>}
        </div>
      </div>
    </div>
  );
};

export default LabeledDiagram;
