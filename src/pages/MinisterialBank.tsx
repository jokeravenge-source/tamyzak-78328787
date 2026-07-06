import { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Sparkles, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, ScrollText, Eye, ChevronLeft, ChevronRight, Check, X, Moon, Sigma, FileText, Loader2, RefreshCw, Printer, Upload, GraduationCap, ImagePlus, Trash2 } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECTS_ORDER, getChaptersForSubject, type BankSubject } from "@/data/subjectChapters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ministerialChemCh1 } from "@/data/ministerialChemCh1";
import { ministerialChemCh2 } from "@/data/ministerialChemCh2";
import { ministerialChemCh3 } from "@/data/ministerialChemCh3";
import { ministerialChemCh4 } from "@/data/ministerialChemCh4";
import { ministerialChemCh5 } from "@/data/ministerialChemCh5";
import { ministerialChemCh6 } from "@/data/ministerialChemCh6";
import { ministerialChemCh6Ar } from "@/data/ministerialChemCh6Ar";
import { ministerialChemCh1Ar } from "@/data/ministerialChemCh1Ar";
import { ministerialChemCh2Ar } from "@/data/ministerialChemCh2Ar";
import { ministerialChemCh3Ar } from "@/data/ministerialChemCh3Ar";
import { ministerialChemCh4Ar } from "@/data/ministerialChemCh4Ar";
import { ministerialChemCh5Ar } from "@/data/ministerialChemCh5Ar";
import { ministerialPhysicsCh1 } from "@/data/ministerialPhysicsCh1";
import { ministerialPhysicsCh1Ar } from "@/data/ministerialPhysicsCh1Ar";
import { ministerialPhysicsCh2 } from "@/data/ministerialPhysicsCh2";
import { ministerialPhysicsCh2Ar } from "@/data/ministerialPhysicsCh2Ar";
import { ministerialArabicIstifham } from "@/data/ministerialArabicIstifham";
import { ministerialArabicMadhDham } from "@/data/ministerialArabicMadhDham";
import { ministerialArabicTaajjub } from "@/data/ministerialArabicTaajjub";
import { ministerialArabicNida } from "@/data/ministerialArabicNida";
import { ministerialBioCh1Ar } from "@/data/ministerialBioCh1Ar";
import { Textarea } from "@/components/ui/textarea";

const subjectIcons: Record<BankSubject, React.ComponentType<{ className?: string }>> = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  english: BookOpen,
  french: LangIcon,
  arabic: BookOpen,
  islamic: Moon,
  math: Sigma,
};

const copy = {
  en: {
    badge: "Ministerial Questions Bank",
    title: "Ministerial Questions Bank",
    description: "Browse past ministerial questions by subject and chapter.",
    chooseChapter: "Choose a Chapter",
    soon: "Questions coming soon",
    soonBody: "Ministerial questions for this chapter will appear here.",
    question: "Question",
    of: "of",
    yourAnswer: "Your answer",
    typeAnswer: "Type your answer here...",
    review: "Review answer",
    prev: "Previous",
    next: "Next",
    correct: "Correct answer",
    yours: "Your answer",
    noAnswer: "(no answer written)",
    backToQuestion: "Back to question",
    gotIt: "I got it right",
    gotItWrong: "I got it wrong",
    generateExam: "Generate Full Exam",
    generateExamSub: "AI-generated ministerial-style paper for this chapter",
    generating: "Generating exam...",
    regenerate: "Regenerate",
    showAnswers: "Show model answers",
    hideAnswers: "Hide answers",
    answersTitle: "Model Answers",
    print: "Print",
    genError: "Could not generate exam. Please try again.",
    uploadTitle: "Upload your answer for AI grading",
    uploadHint: "Type your answers below, or upload photos of your answer sheet. The AI will grade using the ministerial marking scheme.",
    addImages: "Add answer images",
    typeAnswers: "Type your answers here (or leave empty and upload images)",
    submitForGrading: "Grade my answers",
    grading: "Grading your answers...",
    resultTitle: "Grading Result",
    totalScore: "Total score",
    overallFeedback: "Overall feedback",
    strengths: "Strengths",
    improvements: "To improve",
    perQuestion: "Per-question breakdown",
    notAttempted: "Not attempted",
    correction: "Correction",
    gradeError: "Could not grade the answers. Please try again.",
    provideAnswer: "Please type or upload your answer first.",
    imageTooLarge: "One of the images is too large (max 5MB).",
    tryExam: "Take a new AI-generated exam",
    tryExamSub: "Get a full ministerial-style paper for this chapter and let the AI grade your answers.",
  },
  ar: {
    badge: "بنك الوزاريات",
    title: "بنك الوزاريات",
    description: "تصفّح الأسئلة الوزارية السابقة حسب المادة والفصل.",
    chooseChapter: "اختر الفصل",
    soon: "الأسئلة قريباً",
    soonBody: "ستظهر الأسئلة الوزارية لهذا الفصل هنا.",
    question: "سؤال",
    of: "من",
    yourAnswer: "إجابتك",
    typeAnswer: "اكتب إجابتك هنا...",
    review: "مراجعة الإجابة",
    prev: "السابق",
    next: "التالي",
    correct: "الإجابة الصحيحة",
    yours: "إجابتك",
    noAnswer: "(لم تكتب إجابة)",
    backToQuestion: "العودة إلى السؤال",
    gotIt: "إجابتي صحيحة",
    gotItWrong: "إجابتي خاطئة",
    generateExam: "توليد امتحان كامل",
    generateExamSub: "امتحان وزاري بنمط الأصلية لهذا الفصل بالذكاء الاصطناعي",
    generating: "جاري توليد الامتحان...",
    regenerate: "توليد امتحان جديد",
    showAnswers: "عرض الإجابات النموذجية",
    hideAnswers: "إخفاء الإجابات",
    answersTitle: "الإجابات النموذجية",
    print: "طباعة",
    genError: "تعذّر توليد الامتحان، حاول مرة أخرى.",
    uploadTitle: "ارفع إجابتك ليصححها الذكاء الاصطناعي",
    uploadHint: "اكتب إجاباتك في الأسفل، أو ارفع صوراً من دفترك. سيصحّح الذكاء الاصطناعي وفق معايير التصحيح الوزاري.",
    addImages: "إضافة صور الإجابة",
    typeAnswers: "اكتب إجاباتك هنا (أو اتركها فارغة وارفع صوراً)",
    submitForGrading: "صحّح إجاباتي",
    grading: "جاري تصحيح إجاباتك...",
    resultTitle: "نتيجة التصحيح",
    totalScore: "المجموع الكلي",
    overallFeedback: "الملاحظة العامة",
    strengths: "نقاط القوة",
    improvements: "نقاط للتحسين",
    perQuestion: "التصحيح لكل سؤال",
    notAttempted: "لم يُحل",
    correction: "التصحيح",
    gradeError: "تعذّر تصحيح الإجابات، حاول مرة أخرى.",
    provideAnswer: "الرجاء كتابة إجابتك أو رفع صور أولاً.",
    imageTooLarge: "إحدى الصور كبيرة جداً (الحد 5MB).",
    tryExam: "خذ امتحاناً وزارياً جديداً بالذكاء الاصطناعي",
    tryExamSub: "احصل على ورقة وزارية كاملة لهذا الفصل ودع الذكاء الاصطناعي يصحّح إجاباتك.",
  },
} as const;

const MinisterialBank = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [subject, setSubject] = useState<BankSubject | null>(null);
  const [chapterN, setChapterN] = useState<number | null>(null);
  const [qIndex, setQIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<number, string>>({});
  const [reviewing, setReviewing] = useState(false);
  const [examOpen, setExamOpen] = useState(false);
  const [examLoading, setExamLoading] = useState(false);
  const [examText, setExamText] = useState<string>("");
  const [examAnswers, setExamAnswers] = useState<string>("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [examChapter, setExamChapter] = useState<{ subject: BankSubject; n: number } | null>(null);
  const [studentText, setStudentText] = useState<string>("");
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);

  const back = () => {
    if (examOpen) {
      setExamOpen(false);
    } else if (reviewing) {
      setReviewing(false);
    } else if (chapterN !== null) {
      setChapterN(null);
      setQIndex(0);
      setAnswers({});
    } else if (subject) {
      setSubject(null);
    } else {
      onBack();
    }
  };

  const generateExam = async (subj: BankSubject, n: number) => {
    setExamOpen(true);
    setExamLoading(true);
    setExamText("");
    setExamAnswers("");
    setShowAnswers(false);
    setExamChapter({ subject: subj, n });
    setStudentText("");
    setStudentImages([]);
    setGradeResult(null);
    const ch = getChaptersForSubject(subj).find((c) => c.n === n);
    try {
      const { data, error } = await supabase.functions.invoke("generate-ministerial-exam", {
        body: {
          subject: subj,
          chapterN: n,
          chapterTitleAr: ch?.arTitle ?? "",
          chapterTitleEn: ch?.title ?? "",
          language,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setExamText((data as any)?.exam ?? "");
      setExamAnswers((data as any)?.answers ?? "");
    } catch (e: any) {
      toast({ title: t.genError, description: e?.message ?? "", variant: "destructive" });
      setExamOpen(false);
    } finally {
      setExamLoading(false);
    }
  };

  const handleImagesSelected = async (files: FileList | null) => {
    if (!files || !files.length) return;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      if (file.size > 5 * 1024 * 1024) {
        toast({ title: t.imageTooLarge, variant: "destructive" });
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(file);
      });
      next.push(dataUrl);
    }
    setStudentImages((prev) => [...prev, ...next].slice(0, 10));
  };

  const submitGrading = async () => {
    if (!studentText.trim() && !studentImages.length) {
      toast({ title: t.provideAnswer, variant: "destructive" });
      return;
    }
    setGrading(true);
    setGradeResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("grade-ministerial-exam", {
        body: {
          examText,
          modelAnswers: examAnswers,
          studentText: studentText.trim(),
          studentImages,
          language,
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setGradeResult(data);
    } catch (e: any) {
      toast({ title: t.gradeError, description: e?.message ?? "", variant: "destructive" });
    } finally {
      setGrading(false);
    }
  };

  const chapters = subject ? getChaptersForSubject(subject) : [];
  const subjectMeta = SUBJECTS_ORDER.find((s) => s.code === subject);
  const questions =
    subject === "physics" && chapterN === 1
      ? (language === "ar" ? ministerialPhysicsCh1Ar : ministerialPhysicsCh1)
      : subject === "physics" && chapterN === 2
      ? (language === "ar" ? ministerialPhysicsCh2Ar : ministerialPhysicsCh2)
      : subject === "chemistry" && chapterN === 1
      ? (language === "ar" ? ministerialChemCh1Ar : ministerialChemCh1)
      : subject === "chemistry" && chapterN === 2
        ? (language === "ar" ? ministerialChemCh2Ar : ministerialChemCh2)
        : subject === "chemistry" && chapterN === 3
          ? (language === "ar" ? ministerialChemCh3Ar : ministerialChemCh3)
          : subject === "chemistry" && chapterN === 4
            ? (language === "ar" ? ministerialChemCh4Ar : ministerialChemCh4)
            : subject === "chemistry" && chapterN === 5
              ? (language === "ar" ? ministerialChemCh5Ar : ministerialChemCh5)
              : subject === "chemistry" && chapterN === 6
                ? (language === "ar" ? ministerialChemCh6Ar : ministerialChemCh6)
                : subject === "arabic" && chapterN === 2
                ? ministerialArabicIstifham
                : subject === "arabic" && chapterN === 3
                ? ministerialArabicMadhDham
                : subject === "arabic" && chapterN === 4
                ? ministerialArabicTaajjub
                : subject === "arabic" && chapterN === 5
                ? ministerialArabicNida
                : subject === "biology" && chapterN === 1 && language === "ar"
                ? ministerialBioCh1Ar
                : [];
  const hasQuestionBank = questions.length > 0;
  const current = questions[qIndex];

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={back}
        aria-label="Back"
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">
          {subject ? (language === "ar" ? subjectMeta?.ar : subjectMeta?.en) : t.title}
        </h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">
          {subject ? t.chooseChapter : t.description}
        </p>
      </header>

      {!subject ? (
        <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative">
          {SUBJECTS_ORDER.map((s, i) => {
            const Icon = subjectIcons[s.code];
            return (
              <button
                key={s.code}
                onClick={() => setSubject(s.code)}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group relative text-left rounded-3xl p-6 h-44 border border-primary/40 bg-secondary/40 backdrop-blur overflow-hidden cursor-pointer shadow-lg hover:-translate-y-2 hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all duration-500 animate-fade-up"
              >
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                </div>
                <div className="relative z-10 mt-6">
                  <h3 className="text-2xl font-semibold text-foreground">{language === "ar" ? s.ar : s.en}</h3>
                </div>
              </button>
            );
          })}
        </section>
      ) : chapterN === null ? (
        <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 z-10 relative">
          {chapters.map((c, i) => {
            const isAvailable = !c.locked;
            return (
              <button
                key={c.n}
                onClick={() => isAvailable && setChapterN(c.n)}
                disabled={c.locked}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`group relative text-left rounded-3xl p-6 h-56 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up ${
                  isAvailable
                    ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                    : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"
                }`}
              >
                {isAvailable && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
                )}
                <div className="relative z-10 flex items-start justify-between">
                  <span className={`text-6xl font-bold font-mono leading-none ${isAvailable ? "gradient-text" : "text-muted-foreground/40"}`}>
                    {String(c.n).padStart(2, "0")}
                  </span>
                  {c.locked ? (
                    <Lock className="w-4 h-4 text-muted-foreground/60" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
                <div className="relative z-10 absolute bottom-6 left-6 right-6">
                  <h3 className={`text-lg font-semibold ${language === "ar" ? "text-center" : ""} ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                    {language === "ar" ? c.arTitle : c.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </section>
      ) : examOpen ? (
        <section className="max-w-3xl mx-auto mt-12 z-10 relative animate-fade-up">
          {examLoading ? (
            <div className="rounded-3xl p-14 border border-primary/40 bg-secondary/40 backdrop-blur text-center">
              <Loader2 className="w-10 h-10 mx-auto mb-4 text-primary animate-spin" />
              <p className="text-muted-foreground">{t.generating}</p>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex flex-wrap items-center justify-end gap-2 print:hidden">
                <button
                  onClick={() => examChapter && generateExam(examChapter.subject, examChapter.n)}
                  className="h-10 px-4 rounded-xl border border-primary/40 bg-secondary/40 backdrop-blur text-sm text-foreground hover:border-primary transition-all inline-flex items-center gap-2"
                >
                  <RefreshCw className="w-4 h-4" /> {t.regenerate}
                </button>
                <button
                  onClick={() => setShowAnswers((v) => !v)}
                  className="h-10 px-4 rounded-xl border border-primary/40 bg-primary/10 text-sm text-primary hover:bg-primary/20 transition-all inline-flex items-center gap-2"
                >
                  <Eye className="w-4 h-4" /> {showAnswers ? t.hideAnswers : t.showAnswers}
                </button>
                <button
                  onClick={() => window.print()}
                  className="h-10 px-4 rounded-xl border border-white/10 bg-secondary/40 backdrop-blur text-sm text-foreground hover:border-primary/40 transition-all inline-flex items-center gap-2"
                >
                  <Printer className="w-4 h-4" /> {t.print}
                </button>
              </div>
              <article
                dir="rtl"
                className="rounded-3xl p-8 md:p-10 border border-primary/40 bg-white text-neutral-900 shadow-xl leading-loose whitespace-pre-wrap font-serif text-[15px] md:text-base print:border-0 print:shadow-none print:bg-white print:text-black"
                style={{ fontFamily: "'Amiri','Scheherazade New','Traditional Arabic',serif" }}
              >
                {examText}
              </article>
              {showAnswers && examAnswers && (
                <article
                  dir="rtl"
                  className="rounded-3xl p-8 md:p-10 border border-emerald-400/40 bg-emerald-50 text-neutral-900 shadow-xl leading-loose whitespace-pre-wrap font-serif text-[15px] md:text-base"
                  style={{ fontFamily: "'Amiri','Scheherazade New','Traditional Arabic',serif" }}
                >
                  <div className="text-emerald-700 font-bold mb-4 text-lg">{t.answersTitle}</div>
                  {examAnswers}
                </article>
              )}
            </div>
          )}
        </section>
      ) : (
        hasQuestionBank && current ? (
          reviewing ? (
            <section className="max-w-3xl mx-auto mt-12 z-10 relative animate-fade-up space-y-5">
              <div className="text-center text-xs uppercase tracking-[0.3em] text-muted-foreground">
                {t.question} {qIndex + 1} {t.of} {questions.length}
              </div>
              <div className="rounded-3xl p-6 md:p-8 border border-primary/40 bg-secondary/40 backdrop-blur">
                <p className="text-lg md:text-xl text-foreground leading-relaxed">{current.q}</p>
              </div>
              <div className="rounded-3xl p-6 md:p-8 border border-emerald-400/30 bg-emerald-500/10 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-2">{t.correct}</div>
                <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{current.a}</p>
              </div>
              <div className="rounded-3xl p-6 md:p-8 border border-white/10 bg-secondary/40 backdrop-blur">
                <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t.yours}</div>
                <p className="text-foreground/80 leading-relaxed whitespace-pre-wrap">
                  {answers[qIndex]?.trim() ? answers[qIndex] : <span className="text-muted-foreground italic">{t.noAnswer}</span>}
                </p>
              </div>
              <div className="flex items-center justify-center gap-6 pt-2">
                <button
                  onClick={() => setReviewing(false)}
                  aria-label={t.gotItWrong}
                  title={t.gotItWrong}
                  className="w-16 h-16 rounded-full border border-red-400/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-400 transition-all flex items-center justify-center"
                >
                  <X className="w-7 h-7" />
                </button>
                <button
                  onClick={() => {
                    if (qIndex < questions.length - 1) {
                      setQIndex((i) => i + 1);
                    }
                    setReviewing(false);
                  }}
                  aria-label={t.gotIt}
                  title={t.gotIt}
                  className="w-16 h-16 rounded-full border border-emerald-400/40 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20 hover:border-emerald-400 transition-all flex items-center justify-center"
                >
                  <Check className="w-7 h-7" />
                </button>
              </div>
            </section>
          ) : (
            <section className="max-w-3xl mx-auto mt-12 z-10 relative animate-fade-up space-y-5">
              <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-muted-foreground">
                <span>{t.question} {qIndex + 1} {t.of} {questions.length}</span>
              </div>
              <div className="rounded-3xl p-6 md:p-8 border border-primary/40 bg-secondary/40 backdrop-blur">
                <p className="text-lg md:text-xl text-foreground leading-relaxed">{current.q}</p>
              </div>
              <div>
                <label className="block text-sm text-muted-foreground mb-2">{t.yourAnswer}</label>
                <Textarea
                  value={answers[qIndex] ?? ""}
                  onChange={(e) => setAnswers((a) => ({ ...a, [qIndex]: e.target.value }))}
                  placeholder={t.typeAnswer}
                  className="min-h-[180px] rounded-2xl bg-secondary/40 backdrop-blur border-white/10 text-base"
                  dir={language === "ar" ? "rtl" : "ltr"}
                />
              </div>
              <button
                onClick={() => setReviewing(true)}
                className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2"
              >
                <Eye className="w-4 h-4" /> {t.review}
              </button>
              <div className="flex items-center justify-between gap-3 pt-2">
                <button
                  onClick={() => setQIndex((i) => Math.max(0, i - 1))}
                  disabled={qIndex === 0}
                  className="flex-1 h-11 rounded-xl border border-white/10 bg-secondary/40 backdrop-blur text-foreground hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  <ChevronLeft className="w-4 h-4" /> {t.prev}
                </button>
                <button
                  onClick={() => setQIndex((i) => Math.min(questions.length - 1, i + 1))}
                  disabled={qIndex >= questions.length - 1}
                  className="flex-1 h-11 rounded-xl border border-white/10 bg-secondary/40 backdrop-blur text-foreground hover:border-primary/40 transition-all disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2"
                >
                  {t.next} <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </section>
          )
        ) : (
        <section className="max-w-3xl mx-auto mt-14 md:mt-20 z-10 relative animate-fade-up">
          <div className="rounded-3xl p-10 border border-primary/40 bg-secondary/40 backdrop-blur text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-primary/15">
              <ScrollText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">{t.soon}</h3>
            <p className="text-muted-foreground">{t.soonBody}</p>
          </div>
        </section>
        )
      )}
    </main>
  );
};

export default MinisterialBank;