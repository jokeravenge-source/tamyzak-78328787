import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, RotateCcw, Sparkles, BookOpen, Trophy, ArrowLeftRight, Keyboard, MousePointer2, X, Eye } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

type Pair = { fr1: string; fr2: string; ar: string };
type Lecture = { id: number; titleFr: string; titleAr: string; gradient: string; emoji: string; pairs: Pair[] };

const LECTURES: Lecture[] = [
  {
    id: 1, titleFr: "Série 1", titleAr: "المجموعة الأولى",
    gradient: "from-rose-400 via-pink-500 to-fuchsia-600", emoji: "💡",
    pairs: [
      { fr1: "éteindre", fr2: "allumer", ar: "يطفئ ↔ يشعل" },
      { fr1: "être en panne", fr2: "fonctionner", ar: "يتعطّل ↔ يعمل" },
      { fr1: "absent", fr2: "présent", ar: "غائب ↔ حاضر" },
      { fr1: "lentement", fr2: "vite", ar: "ببطء ↔ بسرعة" },
      { fr1: "possible", fr2: "impossible", ar: "ممكن ↔ مستحيل" },
      { fr1: "économiser", fr2: "dépenser", ar: "يقتصد ↔ ينفق / يبذّر" },
    ],
  },
  {
    id: 2, titleFr: "Série 2", titleAr: "المجموعة الثانية",
    gradient: "from-indigo-400 via-purple-500 to-pink-500", emoji: "📚",
    pairs: [
      { fr1: "Réussir", fr2: "Échouer", ar: "ينجح ↔ يفشل" },
      { fr1: "Réussite", fr2: "Échec", ar: "نجاح ↔ فشل" },
      { fr1: "Sombre", fr2: "Éclairé(e)", ar: "مظلم ↔ مضاء / منار" },
      { fr1: "Entrer", fr2: "Sortir", ar: "يدخل ↔ يخرج" },
      { fr1: "Marié(e)", fr2: "Célibataire", ar: "متزوّج ↔ غير متزوّج" },
    ],
  },
  {
    id: 3, titleFr: "Série 3", titleAr: "المجموعة الثالثة",
    gradient: "from-amber-400 via-orange-500 to-rose-500", emoji: "🚉",
    pairs: [
      { fr1: "Vieux / Vieil(le)", fr2: "Jeune", ar: "كبير بالعمر ↔ صغير بالعمر" },
      { fr1: "Grand(e)", fr2: "Petit(e)", ar: "كبير ↔ صغير" },
      { fr1: "Monter", fr2: "Descendre", ar: "يصعد ↔ ينزل" },
      { fr1: "Habituel(le)", fr2: "Rare", ar: "معتاد ↔ نادر" },
      { fr1: "Fréquent(e)", fr2: "Rare", ar: "متكرّر ↔ نادر" },
    ],
  },
  {
    id: 4, titleFr: "Série 4", titleAr: "المجموعة الرابعة",
    gradient: "from-emerald-400 via-teal-500 to-cyan-600", emoji: "🎓",
    pairs: [
      { fr1: "Travailleur", fr2: "paresseux", ar: "نشيط / مثابر ↔ كسول" },
      { fr1: "Attentif(ve)", fr2: "distrait(e)", ar: "منتبه ↔ شارد الذهن" },
      { fr1: "ordonné(e)", fr2: "désordonné(e)", ar: "مرتّب ↔ غير مرتّب" },
      { fr1: "tranquille", fr2: "agité(e)", ar: "هادئ ↔ مضطرب" },
      { fr1: "sévère", fr2: "indulgent(e)", ar: "شديد / قاسٍ ↔ متساهل" },
    ],
  },
  {
    id: 5, titleFr: "Série 5", titleAr: "المجموعة الخامسة",
    gradient: "from-slate-400 via-slate-500 to-slate-600", emoji: "🕊️",
    pairs: [
      { fr1: "mince", fr2: "gros(se)", ar: "نحيف ↔ ضخم" },
      { fr1: "dernier", fr2: "premier", ar: "الأخير ↔ الأول" },
      { fr1: "public(que)", fr2: "privé(e)", ar: "عام ↔ خاص" },
      { fr1: "loin de", fr2: "près de", ar: "بعيد عن ↔ قريب من" },
      { fr1: "se lever", fr2: "s'asseoir", ar: "ينهض ↔ يجلس" },
      { fr1: "taille fine", fr2: "taille épaisse", ar: "قوام رشيق ↔ قوام ضخم" },
    ],
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

// ---------- Type-mode helpers ----------
const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // strip accents
    .replace(/[’'`]/g, "'")
    .replace(/[.,;:!?()"]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

// Split "important / obligatoire" or "un livre" into accepted variants
const acceptedVariants = (s: string): string[] => {
  const parts = s.split("/").map((p) => p.trim()).filter(Boolean);
  return parts.length ? parts : [s];
};

// Simple LCS-based character diff → mark which chars in the user answer are wrong
type DiffChar = { ch: string; ok: boolean };
function diffChars(user: string, correct: string): { chars: DiffChar[]; missing: string } {
  const a = user;
  const b = correct;
  const m = a.length;
  const n = b.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1].toLowerCase() === b[j - 1].toLowerCase()
        ? dp[i - 1][j - 1] + 1
        : Math.max(dp[i - 1][j], dp[i][j - 1]);
  const chars: DiffChar[] = [];
  let i = m, j = n;
  let missing = "";
  while (i > 0 && j > 0) {
    if (a[i - 1].toLowerCase() === b[j - 1].toLowerCase()) {
      chars.unshift({ ch: a[i - 1], ok: true }); i--; j--;
    } else if (dp[i - 1][j] >= dp[i][j - 1]) {
      chars.unshift({ ch: a[i - 1], ok: false }); i--;
    } else {
      missing = b[j - 1] + missing; j--;
    }
  }
  while (i > 0) { chars.unshift({ ch: a[i - 1], ok: false }); i--; }
  while (j > 0) { missing = b[j - 1] + missing; j--; }
  return { chars, missing };
}

function checkAnswer(user: string, correctRaw: string) {
  const variants = acceptedVariants(correctRaw);
  const userN = normalize(user);
  // exact (normalized) match against any accepted variant
  const exact = variants.find((v) => normalize(v) === userN);
  if (exact) return { ok: true as const, best: exact };
  // pick closest variant for feedback
  let best = variants[0];
  let bestScore = -1;
  for (const v of variants) {
    const { chars } = diffChars(user.trim(), v);
    const score = chars.filter((c) => c.ok).length - Math.abs(v.length - user.trim().length);
    if (score > bestScore) { bestScore = score; best = v; }
  }
  return { ok: false as const, best };
}

type Mode = "drag" | "type";

const TypeMode = ({
  lecture,
  language,
  onBack,
  reversed,
  setReversed,
  modeToggle,
}: {
  lecture: Lecture;
  language: AppLanguage;
  onBack: () => void;
  reversed: boolean;
  setReversed: (v: boolean | ((r: boolean) => boolean)) => void;
  modeToggle: React.ReactNode;
}) => {
  const isRTL = language === "ar";
  const [order, setOrder] = useState<number[]>(() => shuffle(lecture.pairs.map((_, i) => i)));
  const [idx, setIdx] = useState(0);
  const [input, setInput] = useState("");
  const [result, setResult] = useState<null | { ok: boolean; best: string; chars: DiffChar[]; missing: string }>(null);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [revealed, setRevealed] = useState(false);

  const cur = lecture.pairs[order[idx]];
  const prompt = reversed ? cur.fr2 : cur.fr1;
  const answerRaw = reversed ? cur.fr1 : cur.fr2;

  const reset = () => {
    setOrder(shuffle(lecture.pairs.map((_, i) => i)));
    setIdx(0);
    setInput("");
    setResult(null);
    setScore(0);
    setDone(false);
    setRevealed(false);
  };

  const toggleReverse = () => {
    setReversed((r) => !r);
    reset();
  };

  const submit = () => {
    if (!input.trim() || result) return;
    const r = checkAnswer(input, answerRaw);
    const { chars, missing } = diffChars(input.trim(), r.best);
    setResult({ ok: r.ok, best: r.best, chars, missing });
    if (r.ok) setScore((s) => s + 1);
  };

  const next = () => {
    if (idx + 1 >= order.length) {
      setDone(true);
      return;
    }
    setIdx((i) => i + 1);
    setInput("");
    setResult(null);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-2xl mx-auto px-4 pt-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
          <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isRTL ? "المجموعات" : "Lectures"}
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {modeToggle}
            <button
              onClick={toggleReverse}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                reversed ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary"
              }`}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isRTL ? "عكس" : "Reverse"}
            </button>
            <button onClick={reset} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
              <RotateCcw className="w-4 h-4" />
              {isRTL ? "إعادة" : "Reset"}
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-4 mb-5 bg-gradient-to-br ${lecture.gradient} text-white shadow-lg`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{lecture.emoji}</div>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{isRTL ? lecture.titleAr : lecture.titleFr} — {isRTL ? "اكتب المعاكس" : "Écris l'antonyme"}</h1>
              <p className="text-xs text-white/85">
                {isRTL ? "اكتب المعاكس الصحيح للكلمة المعروضة، وسيصحّح لك الذكاء الاصطناعي." : "Type the correct antonym and get instant AI-style feedback."}
              </p>
            </div>
            <div className="text-sm font-semibold bg-white/20 rounded-lg px-3 py-1.5">
              {score} / {lecture.pairs.length}
            </div>
          </div>
        </div>

        {!done ? (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-2xl border-2 border-border bg-card p-5 shadow-sm"
            dir="ltr"
          >
            <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">
              {isRTL ? `سؤال ${idx + 1} / ${order.length}` : `Question ${idx + 1} / ${order.length}`}
            </div>
            <div className={`text-2xl font-bold mb-4 bg-gradient-to-r ${lecture.gradient} bg-clip-text text-transparent`}>
              {prompt}
            </div>

            <label className="text-xs font-semibold text-muted-foreground mb-1 block">
              {isRTL ? "المعاكس بالفرنسية" : "Antonyme"}
            </label>
            <input
              autoFocus
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { result ? next() : submit(); } }}
              disabled={!!result}
              placeholder={isRTL ? "اكتب هنا..." : "Type here..."}
              className="w-full h-11 px-3 rounded-lg border-2 border-border bg-background text-base focus:outline-none focus:border-primary transition-colors disabled:opacity-70"
            />

            <AnimatePresence>
              {result && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className={`mt-4 rounded-xl p-3 border-2 ${
                    result.ok
                      ? "border-emerald-500/60 bg-emerald-500/10"
                      : "border-rose-500/60 bg-rose-500/10"
                  }`}
                >
                  <div className={`flex items-center gap-2 font-bold text-sm ${result.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400"}`}>
                    {result.ok ? <><Check className="w-4 h-4" />{isRTL ? "إجابة صحيحة" : "Correct"}</> : <><X className="w-4 h-4" />{isRTL ? "إجابة خاطئة" : "Incorrect"}</>}
                  </div>
                  {!result.ok && (
                    <div className="mt-2 space-y-1.5 text-sm">
                      <div>
                        <span className="text-muted-foreground me-2">{isRTL ? "إجابتك:" : "Your answer:"}</span>
                        <span className="font-mono">
                          {result.chars.map((c, i) => (
                            <span key={i} className={c.ok ? "text-emerald-600 dark:text-emerald-400" : "text-rose-600 dark:text-rose-400 underline decoration-wavy"}>
                              {c.ch}
                            </span>
                          ))}
                        </span>
                      </div>
                      {result.missing && (
                        <div className="text-xs text-muted-foreground">
                          {isRTL ? "أحرف ناقصة:" : "Missing:"} <span className="font-mono text-foreground">“{result.missing}”</span>
                        </div>
                      )}
                      <div>
                        <span className="text-muted-foreground me-2">{isRTL ? "الصحيح:" : "Correct:"}</span>
                        <span className="font-semibold">{result.best}</span>
                      </div>
                    </div>
                  )}
                  <div className="mt-1 text-xs text-muted-foreground" dir="rtl">— {cur.ar}</div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="mt-4 flex items-center gap-2">
              {!result ? (
                <>
                  <button
                    onClick={submit}
                    disabled={!input.trim()}
                    className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm disabled:opacity-40 hover:bg-primary/90 transition-colors"
                  >
                    {isRTL ? "تحقّق" : "Check"}
                  </button>
                  <button
                    onClick={() => { setRevealed(true); setInput(acceptedVariants(answerRaw)[0]); }}
                    className="h-10 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors inline-flex items-center gap-1.5"
                  >
                    <Eye className="w-4 h-4" />
                    {isRTL ? "أظهر" : "Reveal"}
                  </button>
                </>
              ) : (
                <button onClick={next} className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground font-semibold text-sm hover:bg-primary/90 transition-colors">
                  {idx + 1 >= order.length ? (isRTL ? "إنهاء" : "Finish") : (isRTL ? "التالي" : "Next")}
                </button>
              )}
            </div>
            {revealed && !result && (
              <div className="mt-2 text-xs text-muted-foreground">
                {isRTL ? "تم إظهار الإجابة — اضغط تحقّق للمتابعة." : "Answer revealed — press Check to continue."}
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-2xl p-6 bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-xl text-center"
          >
            <Trophy className="w-10 h-10 mx-auto mb-2" />
            <h3 className="text-xl font-bold mb-1">{isRTL ? "انتهيت! 🎉" : "Done! 🎉"}</h3>
            <p className="text-sm text-white/90 mb-4">
              {isRTL ? `نتيجتك: ${score} من ${order.length}` : `Score: ${score} / ${order.length}`}
            </p>
            <button onClick={reset} className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-white/20 hover:bg-white/30 text-sm font-semibold transition-colors">
              <RotateCcw className="w-4 h-4" />
              {isRTL ? "أعد المحاولة" : "Try again"}
            </button>
          </motion.div>
        )}
      </div>
    </div>
  );
};

const LectureGame = ({ lecture, language, onBack }: { lecture: Lecture; language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const [mode, setMode] = useState<Mode>("drag");
  const [sourceOrder, setSourceOrder] = useState<number[]>(() => shuffle(lecture.pairs.map((_, i) => i)));
  const [matched, setMatched] = useState<Set<number>>(new Set());
  const [wrongOn, setWrongOn] = useState<number | null>(null);
  const [dragging, setDragging] = useState<number | null>(null);
  const [reversed, setReversed] = useState(false);

  const sourceText = (p: Pair) => (reversed ? p.fr2 : p.fr1);
  const targetText = (p: Pair) => (reversed ? p.fr1 : p.fr2);

  const reset = () => {
    setSourceOrder(shuffle(lecture.pairs.map((_, i) => i)));
    setMatched(new Set());
    setWrongOn(null);
  };

  const toggleReverse = () => {
    setReversed((r) => !r);
    setSourceOrder(shuffle(lecture.pairs.map((_, i) => i)));
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

  const renderTarget = (i: number, side: "left" | "right") => {
    const p = lecture.pairs[i];
    const isMatched = matched.has(i);
    const isWrong = wrongOn === i;
    return (
      <motion.div
        key={`T-${side}-${i}`}
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
            <div className="font-semibold text-sm">{targetText(p)}</div>
            {isMatched && (
              <motion.div
                initial={{ opacity: 0, y: -4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-1 flex items-center gap-1.5 flex-wrap"
              >
                <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600 dark:text-emerald-400">
                  <Check className="w-3 h-3" />
                  {sourceText(p)}
                </span>
                <span className="text-[11px] text-muted-foreground" dir="rtl">— {p.ar}</span>
              </motion.div>
            )}
          </div>
        </div>
      </motion.div>
    );
  };

  const renderSource = (idx: number, side: "left" | "right") => {
    const p = lecture.pairs[idx];
    const isMatched = matched.has(idx);
    if (isMatched) {
      return (
        <div key={`S-${side}-${idx}`} className="rounded-xl p-3 border-2 border-dashed border-border/40 bg-muted/30 text-center text-xs text-muted-foreground">
          ✓
        </div>
      );
    }
    return (
      <motion.div
        key={`S-${side}-${idx}`}
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
        {sourceText(p)}
      </motion.div>
    );
  };

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
            <p className="text-white/90">{isRTL ? "لا يوجد معاكسات هنا 😄" : "No antonyms in this set 😄"}</p>
          </motion.div>
        </div>
      </div>
    );
  }

  const modeToggle = (
    <div className="inline-flex rounded-lg border border-border bg-card p-0.5">
      <button
        onClick={() => setMode("drag")}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold transition-colors ${
          mode === "drag" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
        }`}
      >
        <MousePointer2 className="w-3.5 h-3.5" />
        {isRTL ? "سحب" : "Drag"}
      </button>
      <button
        onClick={() => setMode("type")}
        className={`inline-flex items-center gap-1.5 h-8 px-2.5 rounded-md text-xs font-semibold transition-colors ${
          mode === "type" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-secondary"
        }`}
      >
        <Keyboard className="w-3.5 h-3.5" />
        {isRTL ? "كتابة" : "Type"}
      </button>
    </div>
  );

  if (mode === "type") {
    return (
      <TypeMode
        lecture={lecture}
        language={language}
        onBack={onBack}
        reversed={reversed}
        setReversed={setReversed}
        modeToggle={modeToggle}
      />
    );
  }

  return (
    <div className="min-h-screen bg-background pb-32">
      <div className="max-w-3xl mx-auto px-4 pt-6" dir={isRTL ? "rtl" : "ltr"}>
        <div className="flex items-center justify-between mb-4">
          <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {isRTL ? "المجموعات" : "Lectures"}
          </button>
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {modeToggle}
            <button
              onClick={toggleReverse}
              className={`inline-flex items-center gap-2 h-9 px-3 rounded-lg border text-sm font-medium transition-colors ${
                reversed
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:bg-secondary"
              }`}
              title={isRTL ? "عكس الاتجاه" : "Reverse"}
            >
              <ArrowLeftRight className="w-4 h-4" />
              {isRTL ? "عكس" : "Reverse"}
            </button>
            <button onClick={reset} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
              <RotateCcw className="w-4 h-4" />
              {isRTL ? "إعادة" : "Reset"}
            </button>
          </div>
        </div>

        <div className={`rounded-2xl p-4 mb-5 bg-gradient-to-br ${lecture.gradient} text-white shadow-lg`}>
          <div className="flex items-center gap-3">
            <div className="text-3xl">{lecture.emoji}</div>
            <div className="flex-1">
              <h1 className="text-lg font-bold">{isRTL ? lecture.titleAr : lecture.titleFr} — {isRTL ? "المعاكسات" : "Antonymes"}</h1>
              <p className="text-xs text-white/85">
                {reversed
                  ? (isRTL ? "اسحب الكلمة من اليسار وأفلتها بجانب معاكسها على اليمين" : "Drag from the left and drop onto the right")
                  : (isRTL ? "اسحب الكلمة من اليمين وأفلتها بجانب معاكسها على اليسار" : "Drag from the right and drop onto the left")}
              </p>
            </div>
            <div className="text-sm font-semibold bg-white/20 rounded-lg px-3 py-1.5">
              {matched.size} / {lecture.pairs.length}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_1fr] gap-3 items-start" dir="ltr">
          {/* Left column */}
          <div className="space-y-2.5">
            {reversed
              ? sourceOrder.map((idx) => renderSource(idx, "left"))
              : lecture.pairs.map((_, i) => renderTarget(i, "left"))}
          </div>

          <div className="hidden sm:flex flex-col items-center justify-center pt-2 gap-1 text-muted-foreground">
            <Sparkles className="w-4 h-4" />
            <div className="w-px flex-1 bg-border" />
          </div>

          {/* Right column */}
          <div className="space-y-2.5">
            {reversed
              ? lecture.pairs.map((_, i) => renderTarget(i, "right"))
              : sourceOrder.map((idx) => renderSource(idx, "right"))}
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
                {isRTL ? "طابقت كل المعاكسات بنجاح." : "You matched every antonym!"}
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

const FrenchAntonyms = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
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
          <h1 className="text-3xl font-bold mb-1">{isRTL ? "المعاكسات" : "Les Antonymes"}</h1>
          <p className="text-muted-foreground text-sm">
            {isRTL ? "اختر مجموعة وتدرّب على مطابقة المعاكسات بالسحب والإفلات." : "Pick a set and match antonyms by drag & drop."}
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
                  {isRTL ? `المجموعة ${lec.id}` : `Série ${lec.id}`}
                </div>
                <div className="text-xl font-bold mb-3">{isRTL ? lec.titleAr : lec.titleFr}</div>
                <div className="inline-flex items-center gap-1.5 text-xs font-medium bg-white/20 rounded-full px-2.5 py-1">
                  {lec.pairs.length > 0
                    ? (isRTL ? `${lec.pairs.length} أزواج` : `${lec.pairs.length} pairs`)
                    : (isRTL ? "بدون معاكسات" : "No antonyms")}
                </div>
              </div>
            </motion.button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default FrenchAntonyms;