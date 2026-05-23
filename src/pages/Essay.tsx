import { useRef, useState } from "react";
import { ArrowLeft, Upload, Sparkles, Loader2, FileText, RotateCw, PenLine } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractStudyMaterial } from "@/lib/fileText";

const copy = {
  en: {
    title: "Essay Coach",
    desc: "Upload a file, get essay questions, and let AI rate your answers from 1 to 10.",
    pickFile: "Choose a file",
    drop: "PDF, DOCX, or TXT — up to 100MB",
    count: "Number of questions (max 10)",
    generate: "Generate Questions",
    generating: "Generating…",
    extracting: "Reading file…",
    grading: "Grading…",
    question: "Question",
    of: "of",
    yourAnswer: "Your answer",
    answerPh: "Write your answer here…",
    submit: "Submit answer",
    next: "Next question",
    finish: "See total result",
    score: "Score",
    feedback: "Feedback",
    total: "Total Result",
    restart: "New essay set",
    tooBig: "File too large. Max 100MB.",
    badType: "Unsupported file. Use PDF, DOCX, or TXT.",
    noText: "Could not read text from this file.",
    emptyAnswer: "Please write an answer first.",
  },
  ar: {
    title: "مدرّب المقالات",
    desc: "ارفع ملفاً، احصل على أسئلة مقالية، ودع الذكاء الاصطناعي يقيّم إجاباتك من 1 إلى 10.",
    pickFile: "اختر ملفاً",
    drop: "PDF أو DOCX أو TXT — حتى 100 ميجابايت",
    count: "عدد الأسئلة (الحد الأقصى 10)",
    generate: "توليد الأسئلة",
    generating: "جارٍ التوليد…",
    extracting: "جارٍ قراءة الملف…",
    grading: "جارٍ التقييم…",
    question: "سؤال",
    of: "من",
    yourAnswer: "إجابتك",
    answerPh: "اكتب إجابتك هنا…",
    submit: "إرسال الإجابة",
    next: "السؤال التالي",
    finish: "عرض النتيجة الإجمالية",
    score: "الدرجة",
    feedback: "ملاحظات",
    total: "النتيجة الإجمالية",
    restart: "مجموعة جديدة",
    tooBig: "الملف كبير جداً. الحد الأقصى 100 ميجابايت.",
    badType: "نوع الملف غير مدعوم. استخدم PDF أو DOCX أو TXT.",
    noText: "تعذرت قراءة النص من هذا الملف.",
    emptyAnswer: "الرجاء كتابة إجابة أولاً.",
  },
} as const;

type Question = { question: string; reference_answer: string };
type Grade = { score: number; feedback: string };
type Phase = "setup" | "quiz" | "result";

const MAX_BYTES = 100 * 1024 * 1024;

const Essay = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(5);
  const [phase, setPhase] = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [current, setCurrent] = useState(0);
  const [answer, setAnswer] = useState("");
  const [grades, setGrades] = useState<Grade[]>([]);
  const [grading, setGrading] = useState(false);
  const [lastGrade, setLastGrade] = useState<Grade | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > MAX_BYTES) { toast.error(t.tooBig); return; }
    const ok = /\.(pdf|docx|txt)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");
    if (!ok) { toast.error(t.badType); return; }
    setFile(f);
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    try {
      toast.loading(t.extracting, { id: "ext" });
      const material = await extractStudyMaterial(file);
      const text = material.text;
      toast.dismiss("ext");
      if ((!text || text.trim().length < 50) && !material.pageImages?.length) { toast.error(t.noText); setLoading(false); return; }
      toast.loading(t.generating, { id: "gen" });
      const { data, error } = await supabase.functions.invoke("essay-coach", {
        body: { mode: "generate", text, pageImages: material.pageImages, count, language },
      });
      toast.dismiss("gen");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs: Question[] = (data?.questions || []).slice(0, 10);
      if (!qs.length) throw new Error("No questions returned");
      setQuestions(qs);
      setCurrent(0); setAnswer(""); setGrades([]); setLastGrade(null);
      setPhase("quiz");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  };

  const submitAnswer = async () => {
    if (!answer.trim()) { toast.error(t.emptyAnswer); return; }
    setGrading(true);
    try {
      const q = questions[current];
      const { data, error } = await supabase.functions.invoke("essay-coach", {
        body: { mode: "grade", question: q.question, reference: q.reference_answer, answer, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const g: Grade = { score: Math.max(1, Math.min(10, Number(data.score) || 1)), feedback: String(data.feedback || "") };
      setLastGrade(g);
      setGrades((prev) => [...prev, g]);
    } catch (e: any) {
      toast.error(e.message || "Failed to grade");
    } finally {
      setGrading(false);
    }
  };

  const nextQuestion = () => {
    if (current + 1 >= questions.length) { setPhase("result"); return; }
    setCurrent((c) => c + 1); setAnswer(""); setLastGrade(null);
  };

  const restart = () => {
    setPhase("setup"); setFile(null); setQuestions([]); setCurrent(0);
    setAnswer(""); setGrades([]); setLastGrade(null);
  };

  const totalScore = grades.reduce((s, g) => s + g.score, 0);
  const maxScore = questions.length * 10;

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
            <PenLine className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AI</span>
          </div>
          <h1 className="text-4xl md:text-6xl font-bold gradient-text mb-3">{t.title}</h1>
          <p className="text-muted-foreground md:text-lg">{t.desc}</p>
        </header>

        {phase === "setup" && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-8 animate-fade-up">
            <div onClick={() => inputRef.current?.click()} className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-10 text-center transition">
              <input ref={inputRef} type="file" className="hidden" accept=".pdf,.docx,.txt,application/pdf,text/plain"
                onChange={(e) => onFile(e.target.files?.[0] ?? null)} />
              {file ? (
                <div className="flex flex-col items-center gap-2">
                  <FileText className="w-10 h-10 text-primary" />
                  <p className="font-medium">{file.name}</p>
                  <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-2">
                  <Upload className="w-10 h-10 text-primary" />
                  <p className="font-medium">{t.pickFile}</p>
                  <p className="text-xs text-muted-foreground">{t.drop}</p>
                </div>
              )}
            </div>

            <div>
              <div className="flex justify-between mb-3">
                <label className="text-sm font-medium">{t.count}</label>
                <span className="text-primary font-bold">{count}</span>
              </div>
              <Slider value={[count]} min={1} max={10} step={1} onValueChange={(v) => setCount(v[0])} />
            </div>

            <Button onClick={handleGenerate} disabled={!file || loading} className="w-full h-12 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</> : <><Sparkles className="w-4 h-4" /> {t.generate}</>}
            </Button>
          </div>
        )}

        {phase === "quiz" && questions[current] && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8 animate-fade-up">
            <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
              <span>{t.question} {current + 1} {t.of} {questions.length}</span>
              <span>{totalScore} / {grades.length * 10}</span>
            </div>
            <Progress value={(current / questions.length) * 100} className="mb-6" />
            <h2 className="text-xl md:text-2xl font-semibold mb-6">{questions[current].question}</h2>

            <label className="text-sm font-medium block mb-2">{t.yourAnswer}</label>
            <Textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              placeholder={t.answerPh}
              rows={8}
              disabled={!!lastGrade || grading}
              className="mb-4"
            />

            {lastGrade && (
              <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
                <div className="flex items-baseline gap-2 mb-2">
                  <p className="text-sm font-semibold text-primary">{t.score}:</p>
                  <p className="text-2xl font-bold gradient-text">{lastGrade.score} / 10</p>
                </div>
                <p className="text-sm font-semibold text-primary mb-1">{t.feedback}</p>
                <p className="text-sm text-foreground/90 whitespace-pre-wrap">{lastGrade.feedback}</p>
              </div>
            )}

            {!lastGrade ? (
              <Button onClick={submitAnswer} disabled={grading || !answer.trim()} className="w-full h-12">
                {grading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.grading}</> : t.submit}
              </Button>
            ) : (
              <Button onClick={nextQuestion} className="w-full h-12">
                {current + 1 >= questions.length ? t.finish : t.next}
              </Button>
            )}
          </div>
        )}

        {phase === "result" && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-10 text-center animate-fade-up">
            <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">{t.total}</p>
            <p className="text-6xl md:text-7xl font-bold gradient-text mb-2">{totalScore} / {maxScore}</p>
            <p className="text-2xl text-muted-foreground mb-8">{maxScore > 0 ? Math.round((totalScore / maxScore) * 100) : 0}%</p>
            <div className="space-y-3 text-left mb-8 max-h-80 overflow-y-auto">
              {questions.map((q, i) => (
                <div key={i} className="rounded-xl border border-white/10 bg-background/30 p-3">
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium">{t.question} {i + 1}</span>
                    <span className="text-primary font-bold">{grades[i]?.score ?? 0} / 10</span>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">{q.question}</p>
                </div>
              ))}
            </div>
            <Button onClick={restart} className="h-12 px-8"><RotateCw className="w-4 h-4" /> {t.restart}</Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default Essay;