import { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, CheckCircle2, RefreshCw, XCircle, Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import { isqatExercises, isqatUnits, type IsqatExercise } from "@/data/englishIsqatExercises";

type Props = { language: AppLanguage; onBack: () => void };

const T = {
  en: {
    title: "Word Drops (Isqatat)",
    subtitle: "Drag the right word from the box into each blank — or tap a word, then tap a blank.",
    unit: "Unit",
    exercise: "Exercise",
    check: "Check answers",
    reset: "Reset",
    score: "Score",
    correct: "Correct!",
    wrong: "Some answers are wrong — try again.",
    incomplete: "Please fill every blank first.",
    showAnswers: "Show answers",
    hideAnswers: "Hide answers",
    back: "Back",
    tapToPlace: "Tap a word, then tap a blank",
    clearSlot: "Tap a filled blank to clear it",
  },
  ar: {
    title: "الإسقاطات",
    subtitle: "اسحب الكلمة المناسبة من المربع إلى الفراغ — أو اضغط الكلمة ثم اضغط الفراغ.",
    unit: "اليونت",
    exercise: "التمرين",
    check: "تحقق من الإجابات",
    reset: "إعادة",
    score: "النتيجة",
    correct: "ممتاز! جميع الإجابات صحيحة.",
    wrong: "بعض الإجابات غير صحيحة — حاول مرة أخرى.",
    incomplete: "الرجاء ملء جميع الفراغات أولاً.",
    showAnswers: "إظهار الإجابات",
    hideAnswers: "إخفاء الإجابات",
    back: "رجوع",
    tapToPlace: "اضغط الكلمة ثم اضغط على الفراغ",
    clearSlot: "اضغط على فراغ ممتلئ لتفريغه",
  },
} as const;

const normalize = (s: string) => s.trim().toLowerCase().replace(/\s+/g, " ");

// Flatten exercise into ordered list of blanks
type BlankRef = { sentenceIdx: number; localIdx: number; globalIdx: number; answer: string };

const buildBlanks = (ex: IsqatExercise): BlankRef[] => {
  const blanks: BlankRef[] = [];
  let g = 0;
  ex.sentences.forEach((s, si) => {
    s.answers.forEach((a, li) => {
      blanks.push({ sentenceIdx: si, localIdx: li, globalIdx: g, answer: a });
      g++;
    });
  });
  return blanks;
};

export default function EnglishIsqat({ language, onBack }: Props) {
  const t = T[language];
  const isRTL = language === "ar";

  const [unit, setUnit] = useState<number>(1);
  const unitExercises = useMemo(() => isqatExercises.filter((e) => e.unit === unit), [unit]);
  const [exerciseId, setExerciseId] = useState<string>(unitExercises[0]?.id ?? "");
  const exercise = useMemo(
    () => unitExercises.find((e) => e.id === exerciseId) ?? unitExercises[0],
    [unitExercises, exerciseId],
  );

  const blanks = useMemo(() => (exercise ? buildBlanks(exercise) : []), [exercise]);
  const [placements, setPlacements] = useState<(string | null)[]>(() => blanks.map(() => null));
  // word usage counts — each word in pool consumed once per occurrence
  const wordCounts = useMemo(() => {
    const m: Record<string, number> = {};
    exercise?.words.forEach((w) => { m[w] = (m[w] ?? 0) + 1; });
    return m;
  }, [exercise]);
  const usedCounts = useMemo(() => {
    const m: Record<string, number> = {};
    placements.forEach((p) => { if (p) m[p] = (m[p] ?? 0) + 1; });
    return m;
  }, [placements]);
  const [selectedWord, setSelectedWord] = useState<string | null>(null);
  const [checked, setChecked] = useState(false);
  const [showAnswers, setShowAnswers] = useState(false);

  // Reset state when exercise changes
  const resetExercise = (newId?: string) => {
    const target = newId ? unitExercises.find((e) => e.id === newId) ?? exercise : exercise;
    if (!target) return;
    setExerciseId(target.id);
    const fresh = buildBlanks(target).map(() => null);
    setPlacements(fresh);
    setSelectedWord(null);
    setChecked(false);
    setShowAnswers(false);
  };

  const handleUnit = (u: number) => {
    setUnit(u);
    const first = isqatExercises.find((e) => e.unit === u);
    if (first) {
      setExerciseId(first.id);
      setPlacements(buildBlanks(first).map(() => null));
      setSelectedWord(null);
      setChecked(false);
      setShowAnswers(false);
    }
  };

  const placeWord = (blankIdx: number, word: string) => {
    setChecked(false);
    setPlacements((prev) => {
      const next = [...prev];
      // If the word is already at another blank, remove it from there (single token semantics)
      const usedSoFar = next.filter((p) => p === word).length;
      const allowed = wordCounts[word] ?? 0;
      if (usedSoFar >= allowed) {
        // move from earliest occurrence
        const oldIdx = next.findIndex((p) => p === word);
        if (oldIdx !== -1) next[oldIdx] = null;
      }
      next[blankIdx] = word;
      return next;
    });
    setSelectedWord(null);
  };

  const clearSlot = (blankIdx: number) => {
    setChecked(false);
    setPlacements((prev) => {
      const next = [...prev];
      next[blankIdx] = null;
      return next;
    });
  };

  const wordAvailable = (w: string) => (usedCounts[w] ?? 0) < (wordCounts[w] ?? 0);

  const check = () => {
    if (placements.some((p) => !p)) {
      toast.error(t.incomplete);
      return;
    }
    setChecked(true);
    const allCorrect = blanks.every((b, i) => normalize(b.answer) === normalize(placements[i] ?? ""));
    if (allCorrect) toast.success(t.correct);
    else toast.error(t.wrong);
  };

  const correctCount = checked
    ? blanks.filter((b, i) => normalize(b.answer) === normalize(placements[i] ?? "")).length
    : 0;

  if (!exercise) return null;

  return (
    <main className="min-h-screen bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            {isRTL ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
            {t.back}
          </button>
          <div className="text-right">
            <h1 className="text-2xl font-bold">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t.subtitle}</p>
          </div>
        </div>

        {/* Units */}
        <div className="flex flex-wrap gap-2 mb-4">
          {isqatUnits.map((u) => (
            <button
              key={u}
              onClick={() => handleUnit(u)}
              className={`px-4 py-2 rounded-xl text-sm font-semibold border transition-all ${
                unit === u
                  ? "bg-primary text-primary-foreground border-primary shadow"
                  : "bg-card border-border text-foreground hover:bg-secondary"
              }`}
            >
              {t.unit} {u}
            </button>
          ))}
        </div>

        {/* Exercises in this unit */}
        <div className="flex flex-wrap gap-2 mb-6">
          {unitExercises.map((e) => (
            <button
              key={e.id}
              onClick={() => resetExercise(e.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                e.id === exerciseId
                  ? "bg-accent text-accent-foreground border-accent"
                  : "bg-card border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}
            >
              {language === "ar" ? e.titleAr : e.title}
            </button>
          ))}
        </div>

        {/* Word pool */}
        <div className="bg-card border border-border rounded-2xl p-4 mb-5 shadow-sm">
          <p className="text-[11px] text-muted-foreground uppercase tracking-wider mb-3">
            {language === "ar" ? "صندوق الكلمات" : "Word box"}
          </p>
          <div className="flex flex-wrap gap-2" dir="ltr">
            {exercise.words.map((w) => {
              const available = wordAvailable(w);
              const selected = selectedWord === w;
              return (
                <button
                  key={w}
                  draggable={available}
                  onDragStart={(e) => {
                    if (!available) return;
                    e.dataTransfer.setData("text/plain", w);
                  }}
                  onClick={() => available && setSelectedWord(selected ? null : w)}
                  disabled={!available}
                  className={`px-3 py-2 rounded-xl text-sm font-semibold border-2 transition-all cursor-grab active:cursor-grabbing ${
                    !available
                      ? "bg-muted text-muted-foreground border-transparent opacity-40 cursor-not-allowed line-through"
                      : selected
                      ? "bg-primary text-primary-foreground border-primary shadow-lg scale-105"
                      : "bg-secondary text-foreground border-border hover:border-primary/40 hover:bg-primary/5"
                  }`}
                >
                  {w}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-3">
            💡 {t.tapToPlace} · {t.clearSlot}
          </p>
        </div>

        {/* Sentences */}
        <div className="space-y-3 mb-6" dir="ltr">
          {exercise.sentences.map((s, si) => {
            const parts = s.text.split("___");
            // Determine global blank indexes for this sentence
            let g = 0;
            for (let i = 0; i < si; i++) g += exercise.sentences[i].answers.length;
            return (
              <div key={si} className="bg-card border border-border rounded-xl p-4 leading-loose text-[15px]">
                <span className="text-muted-foreground text-xs font-bold me-2">{si + 1}.</span>
                {parts.map((part, pi) => {
                  const isLast = pi === parts.length - 1;
                  if (isLast) return <span key={pi}>{part}</span>;
                  const blankIdx = g + pi;
                  const value = placements[blankIdx];
                  const correct = checked ? normalize(value ?? "") === normalize(blanks[blankIdx].answer) : null;
                  return (
                    <span key={pi}>
                      {part}
                      <span
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          const word = e.dataTransfer.getData("text/plain");
                          if (word) placeWord(blankIdx, word);
                        }}
                        onClick={() => {
                          if (value) clearSlot(blankIdx);
                          else if (selectedWord) placeWord(blankIdx, selectedWord);
                        }}
                        className={`inline-flex items-center justify-center min-w-[110px] mx-1 px-3 py-1 rounded-lg border-2 border-dashed text-sm font-bold align-middle cursor-pointer select-none transition-all ${
                          !value
                            ? selectedWord
                              ? "border-primary bg-primary/5 text-primary hover:bg-primary/10"
                              : "border-border bg-secondary/40 text-muted-foreground"
                            : checked
                            ? correct
                              ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                              : "border-rose-500 bg-rose-50 text-rose-700"
                            : "border-primary bg-primary/10 text-primary"
                        }`}
                      >
                        {value ?? "____"}
                        {checked && value && (
                          correct ? (
                            <CheckCircle2 className="w-3.5 h-3.5 ms-1" />
                          ) : (
                            <XCircle className="w-3.5 h-3.5 ms-1" />
                          )
                        )}
                      </span>
                      {checked && value && normalize(value) !== normalize(blanks[blankIdx].answer) && (
                        <span className="text-[11px] text-emerald-600 font-semibold mx-1">
                          ({blanks[blankIdx].answer})
                        </span>
                      )}
                    </span>
                  );
                })}
              </div>
            );
          })}
        </div>

        {/* Controls */}
        <div className="flex flex-wrap items-center gap-3 sticky bottom-3 bg-background/80 backdrop-blur p-3 rounded-2xl border border-border shadow-lg">
          <Button onClick={check} className="gap-2">
            <CheckCircle2 className="w-4 h-4" /> {t.check}
          </Button>
          <Button variant="outline" onClick={() => resetExercise()} className="gap-2">
            <RefreshCw className="w-4 h-4" /> {t.reset}
          </Button>
          <Button
            variant="ghost"
            onClick={() => setShowAnswers((v) => !v)}
            className="gap-2 ms-auto"
          >
            {showAnswers ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            {showAnswers ? t.hideAnswers : t.showAnswers}
          </Button>
          {checked && (
            <div className="text-sm font-bold text-primary">
              {t.score}: {correctCount} / {blanks.length}
            </div>
          )}
        </div>

        {showAnswers && (
          <div className="mt-4 bg-emerald-50 border border-emerald-200 rounded-xl p-4 text-sm" dir="ltr">
            <p className="font-bold mb-2 text-emerald-700">
              {language === "ar" ? "الإجابات الصحيحة:" : "Correct answers:"}
            </p>
            <ol className="space-y-1 list-decimal ps-5 text-emerald-900">
              {blanks.map((b, i) => (
                <li key={i}>
                  <span className="font-semibold">{b.answer}</span>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </main>
  );
}