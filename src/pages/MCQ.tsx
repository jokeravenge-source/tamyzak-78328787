import { useState, useRef } from "react";
import { ArrowLeft, Upload, Sparkles, Loader2, FileText, Check, X, RotateCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import mammoth from "mammoth";

const copy = {
  en: {
    title: "MCQ Generator",
    desc: "Upload any study file and get instant multiple-choice questions with explanations.",
    back: "Back",
    pickFile: "Choose a file",
    drop: "PDF, DOCX, or TXT — up to 1GB",
    selected: "Selected",
    count: "Number of questions",
    generate: "Generate Questions",
    generating: "Generating…",
    extracting: "Reading file…",
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
    noText: "Could not read text from this file.",
    tooBig: "File too large. Max 1GB.",
    badType: "Unsupported file. Use PDF, DOCX, or TXT.",
  },
  ar: {
    title: "مولّد الأسئلة",
    desc: "ارفع أي ملف دراسي واحصل فوراً على أسئلة اختيار من متعدد مع الشرح.",
    back: "رجوع",
    pickFile: "اختر ملفاً",
    drop: "PDF أو DOCX أو TXT — حتى 1 جيجابايت",
    selected: "تم اختيار",
    count: "عدد الأسئلة",
    generate: "توليد الأسئلة",
    generating: "جارٍ التوليد…",
    extracting: "جارٍ قراءة الملف…",
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
    noText: "تعذرت قراءة النص من هذا الملف.",
    tooBig: "الملف كبير جداً. الحد الأقصى 1 جيجابايت.",
    badType: "نوع الملف غير مدعوم. استخدم PDF أو DOCX أو TXT.",
  },
} as const;

type MCQ = { question: string; choices: string[]; answer_index: number; explanation: string; hint?: string };
type Phase = "setup" | "quiz" | "result";

async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || file.type.startsWith("text/")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    const buf = await file.arrayBuffer();
    const { value } = await mammoth.extractRawText({ arrayBuffer: buf });
    return value;
  }
  if (name.endsWith(".pdf") || file.type === "application/pdf") {
    const pdfjs: any = await import("pdfjs-dist");
    const v = pdfjs.version || "5.7.284";
    pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${v}/build/pdf.worker.min.mjs`;
    const buf = await file.arrayBuffer();
    const pdf = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    const maxPages = Math.min(pdf.numPages, 200);
    for (let i = 1; i <= maxPages; i++) {
      const page = await pdf.getPage(i);
      const tc = await page.getTextContent();
      out += tc.items.map((it: any) => it.str).join(" ") + "\n\n";
      if (out.length > 200000) break;
    }
    return out;
  }
  throw new Error("unsupported");
}

const MCQ = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(10);
  const [phase, setPhase] = useState<Phase>("setup");
  const [loading, setLoading] = useState(false);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [hintShown, setHintShown] = useState(false);
  const [score, setScore] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 1024 * 1024 * 1024) { toast.error(t.tooBig); return; }
    const ok = /\.(pdf|docx|txt)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");
    if (!ok) { toast.error(t.badType); return; }
    setFile(f);
  };

  const handleGenerate = async () => {
    if (!file) return;
    setLoading(true);
    try {
      toast.loading(t.extracting, { id: "ext" });
      const text = await extractText(file);
      toast.dismiss("ext");
      if (!text || text.trim().length < 50) {
        toast.error(t.noText);
        setLoading(false);
        return;
      }
      toast.loading(t.generating, { id: "gen" });
      const { data, error } = await supabase.functions.invoke("generate-mcq", {
        body: { text, count, language },
      });
      toast.dismiss("gen");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs: MCQ[] = (data?.questions || []).filter((q: any) => q?.choices?.length === 4);
      if (!qs.length) throw new Error("No questions returned");
      setQuestions(qs);
      setCurrent(0); setSelected(null); setRevealed(false); setHintShown(false); setScore(0);
      setPhase("quiz");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed to generate");
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
    if (current + 1 >= questions.length) { setPhase("result"); return; }
    setCurrent((c) => c + 1); setSelected(null); setRevealed(false); setHintShown(false);
  };

  const restart = () => {
    setPhase("setup"); setFile(null); setQuestions([]);
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
            <div
              onClick={() => inputRef.current?.click()}
              className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary rounded-2xl p-10 text-center transition"
            >
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
              <Slider value={[count]} min={1} max={100} step={1} onValueChange={(v) => setCount(v[0])} />
            </div>

            <Button onClick={handleGenerate} disabled={!file || loading} className="w-full h-12 text-base">
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</> : <><Sparkles className="w-4 h-4" /> {t.generate}</>}
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

export default MCQ;