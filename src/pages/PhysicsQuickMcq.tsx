import { useState } from "react";
import { ArrowLeft, Sparkles, Loader2, Clock, Check, X, RotateCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { physicsChapters } from "@/data/subjectChapters";
import { awardPoints } from "@/lib/points";

const copy = {
  en: {
    title: "Physics Quick MCQ",
    desc: "Pick a physics chapter and get a focused MCQ quiz.",
    back: "Back",
    choose: "Choose chapter",
    count: "Questions",
    generate: "Start Quiz",
    generating: "Generating…",
    question: "Question",
    of: "of",
    next: "Next",
    finish: "Finish",
    correct: "Correct!",
    wrong: "Wrong",
    explanation: "Explanation",
    hint: "Hint",
    showHint: "Show hint",
    yourScore: "Your Score",
    restart: "New Quiz",
    noQuestions: "No questions returned. Try again.",
    generic: "General Physics",
  },
  ar: {
    title: "اختبار الفيزياء السريع",
    desc: "اختر فصل الفيزياء واحصل على اختبار موجّه.",
    back: "رجوع",
    choose: "اختر الفصل",
    count: "عدد الأسئلة",
    generate: "ابدأ الاختبار",
    generating: "جارٍ التوليد…",
    question: "سؤال",
    of: "من",
    next: "التالي",
    finish: "إنهاء",
    correct: "إجابة صحيحة!",
    wrong: "خطأ",
    explanation: "الشرح",
    hint: "تلميح",
    showHint: "عرض تلميح",
    yourScore: "نتيجتك",
    restart: "اختبار جديد",
    noQuestions: "لم يتم توليد أسئلة. حاول مرة أخرى.",
    generic: "فيزياء عامة",
  },
} as const;

type MCQ = { question: string; choices: string[]; answer_index: number; explanation: string; hint?: string };
type Phase = "setup" | "quiz" | "result";

const PhysicsQuickMcq = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [chapterN, setChapterN] = useState<number | null>(null);
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [score, setScore] = useState(0);

  const chapters = [{ n: -1, title: t.generic, arTitle: t.generic, subtitle: "", locked: false }, ...physicsChapters];

  const handleGenerate = async () => {
    setLoading(true);
    try {
      const chapter = chapterN ? physicsChapters.find((c) => c.n === chapterN) : null;
      const topic = chapter ? (language === "ar" ? chapter.arTitle : chapter.title) : t.generic;
      const prompt = language === "ar"
        ? `أنشئ أسئلة اختيار من متعدد في موضوع "${topic}" من الفيزياء للصف السادس العلمي العراقي. لا تستخدم أي نص خارجي، استخدم معلوماتك فقط.`
        : `Generate multiple-choice questions for 6th-grade scientific physics topic "${topic}". Use your own knowledge only.`;
      toast.loading(t.generating, { id: "gen" });
      const { data, error } = await supabase.functions.invoke("generate-mcq", {
        body: { text: prompt, count, language },
      });
      toast.dismiss("gen");
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      const qs: MCQ[] = (data?.questions || []).filter((q: any) => q?.choices?.length === 4);
      if (!qs.length) throw new Error(t.noQuestions);
      setQuestions(qs);
      setCurrent(0); setSelected(null); setRevealed(false); setHintShown(false); setScore(0);
      setPhase("quiz");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = () => {
    if (selected === null) return;
    const q = questions[current];
    if (selected === q.answer_index) setScore((s) => s + 1);
    setRevealed(true);
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) {
      setPhase("result");
      if (score === questions.length && questions.length > 0) awardPoints("mcq");
      return;
    }
    setCurrent((c) => c + 1); setSelected(null); setRevealed(false); setHintShown(false);
  };

  const restart = () => {
    setPhase("setup"); setQuestions([]);
    setCurrent(0); setSelected(null); setRevealed(false); setHintShown(false); setScore(0);
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-16 relative overflow-hidden" dir={rtl ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <div className="max-w-3xl mx-auto relative z-10">
        <header className="text-center mb-10 animate-fade-up">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-5">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-3">{t.title}</h1>
          <p className="text-muted-foreground md:text-lg">{t.desc}</p>
        </header>

        {phase === "setup" && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-8 animate-fade-up">
            <div className="space-y-3">
              <label className="text-sm font-medium">{t.choose}</label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {chapters.map((c) => (
                  <button
                    key={c.n}
                    onClick={() => setChapterN(c.n === -1 ? null : c.n)}
                    className={`text-left rounded-2xl p-4 border transition ${chapterN === c.n || (c.n === -1 && chapterN === null)
                      ? "border-primary bg-primary/10"
                      : "border-white/10 bg-background/40 hover:border-primary/40"
                    }`}
                  >
                    <p className="font-semibold">{language === "ar" ? c.arTitle : c.title}</p>
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">{t.count}</label>
                <span className="text-primary font-bold">{count}</span>
              </div>
              <input
                type="range"
                min={3}
                max={20}
                step={1}
                value={count}
                onChange={(e) => setCount(parseInt(e.target.value, 10))}
                className="w-full accent-primary"
              />
            </div>

            <Button onClick={handleGenerate} disabled={loading} className="w-full h-12 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</> : <><Clock className="w-4 h-4" /> {t.generate}</>}
            </Button>
          </div>
        )}

        {phase === "quiz" && questions[current] && (() => {
          const q = questions[current];
          return (
            <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8 animate-fade-up">
              <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                <span>{t.question} {current + 1} {t.of} {questions.length}</span>
                <span>{score} ✓</span>
              </div>
              <Progress value={((current) / questions.length) * 100} className="mb-6" />
              <h2 className="text-xl md:text-2xl font-semibold mb-6">{q.question}</h2>
              <div className="space-y-3 mb-6">
                {q.choices.map((c, i) => {
                  const isCorrect = i === q.answer_index;
                  const isSelected = i === selected;
                  let cls = "border-white/10 bg-background/40 hover:border-primary/50";
                  if (revealed) {
                    if (isCorrect) cls = "border-green-500 bg-green-500/10";
                    else if (isSelected) cls = "border-red-500 bg-red-500/10";
                    else cls = "border-white/5 bg-background/20 opacity-60";
                  } else if (isSelected) cls = "border-primary bg-primary/10";
                  return (
                    <button key={i} disabled={revealed} onClick={() => setSelected(i)}
                      className={`w-full text-left rounded-xl border p-4 transition flex items-center justify-between ${cls}`}>
                      <span>{c}</span>
                      {revealed && isCorrect && <Check className="w-5 h-5 text-green-500" />}
                      {revealed && isSelected && !isCorrect && <X className="w-5 h-5 text-red-500" />}
                    </button>
                  );
                })}
              </div>
              {revealed && (
                <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-6">
                  <p className="text-sm font-semibold text-primary mb-1">{t.explanation}</p>
                  <p className="text-sm text-foreground/90">{q.explanation}</p>
                </div>
              )}
              {!revealed && q.hint && (
                <div className="mb-4">
                  {hintShown ? (
                    <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 flex gap-3">
                      <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-400 mb-1">{t.hint}</p>
                        <p className="text-sm text-foreground/90">{q.hint}</p>
                      </div>
                    </div>
                  ) : (
                    <Button variant="outline" onClick={() => setHintShown(true)} className="gap-2">
                      <Lightbulb className="w-4 h-4" /> {t.showHint}
                    </Button>
                  )}
                </div>
              )}
              {!revealed ? (
                <Button onClick={submitAnswer} disabled={selected === null} className="w-full h-12">{t.next}</Button>
              ) : (
                <Button onClick={nextQuestion} className="w-full h-12">
                  {current + 1 >= questions.length ? t.finish : t.next}
                </Button>
              )}
            </div>
          );
        })()}

        {phase === "result" && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-10 text-center animate-fade-up">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">{t.yourScore}</p>
            <p className="text-6xl md:text-7xl font-bold gradient-text mb-2">{score} / {questions.length}</p>
            <p className="text-2xl text-muted-foreground mb-8">{Math.round((score / questions.length) * 100)}%</p>
            <Button onClick={restart} className="h-12 px-8"><RotateCw className="w-4 h-4" /> {t.restart}</Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default PhysicsQuickMcq;
