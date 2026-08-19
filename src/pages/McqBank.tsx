import { useCallback, useEffect, useMemo, useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ArrowRight, Check, X, Loader2, HelpCircle, Trophy, Frown, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import { Button } from "@/components/ui/button";
import { showAward } from "@/lib/points";

type Row = {
  id: string;
  subject: string;
  chapter: number;
  chapter_title: string | null;
  question: string;
  choices: unknown;
  answer_index: number;
  explanation: string | null;
};

const SUBJECT_LABELS: Record<string, { ar: string; en: string; emoji: string }> = {
  physics: { ar: "الفيزياء", en: "Physics", emoji: "🧲" },
  chemistry: { ar: "الكيمياء", en: "Chemistry", emoji: "⚗️" },
  biology: { ar: "الأحياء", en: "Biology", emoji: "🧬" },
  english: { ar: "الإنجليزية", en: "English", emoji: "🔤" },
  french: { ar: "الفرنسية", en: "French", emoji: "🇫🇷" },
  arabic: { ar: "العربية", en: "Arabic", emoji: "📖" },
  islamic: { ar: "التربية الإسلامية", en: "Islamic", emoji: "🕌" },
  math: { ar: "الرياضيات", en: "Math", emoji: "➗" },
};

const subjectLabel = (s: string, isAr: boolean) => {
  const m = SUBJECT_LABELS[s?.toLowerCase?.() ?? ""];
  return m ? (isAr ? m.ar : m.en) : s;
};

function celebrate() {
  confetti({ particleCount: 90, spread: 80, startVelocity: 45, origin: { y: 0.4 } });
  setTimeout(() => confetti({ particleCount: 60, spread: 110, origin: { y: 0.5 } }), 220);
}

export default function McqBank({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  const isAr = language === "ar";
  const lang = isAr ? "ar" : "en";
  const Back = isAr ? ArrowRight : ArrowLeft;

  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState<number | null>(null);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [answerIndex, setAnswerIndex] = useState<number | null>(null);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [delta, setDelta] = useState(0);
  const [score, setScore] = useState({ right: 0, wrong: 0 });

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data } = await supabase
        .from("mcq_banks")
        .select("id, subject, chapter, chapter_title, question, choices, answer_index, explanation")
        .eq("language", lang)
        .order("subject", { ascending: true })
        .order("chapter", { ascending: true })
        .order("sort_order", { ascending: true })
        .limit(2000);
      setRows((data ?? []) as Row[]);
      setLoading(false);
    })();
  }, [lang]);

  const subjects = useMemo(() => {
    const map = new Map<string, number>();
    rows.forEach((r) => map.set(r.subject, (map.get(r.subject) ?? 0) + 1));
    return [...map.entries()].sort((a, b) => b[1] - a[1]);
  }, [rows]);

  const chapters = useMemo(() => {
    if (!subject) return [] as { chapter: number; title: string | null; count: number }[];
    const map = new Map<number, { chapter: number; title: string | null; count: number }>();
    rows.filter((r) => r.subject === subject).forEach((r) => {
      const cur = map.get(r.chapter) ?? { chapter: r.chapter, title: r.chapter_title, count: 0 };
      cur.count += 1;
      map.set(r.chapter, cur);
    });
    return [...map.values()].sort((a, b) => a.chapter - b.chapter);
  }, [rows, subject]);

  const quiz = useMemo(
    () => rows.filter((r) => r.subject === subject && r.chapter === chapter),
    [rows, subject, chapter],
  );
  const current = quiz[index];
  const choices = useMemo(
    () => (Array.isArray(current?.choices) ? (current!.choices as unknown[]).map(String) : []),
    [current],
  );

  const resetQ = () => { setPicked(null); setAnswerIndex(null); setExplanation(null); setDelta(0); };

  const submit = useCallback(async (choice: number) => {
    if (!current || picked !== null || submitting) return;
    setSubmitting(true);
    setPicked(choice);
    const { data, error } = await supabase.rpc("answer_mcq_bank", {
      _question_id: current.id,
      _choice_index: choice,
    });
    setSubmitting(false);
    const res = (data ?? null) as null | {
      correct: boolean; answer_index: number; explanation: string | null; points: number;
    };
    if (error || !res) {
      // fall back to local check so the user still gets feedback
      const ok = choice === current.answer_index;
      setAnswerIndex(current.answer_index);
      setExplanation(current.explanation);
      setScore((s) => ({ right: s.right + (ok ? 1 : 0), wrong: s.wrong + (ok ? 0 : 1) }));
      if (ok) celebrate();
      return;
    }
    setAnswerIndex(res.answer_index);
    setExplanation(res.explanation ?? current.explanation);
    setDelta(res.points);
    setScore((s) => ({ right: s.right + (res.correct ? 1 : 0), wrong: s.wrong + (res.correct ? 0 : 1) }));
    if (res.correct) {
      celebrate();
      if (res.points > 0) showAward("mcq", res.points);
    } else if (navigator.vibrate) {
      navigator.vibrate([40, 60, 40]);
    }
  }, [current, picked, submitting]);

  const next = () => { resetQ(); setIndex((i) => Math.min(i + 1, quiz.length - 1)); };
  const restart = () => { resetQ(); setIndex(0); setScore({ right: 0, wrong: 0 }); };

  const header = (title: string, back: () => void) => (
    <div className="flex items-center gap-3 mb-6">
      <Button variant="ghost" size="icon" onClick={back} aria-label={isAr ? "رجوع" : "Back"}>
        <Back className="w-5 h-5" />
      </Button>
      <h1 className="text-xl font-bold">{title}</h1>
    </div>
  );

  if (loading) {
    return (
      <main className="min-h-screen grid place-items-center" dir={isAr ? "rtl" : "ltr"}>
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
      </main>
    );
  }

  // ---- Subject picker ----
  if (!subject) {
    return (
      <main className="min-h-screen px-4 py-8 pb-28" dir={isAr ? "rtl" : "ltr"}>
        {header(isAr ? "بنك الأسئلة" : "MCQ Bank", onBack)}
        <p className="text-sm text-muted-foreground mb-6">
          {isAr
            ? "اختر المادة، أجب بشكل صحيح لتربح 5 نقاط، والإجابة الخاطئة تخصم 5 نقاط."
            : "Pick a subject. A correct answer earns 5 points, a wrong one costs 5 points."}
        </p>
        {subjects.length === 0 ? (
          <p className="text-muted-foreground">{isAr ? "لا توجد أسئلة بعد." : "No questions yet."}</p>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-4xl">
            {subjects.map(([s, count]) => (
              <motion.button
                key={s}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => { setSubject(s); setChapter(null); }}
                className="text-start rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5 shadow-lg hover:border-primary transition-colors"
              >
                <div className="text-3xl mb-2">{SUBJECT_LABELS[s]?.emoji ?? "📚"}</div>
                <div className="font-semibold">{subjectLabel(s, isAr)}</div>
                <div className="text-xs text-muted-foreground mt-1">
                  {count} {isAr ? "سؤال" : "questions"}
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </main>
    );
  }

  // ---- Chapter picker ----
  if (chapter === null) {
    return (
      <main className="min-h-screen px-4 py-8 pb-28" dir={isAr ? "rtl" : "ltr"}>
        {header(subjectLabel(subject, isAr), () => setSubject(null))}
        <div className="grid gap-3 max-w-2xl">
          {chapters.map((c) => (
            <button
              key={c.chapter}
              onClick={() => { setChapter(c.chapter); setIndex(0); resetQ(); setScore({ right: 0, wrong: 0 }); }}
              className="flex items-center justify-between rounded-2xl border border-white/10 bg-secondary/40 p-4 hover:border-primary transition-colors text-start"
            >
              <span className="font-medium">
                {isAr ? `الفصل ${c.chapter}` : `Chapter ${c.chapter}`}
                {c.title ? <span className="text-muted-foreground"> — {c.title}</span> : null}
              </span>
              <span className="text-xs text-muted-foreground">{c.count}</span>
            </button>
          ))}
        </div>
      </main>
    );
  }

  // ---- Quiz ----
  const finished = index >= quiz.length - 1 && picked !== null;

  return (
    <main className="min-h-screen px-4 py-8 pb-28" dir={isAr ? "rtl" : "ltr"}>
      {header(`${subjectLabel(subject, isAr)} · ${isAr ? `الفصل ${chapter}` : `Chapter ${chapter}`}`, () => { setChapter(null); resetQ(); })}

      <div className="max-w-2xl mx-auto">
        <div className="flex items-center justify-between text-xs text-muted-foreground mb-3">
          <span>{index + 1} / {quiz.length}</span>
          <span className="flex items-center gap-3">
            <span className="text-emerald-500 font-semibold">+{score.right * 5}</span>
            <span className="text-rose-500 font-semibold">-{score.wrong * 5}</span>
          </span>
        </div>
        <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-6">
          <motion.div
            className="h-full bg-primary"
            animate={{ width: `${((index + 1) / Math.max(quiz.length, 1)) * 100}%` }}
          />
        </div>

        {current && (
          <motion.div key={current.id} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }}>
            <div className="rounded-2xl border border-white/10 bg-secondary/40 p-5 mb-5">
              <div className="flex items-start gap-2">
                <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <p className="font-medium leading-relaxed">{current.question}</p>
              </div>
            </div>

            <div className="grid gap-3">
              {choices.map((c, i) => {
                const revealed = picked !== null;
                const isAnswer = revealed && answerIndex === i;
                const isWrongPick = revealed && picked === i && answerIndex !== i;
                return (
                  <motion.button
                    key={i}
                    disabled={revealed || submitting}
                    onClick={() => submit(i)}
                    whileTap={!revealed ? { scale: 0.98 } : undefined}
                    animate={isWrongPick ? { x: [0, -8, 8, -6, 6, 0] } : {}}
                    className={`flex items-center gap-3 rounded-2xl border p-4 text-start transition-colors
                      ${isAnswer ? "border-emerald-500 bg-emerald-500/10"
                        : isWrongPick ? "border-rose-500 bg-rose-500/10"
                        : "border-white/10 bg-secondary/30 hover:border-primary"}`}
                  >
                    <span className="w-7 h-7 shrink-0 grid place-items-center rounded-full border border-white/15 text-xs">
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span className="flex-1">{c}</span>
                    {isAnswer && <Check className="w-5 h-5 text-emerald-500" />}
                    {isWrongPick && <X className="w-5 h-5 text-rose-500" />}
                  </motion.button>
                );
              })}
            </div>

            <AnimatePresence>
              {picked !== null && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className={`mt-5 rounded-2xl border p-5 text-center ${
                    answerIndex === picked ? "border-emerald-500/50 bg-emerald-500/10" : "border-rose-500/50 bg-rose-500/10"
                  }`}
                >
                  <motion.div
                    initial={{ scale: 0, rotate: -20 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 260, damping: 14 }}
                    className="mx-auto w-16 h-16 rounded-full grid place-items-center mb-3 bg-background/40"
                  >
                    {answerIndex === picked
                      ? <Trophy className="w-8 h-8 text-emerald-500" />
                      : <Frown className="w-8 h-8 text-rose-500" />}
                  </motion.div>
                  <p className="font-bold text-lg">
                    {answerIndex === picked
                      ? (isAr ? "إجابة صحيحة! 🎉" : "Correct! 🎉")
                      : (isAr ? "إجابة خاطئة 😕" : "Wrong answer 😕")}
                  </p>
                  {delta !== 0 && (
                    <motion.p
                      initial={{ y: 8, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      className={`mt-1 font-extrabold text-2xl ${delta > 0 ? "text-emerald-500" : "text-rose-500"}`}
                    >
                      {delta > 0 ? `+${delta}` : delta} {isAr ? "نقطة" : "pts"}
                    </motion.p>
                  )}
                  {explanation && <p className="mt-2 text-sm text-muted-foreground">{explanation}</p>}

                  <div className="mt-4 flex gap-2 justify-center">
                    {!finished ? (
                      <Button onClick={next}>{isAr ? "السؤال التالي" : "Next question"}</Button>
                    ) : (
                      <>
                        <Button onClick={restart} variant="secondary">
                          <RotateCcw className="w-4 h-4 me-1" />{isAr ? "إعادة" : "Restart"}
                        </Button>
                        <Button onClick={() => { setChapter(null); resetQ(); }}>
                          {isAr ? "فصل آخر" : "Another chapter"}
                        </Button>
                      </>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}
      </div>
    </main>
  );
}
