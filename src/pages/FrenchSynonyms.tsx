import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles, BookOpen, Trophy } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

type Pair = { fr1: string; fr2: string; ar: string };
type Lecture = { id: number; titleFr: string; titleAr: string; gradient: string; emoji: string; pairs: Pair[] };

const LECTURES: Lecture[] = [
  {
    id: 1, titleFr: "Conversation 1", titleAr: "المحاورة الأولى",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600", emoji: "💰",
    pairs: [
      { fr1: "un salaire", fr2: "un traitement", ar: "راتب / معاش" },
      { fr1: "un impôt", fr2: "une taxe", ar: "ضريبة" },
      { fr1: "nécessaire", fr2: "important / obligatoire", ar: "ضروري" },
      { fr1: "compter", fr2: "calculer", ar: "يحسب" },
      { fr1: "autoriser", fr2: "permettre", ar: "يأذن / يسمح" },
      { fr1: "économiser", fr2: "placer son argent", ar: "يدّخر / يقتصد" },
    ],
  },
  {
    id: 2, titleFr: "Conversation 2", titleAr: "المحاورة الثانية",
    gradient: "from-indigo-400 via-purple-500 to-pink-500", emoji: "📚",
    pairs: [
      { fr1: "Reprocher", fr2: "Réprimander", ar: "يلوم / يوبّخ" },
      { fr1: "Essayer de", fr2: "Tenter de", ar: "يحاول أن" },
      { fr1: "Subir", fr2: "Supporter", ar: "يتحمّل" },
      { fr1: "Se courber", fr2: "Se pencher", ar: "ينحني" },
      { fr1: "Réussir", fr2: "Arriver à + infinitif", ar: "ينجح" },
      { fr1: "Renoncer à", fr2: "Se résigner à", ar: "يتنازل / يتخلى" },
      { fr1: "Un reproche", fr2: "Une réprimande", ar: "لوم / عتاب" },
      { fr1: "Je n'y suis pour rien", fr2: "Ce n'est pas de ma faute", ar: "ما لي دخل" },
    ],
  },
  {
    id: 3, titleFr: "Conversation 3", titleAr: "المحاورة الثالثة",
    gradient: "from-amber-400 via-orange-500 to-rose-500", emoji: "🚉",
    pairs: [
      { fr1: "Une gare", fr2: "Une station", ar: "محطة قطار" },
      { fr1: "Se précipiter", fr2: "Se dépêcher", ar: "يندفع / يتعجّل" },
      { fr1: "Se pencher", fr2: "Se courber", ar: "ينحني / يميل" },
      { fr1: "Un récit", fr2: "Une nouvelle", ar: "قصة / رواية" },
      { fr1: "Un plan", fr2: "Un panneau indicateur", ar: "خريطة" },
      { fr1: "Célèbre", fr2: "Connu(e)", ar: "مشهور" },
      { fr1: "Habituel(le)", fr2: "Fréquent(e)", ar: "معتاد" },
      { fr1: "Critiquer", fr2: "Commenter", ar: "ينتقد" },
      { fr1: "Une librairie", fr2: "Une bibliothèque", ar: "مكتبة" },
      { fr1: "Un bouquin", fr2: "Un livre", ar: "كتاب" },
    ],
  },
  {
    id: 4, titleFr: "Conversation 4", titleAr: "المحاورة الرابعة",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600", emoji: "🎓",
    pairs: [
      { fr1: "Enseigner", fr2: "Apprendre", ar: "يعلّم / يتعلّم" },
      { fr1: "Sembler", fr2: "Paraître", ar: "يبدو" },
      { fr1: "rare", fr2: "exceptionnel(le)", ar: "نادر / خاص" },
      { fr1: "mince", fr2: "élancé(e)", ar: "رشيق / ناعم" },
      { fr1: "déposer", fr2: "mettre", ar: "يضع" },
    ],
  },
  {
    id: 5, titleFr: "Conversation 5", titleAr: "المحاورة الخامسة",
    gradient: "from-slate-400 via-slate-500 to-slate-600", emoji: "🕊️",
    pairs: [],
  },
];

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

const LectureGame = ({ lecture, language, onBack }: { lecture: Lecture; language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const [rightOrder, setRightOrder] = useState<number[]>(() => shuffle(lecture.pairs.map((_, i) => i)));
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongOn, setWrongOn] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);

  const reset = () => {
    setRightOrder(shuffle(lecture.pairs.map((_, i) => i)));
    setMatched(new Set());
    setWrongOn(null);
  };

  const onDrop = (targetIndex: number) => {
    if (dragging === null) return;
    if (dragging === targetIndex) {
      const next = new Set(matched);
      next.add(targetIndex);
      setMatched(next);
    } else {
      setWrongOn(targetIndex);
      setTimeout(() => setWrongOn(null), 500);
    }
    setDragging(null);
  };

  const isDone = matched.size === lecture.pairs.length && lecture.pairs.length > 0;

  if (lecture.pairs.length === 0) {
    return (
      <div className="min-h-screen bg-background pb-32">
        <div className="max-w-2xl mx-auto px-4 pt-6" dir={isRTL ? "rtl" : "ltr"}>
          <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isRTL ? "رجوع" : "Back"}
          </button>
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`rounded-3xl p-10 text-center bg-gradient-to-br ${lecture.gradient} text-white shadow-2xl`}>
            <div className="text-6xl mb-4">{lecture.emoji}</div>
            <h2 className="text-2xl font-bold mb-2">{isRTL ? lecture.titleAr : lecture.titleFr}</h2>
            <p className="text-white/90">{isRTL ? "قلتلك لا يوجد مرادفات 😄" : "No synonyms in this conversation 😄"}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-3xl mx-auto px-4 pt-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isRTL ? "المحاورات" : "Lectures"}
          </button>
          <button onClick={reset} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
            <RotateCcw className="w-4 h-4" />
            {isRTL ? "إعادة" : "Reset"}
          </button>
        </div>

        <div className={`rounded-2xl p-4 mb-5 bg-gradient-to-br ${lecture.gradient} text-white shadow-lg`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{lecture.emoji}</div>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{isRTL ? lecture.titleAr : lecture.titleFr} — {isRTL ? "المرادفات" : "Synonymes"}</h1>
              <p className="text-xs text-white/85">
                {isRTL ? "اسحب الكلمة من اليمين وأفلتها بجانب مرادفها" : "Drag each word next to its matching synonym"}
              </p>
            </div>
            <div className="text-sm font-semibold bg-white/20 rounded-lg px-3 py-1.5">
              {matched.size} / {lecture.pairs.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start" dir="ltr">
          {/* Left column — targets */}
          <div className="space-y-2.5">
            {lecture.pairs.map((p, i) => {
              const isMatched = matched.has(i);
              const isWrong = wrongOn === i;
              return (
                <motion.div
                  key={`L${i}`}
                  animate={isWrong ? { x: [0, -8, 8, -6, 6, 0] } : { x: 0 }}
                  transition={{ duration: 0.4 }}
                  onDragOver={(e) => { e.preventDefault(); }}
                  onDrop={() => onDrop(i)}
                  className={`rounded-xl p-3 border-2 transition-all ${
                    isMatched
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-dashed border-border bg-card hover:border-primary/60"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-md bg-primary/15 text-primary font-bold flex items-center justify-center text-xs shrink-0">
                      {i + 1}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold text-sm">{p.fr1}</div>
                      {isMatched && (
                        <motion.div
                          initial={{ opacity: 0, y: -4 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-1 flex items-center gap-1.5 flex-wrap"
                        >
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" />
                            {p.fr2}
                          </span>
                          <span className="text-[11px] text-muted-foreground" dir="rtl">— {p.ar}</span>
                        </motion.div>
                      )}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center pt-2 gap-1 text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <div className="w-px flex-1 bg-border" />
          </div>

          {/* Right column — draggables */}
          <div className="space-y-2.5">
            {rightOrder.map((idx) => {
              const p = lecture.pairs[idx];
              const isMatched = matched.has(idx);
              if (isMatched) {
                return (
                  <div key={`R${idx}`} className="rounded-xl p-3 border-2 border-dashed border-border/40 bg-muted/30 text-center text-xs text-muted-foreground">
                    ✓
                  </div>
                );
              }
              return (
                <motion.div
                  key={`R${idx}`}
                  layout
                  draggable
                  onDragStart={() => setDragging(idx)}
                  onDragEnd={() => setDragging(null)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`rounded-xl p-3 border-2 border-primary/40 bg-gradient-to-br ${lecture.gradient} text-white font-semibold text-sm cursor-grab active:cursor-grabbing shadow-md select-none ${
                    dragging === idx ? "opacity-50" : ""
                  }`}
                >
                  {p.fr2}
                </motion.div>
              );
            })}
          </div>
        </div>

        <AnimatePresence>
          {isDone && (
            <motion.div
              initial={{ opacity: 0, y: 20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0 }}
              className="mt-6 rounded-2xl p-5 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl text-center"
            >
              <Trophy className="w-8 h-8 mx-auto mb-2" />
              <h3 className="text-lg font-bold mb-1">{isRTL ? "أحسنت! 🎉" : "Excellent! 🎉"}</h3>
              <p className="text-sm text-white/90 mb-3">
                {isRTL ? "طابقت كل المرادفات بنجاح." : "You matched every synonym!"}
              </p>
              <button onClick={reset} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors">
                <RotateCcw className="w-4 h-4" />
                {isRTL ? "العب مرة أخرى" : "Play again"}
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

const FrenchSynonyms = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const [selected, setSelected] = useState<number | null>(null);
  const active = useMemo(() => LECTURES.find((l) => l.id === selected) ?? null, [selected]);

  useEffect(() => { window.scrollTo(0, 0); }, [selected]);

  if (active) return <LectureGame lecture={active} language={language} onBack={() => setSelected(null)} />;

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-3xl mx-auto px-4 pt-6" dir={isRTL ? "rtl" : "ltr"}>
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
          {isRTL ? "رجوع" : "Back"}
        </button>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-semibold mb-3">
            <BookOpen className="w-3.5 h-3.5" />
            {isRTL ? "الفرنسية" : "French"}
          </div>
          <h1 className="text-3xl font-bold mb-1">{isRTL ? "المرادفات" : "Les Synonymes"}</h1>
          <p className="text-muted-foreground text-sm">
            {isRTL ? "اختر محاورة وتدرّب على مطابقة المرادفات بالسحب والإفلات." : "Pick a conversation and match synonyms by drag & drop."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {LECTURES.map((lec, i) => (
            <motion.button
              key={lec.id}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              whileHover={{ y: -3 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setSelected(lec.id)}
              className={`text-start rounded-2xl overflow-hidden shadow-lg bg-gradient-to-br ${lec.gradient} text-white p-5 relative group`}
            >
              <div className="absolute -top-4 -right-4 text-7xl opacity-25 group-hover:scale-110 transition-transform">
                {lec.emoji}
              </div>
              <div className="relative">
                <div className="text-xs font-semibold uppercase tracking-wider text-white/80 mb-1">
                  {isRTL ? `المحاورة ${lec.id}` : `Lecture ${lec.id}`}
                </div>
                <div className="text-xl font-bold mb-3">{isRTL ? lec.titleAr : lec.titleFr}</div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/20 rounded-full px-2.5 py-1">
                  {lec.pairs.length > 0
                    ? (isRTL ? `${lec.pairs.length} مرادفات` : `${lec.pairs.length} pairs`)
                    : (isRTL ? "بدون مرادفات" : "No synonyms")}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FrenchSynonyms;