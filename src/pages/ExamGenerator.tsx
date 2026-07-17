import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Loader2, RefreshCw, Eye, Printer, Upload, GraduationCap, ImagePlus, Trash2, Lock, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, Moon, Sigma } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECTS_ORDER, getChaptersForSubject, type BankSubject } from "@/data/subjectChapters";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
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
    badge: "AI Exam Generator",
    title: "Full Exam Generator",
    description: "Generate a full ministerial-style exam for the chapter you choose.",
    chooseChapter: "Choose a Chapter",
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
    notSatisfied: "Not satisfied with the AI grading?",
    notSatisfiedHint: "Send your paper to a real human teacher for review. Reply arrives in Telegram.",
    sendToHuman: "Send to a real teacher",
    tgUsernameLabel: "Your Telegram username (without @)",
    tgUsernamePh: "e.g. ali_2007",
    reasonLabel: "Optional note to the teacher",
    reasonPh: "Why do you think the AI grade is wrong?",
    sending: "Sending...",
    sent: "Sent to human grader. They will contact you on Telegram.",
    sendErr: "Could not send. Please try again.",
    invalidTg: "Please enter a valid Telegram username.",
  },
  ar: {
    badge: "مولّد الامتحانات الذكي",
    title: "توليد امتحان كامل",
    description: "أنشئ امتحاناً وزارياً كاملاً للفصل الذي تختاره.",
    chooseChapter: "اختر الفصل",
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
    notSatisfied: "غير راضٍ عن تصحيح الذكاء الاصطناعي؟",
    notSatisfiedHint: "أرسل ورقتك ليصححها مدرّس حقيقي — الجواب يصلك عبر تيليغرام.",
    sendToHuman: "أرسل لمدرّس حقيقي",
    tgUsernameLabel: "اسم مستخدم تيليغرام (بدون @)",
    tgUsernamePh: "مثال: ali_2007",
    reasonLabel: "ملاحظة اختيارية للمدرّس",
    reasonPh: "لماذا تعتقد أن تصحيح الذكاء غير صحيح؟",
    sending: "جاري الإرسال...",
    sent: "تم الإرسال إلى المدرّس. سيتواصل معك عبر تيليغرام.",
    sendErr: "تعذّر الإرسال، حاول مرة أخرى.",
    invalidTg: "الرجاء إدخال اسم مستخدم تيليغرام صحيح.",
  },
} as const;

const isBankSubject = (v: string | null): v is BankSubject =>
  !!v && ["physics","chemistry","biology","english","french","arabic","islamic","math"].includes(v);

const ExamGenerator = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [subject, setSubject] = useState<BankSubject | null>(null);
  const [chapterN, setChapterN] = useState<number | null>(null);
  const [examLoading, setExamLoading] = useState(false);
  const [examText, setExamText] = useState("");
  const [examAnswers, setExamAnswers] = useState("");
  const [showAnswers, setShowAnswers] = useState(false);
  const [studentText, setStudentText] = useState("");
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [showHumanForm, setShowHumanForm] = useState(false);
  const [tgUsername, setTgUsername] = useState("");
  const [humanReason, setHumanReason] = useState("");
  const [sendingHuman, setSendingHuman] = useState(false);
  const [humanSent, setHumanSent] = useState(false);
  const [routedSubject, setRoutedSubject] = useState<string>("");

  useEffect(() => {
    try {
      const s = localStorage.getItem("app_subject_v1");
      if (isBankSubject(s)) setSubject(s);
    } catch { /* ignore */ }
  }, []);

  const back = () => {
    if (chapterN !== null) { setChapterN(null); return; }
    try {
      const preset = localStorage.getItem("app_subject_v1");
      if (isBankSubject(preset)) { onBack(); return; }
    } catch { /* ignore */ }
    if (subject) { setSubject(null); return; }
    onBack();
  };

  const generateExam = async (subj: BankSubject, n: number) => {
    setExamLoading(true);
    setExamText("");
    setExamAnswers("");
    setShowAnswers(false);
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
      setChapterN(null);
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
    setShowHumanForm(false);
    setHumanSent(false);
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

  const sendToHuman = async () => {
    const uname = tgUsername.trim().replace(/^@+/, "");
    if (!/^[A-Za-z0-9_]{4,32}$/.test(uname)) {
      toast({ title: t.invalidTg, variant: "destructive" });
      return;
    }
    setSendingHuman(true);
    try {
      const ch = subject ? getChaptersForSubject(subject).find((c) => c.n === chapterN) : null;
      const { data, error } = await supabase.functions.invoke("send-to-human-grader", {
        body: {
          telegramUsername: uname,
          subject: subject ? (language === "ar" ? subjectMeta?.ar : subjectMeta?.en) : "",
          subjectCode: subject ?? "",
          chapter: ch ? (language === "ar" ? ch.arTitle : ch.title) : "",
          examText,
          studentText: studentText.trim(),
          studentImages,
          aiScore: gradeResult ? `${Math.round(Number(gradeResult.total) || 0)} / ${Number(gradeResult.graded_out_of) || 100}` : "",
          reason: humanReason.trim(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setHumanSent(true);
      setRoutedSubject((data as any)?.routed ? String((data as any)?.subjectCode ?? "") : "");
      toast({ title: t.sent });
    } catch (e: any) {
      toast({ title: t.sendErr, description: e?.message ?? "", variant: "destructive" });
    } finally {
      setSendingHuman(false);
    }
  };

  const subjectMeta = SUBJECTS_ORDER.find((s) => s.code === subject);
  const chapters = subject ? getChaptersForSubject(subject) : [];

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
                className="group relative text-left rounded-3xl p-6 h-44 border border-primary/40 bg-secondary/40 backdrop-blur overflow-hidden cursor-pointer shadow-lg hover:-translate-y-2 hover:border-primary transition-all duration-500 animate-fade-up"
              >
                <div className="relative z-10 flex items-start justify-between">
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15">
                    <Icon className="w-6 h-6 text-primary" />
                  </div>
                  <ArrowRight className="w-5 h-5 text-primary" />
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
                onClick={() => { if (!isAvailable) return; setChapterN(c.n); generateExam(subject, c.n); }}
                disabled={c.locked}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`group relative text-left rounded-3xl p-6 h-56 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up ${
                  isAvailable
                    ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg"
                    : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"
                }`}
              >
                <div className="relative z-10 flex items-start justify-between">
                  <span className={`text-6xl font-bold font-mono leading-none ${isAvailable ? "gradient-text" : "text-muted-foreground/40"}`}>
                    {String(c.n).padStart(2, "0")}
                  </span>
                  {c.locked ? <Lock className="w-4 h-4 text-muted-foreground/60" /> : <GraduationCap className="w-5 h-5 text-primary" />}
                </div>
                <div className="absolute bottom-6 left-6 right-6">
                  <h3 className={`text-lg font-semibold ${language === "ar" ? "text-center" : ""} ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                    {language === "ar" ? c.arTitle : c.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </section>
      ) : (
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
                  onClick={() => generateExam(subject, chapterN)}
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

              <div className="rounded-3xl p-6 md:p-8 border border-primary/40 bg-secondary/40 backdrop-blur space-y-4 print:hidden">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center">
                    <Upload className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{t.uploadTitle}</h3>
                    <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
                  </div>
                </div>

                <Textarea
                  value={studentText}
                  onChange={(e) => setStudentText(e.target.value)}
                  placeholder={t.typeAnswers}
                  className="min-h-[140px] rounded-2xl bg-background/60 border-white/10 text-base"
                  dir={language === "ar" ? "rtl" : "ltr"}
                />

                {studentImages.length > 0 && (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {studentImages.map((src, i) => (
                      <div key={i} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10">
                        <img src={src} alt={`answer ${i + 1}`} className="w-full h-full object-cover" />
                        <button
                          onClick={() => setStudentImages((prev) => prev.filter((_, idx) => idx !== i))}
                          className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                          aria-label="remove"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                <div className="flex flex-col sm:flex-row gap-2">
                  <label className="flex-1 h-11 rounded-xl border border-white/10 bg-background/60 text-foreground hover:border-primary/40 transition-all inline-flex items-center justify-center gap-2 cursor-pointer text-sm">
                    <ImagePlus className="w-4 h-4" /> {t.addImages}
                    <input
                      type="file"
                      accept="image/*"
                      multiple
                      className="hidden"
                      onChange={(e) => {
                        handleImagesSelected(e.target.files);
                        e.currentTarget.value = "";
                      }}
                    />
                  </label>
                  <button
                    onClick={submitGrading}
                    disabled={grading}
                    className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                    {grading ? t.grading : t.submitForGrading}
                  </button>
                </div>
              </div>

              {gradeResult && (
                <div className="rounded-3xl p-6 md:p-8 border border-primary/40 bg-secondary/60 backdrop-blur space-y-5 print:hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xl font-bold text-foreground">{t.resultTitle}</h3>
                    <div className="text-right">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.totalScore}</div>
                      <div className="text-3xl font-bold gradient-text">
                        {Math.round(Number(gradeResult.total) || 0)} / {Number(gradeResult.graded_out_of) || 100}
                      </div>
                    </div>
                  </div>
                  {gradeResult.overall_feedback && (
                    <div>
                      <div className="text-xs uppercase tracking-widest text-muted-foreground mb-1">{t.overallFeedback}</div>
                      <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap">{gradeResult.overall_feedback}</p>
                    </div>
                  )}
                  <div className="grid sm:grid-cols-2 gap-4">
                    {Array.isArray(gradeResult.strengths) && gradeResult.strengths.length > 0 && (
                      <div className="rounded-2xl p-4 border border-emerald-400/30 bg-emerald-500/10">
                        <div className="text-xs uppercase tracking-widest text-emerald-300 mb-2">{t.strengths}</div>
                        <ul className="list-disc ms-5 space-y-1 text-foreground/90 text-sm">
                          {gradeResult.strengths.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                    {Array.isArray(gradeResult.improvements) && gradeResult.improvements.length > 0 && (
                      <div className="rounded-2xl p-4 border border-amber-400/30 bg-amber-500/10">
                        <div className="text-xs uppercase tracking-widest text-amber-300 mb-2">{t.improvements}</div>
                        <ul className="list-disc ms-5 space-y-1 text-foreground/90 text-sm">
                          {gradeResult.improvements.map((s: string, i: number) => <li key={i}>{s}</li>)}
                        </ul>
                      </div>
                    )}
                  </div>
                  {Array.isArray(gradeResult.per_question) && gradeResult.per_question.length > 0 && (
                    <div className="space-y-3">
                      <div className="text-xs uppercase tracking-widest text-muted-foreground">{t.perQuestion}</div>
                      {gradeResult.per_question.map((q: any) => (
                        <div key={q.n} className="rounded-2xl p-4 border border-white/10 bg-background/40">
                          <div className="flex items-center justify-between mb-2">
                            <div className="font-semibold text-foreground">
                              {language === "ar" ? `س${q.n}` : `Q${q.n}`}
                              {q.attempted === false && <span className="ms-2 text-xs text-muted-foreground">({t.notAttempted})</span>}
                            </div>
                            <div className="text-sm font-mono text-primary">{Math.round(Number(q.score) || 0)} / 20</div>
                          </div>
                          {q.feedback && <p className="text-sm text-foreground/85 leading-relaxed whitespace-pre-wrap">{q.feedback}</p>}
                          {q.corrections && (
                            <div className="mt-2 pt-2 border-t border-white/5">
                              <div className="text-xs uppercase tracking-widest text-emerald-400/80 mb-1">{t.correction}</div>
                              <p className="text-sm text-foreground/80 leading-relaxed whitespace-pre-wrap">{q.corrections}</p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="mt-2 rounded-2xl p-4 border border-amber-400/30 bg-amber-500/10">
                    <div className="flex items-start gap-3">
                      <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-300 flex items-center justify-center shrink-0">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <div className="flex-1">
                        <div className="font-semibold text-foreground">{t.notSatisfied}</div>
                        <div className="text-xs text-muted-foreground mt-0.5">{t.notSatisfiedHint}</div>
                      </div>
                      {!showHumanForm && !humanSent && (
                        <button
                          onClick={() => setShowHumanForm(true)}
                          className="h-9 px-3 rounded-lg text-xs font-semibold bg-amber-400/90 text-black hover:bg-amber-300 transition"
                        >
                          {t.sendToHuman}
                        </button>
                      )}
                    </div>

                    {showHumanForm && !humanSent && (
                      <div className="mt-4 space-y-3">
                        <div>
                          <label className="block text-xs font-semibold mb-1">{t.tgUsernameLabel}</label>
                          <div className="flex items-center gap-2">
                            <span className="text-muted-foreground text-sm">@</span>
                            <input
                              value={tgUsername}
                              onChange={(e) => setTgUsername(e.target.value)}
                              placeholder={t.tgUsernamePh}
                              maxLength={32}
                              dir="ltr"
                              className="flex-1 h-10 px-3 rounded-lg border border-white/10 bg-background/60 text-sm"
                            />
                          </div>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold mb-1">{t.reasonLabel}</label>
                          <Textarea
                            value={humanReason}
                            onChange={(e) => setHumanReason(e.target.value)}
                            placeholder={t.reasonPh}
                            maxLength={500}
                            className="min-h-[80px] rounded-xl bg-background/60 border-white/10 text-sm"
                            dir={language === "ar" ? "rtl" : "ltr"}
                          />
                        </div>
                        <button
                          onClick={sendToHuman}
                          disabled={sendingHuman}
                          className="w-full h-11 rounded-xl bg-amber-400 text-black font-semibold hover:bg-amber-300 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
                        >
                          {sendingHuman ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                          {sendingHuman ? t.sending : t.sendToHuman}
                        </button>
                      </div>
                    )}

                    {humanSent && (
                      <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
                        <div>✓ {t.sent}</div>
                        {routedSubject && (
                          <div className="mt-1 text-xs text-emerald-200/90">
                            {language === "ar"
                              ? `تم توجيه الاعتراض إلى كروب ${({ physics: "الفيزياء", chemistry: "الكيمياء", biology: "الأحياء", math: "الرياضيات" } as Record<string,string>)[routedSubject] ?? routedSubject} الخاص بالمصححين.`
                              : `Your request was routed to the ${({ physics: "Physics", chemistry: "Chemistry", biology: "Biology", math: "Math" } as Record<string,string>)[routedSubject] ?? routedSubject} graders group.`}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default ExamGenerator;