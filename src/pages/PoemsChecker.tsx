import { useState } from "react";
import { ArrowLeft, Sparkles, Eye, Loader2, Check, X, AlertTriangle, ChevronLeft, ChevronRight, BookOpen, Lightbulb, Pencil } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { ARABIC_POEMS } from "@/data/arabicPoems";

type Mistake = {
  student_wrote?: string;
  should_be?: string;
  kind?: "missing" | "extra" | "wrong_word" | "spelling" | "order" | string;
  note?: string;
};

type PoemResult = {
  verdict: "correct" | "minor_errors" | "incorrect" | "not_in_reference";
  score?: number;
  summary?: string;
  correct_text?: string;
  mistakes?: Mistake[];
  tips?: string[];
  source_hint?: string;
};

const copy = {
  en: {
    badge: "Poems Checker",
    title: "Arabic Literature Poems",
    description: "Type a poem from the curriculum and AI will check it against the official text.",
    placeholder: "Type the poem here...",
    verify: "Check Poem",
    verifying: "Checking...",
    verdictCorrect: "Correct",
    verdictMinor: "Almost correct",
    verdictIncorrect: "Incorrect wording",
    verdictNotFound: "Doesn't match this poem",
    correctText: "Correct text",
    mistakes: "Differences",
    source: "Source",
    errorGeneric: "Couldn't check right now. Please try again.",
    selectPoem: "Pick a poem",
    prev: "Previous",
    next: "Next",
    poemLabel: "Poem",
    yourAnswer: "Your answer (mistakes highlighted)",
    notes: "Teacher's notes",
    tips: "Study tips",
    showRef: "Show original",
    hideRef: "Hide original",
    by: "by",
    kindMissing: "missing word",
    kindExtra: "extra word",
    kindWrong: "wrong word",
    kindSpelling: "spelling",
    kindOrder: "wrong order",
    kindTashkeel: "harakah / tashkeel",
    youWrote: "You wrote",
    shouldBe: "Should be",
  },
  ar: {
    badge: "فاحص القصائد",
    title: "قصائد الأدب",
    description: "اكتب قصيدة من المنهج وسيتحقق الذكاء الاصطناعي من صحتها بالاعتماد على النص الرسمي.",
    placeholder: "اكتب القصيدة هنا...",
    verify: "تحقّق من القصيدة",
    verifying: "جاري التحقق...",
    verdictCorrect: "صحيح",
    verdictMinor: "قريب من الصحيح",
    verdictIncorrect: "صياغة غير صحيحة",
    verdictNotFound: "النص لا يطابق هذه القصيدة",
    correctText: "النص الصحيح",
    mistakes: "الفروقات",
    source: "المصدر",
    errorGeneric: "تعذّر التحقق الآن. حاول مرة أخرى.",
    selectPoem: "اختر قصيدة",
    prev: "السابق",
    next: "التالي",
    poemLabel: "القصيدة",
    yourAnswer: "إجابتك (مع تمييز الأخطاء)",
    notes: "ملاحظات المعلّم",
    tips: "نصائح للحفظ",
    showRef: "إظهار النص الأصلي",
    hideRef: "إخفاء النص الأصلي",
    by: "للشاعر",
    kindMissing: "كلمة ناقصة",
    kindExtra: "كلمة زائدة",
    kindWrong: "كلمة خاطئة",
    kindSpelling: "خطأ إملائي",
    kindOrder: "ترتيب خاطئ",
    kindTashkeel: "حركة/تشكيل",
    youWrote: "كتبتَ",
    shouldBe: "والصواب",
  },
} as const;

const PoemsChecker = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [index, setIndex] = useState(0);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<PoemResult | null>(null);
  const [submitted, setSubmitted] = useState("");
  const [showRef, setShowRef] = useState(false);
  const current = ARABIC_POEMS[index];

  const goTo = (i: number) => {
    setIndex(i);
    setInput("");
    setResult(null);
    setSubmitted("");
    setShowRef(false);
  };
  const goPrev = () => goTo((index - 1 + ARABIC_POEMS.length) % ARABIC_POEMS.length);
  const goNext = () => goTo((index + 1) % ARABIC_POEMS.length);

  const verify = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult(null);
    setSubmitted(text);
    try {
      const { data, error } = await supabase.functions.invoke("verify-poem", {
        body: {
          poem: text,
          language,
          poemTitle: current.title,
          poemAuthor: current.author,
          referenceText: current.text,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setResult(data?.result as PoemResult);
    } catch {
      toast({ title: t.errorGeneric, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const kindLabel = (k?: string) => {
    switch (k) {
      case "missing": return t.kindMissing;
      case "extra": return t.kindExtra;
      case "wrong_word": return t.kindWrong;
      case "spelling": return t.kindSpelling;
      case "order": return t.kindOrder;
      case "tashkeel": return t.kindTashkeel;
      default: return "";
    }
  };

  const renderAnnotated = (text: string, mistakes: Mistake[]) => {
    const wrongs = mistakes.map((m) => (m.student_wrote || "").trim()).filter(Boolean);
    if (wrongs.length === 0) return <span>{text}</span>;
    const escape = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${wrongs.map(escape).join("|")})`, "g");
    const parts = text.split(re);
    return (
      <>
        {parts.map((p, i) =>
          wrongs.includes(p.trim()) ? (
            <mark
              key={i}
              className="bg-red-500/30 text-red-200 rounded px-1 mx-0.5 underline decoration-red-400 decoration-wavy underline-offset-4"
            >
              {p}
            </mark>
          ) : (
            <span key={i}>{p}</span>
          )
        )}
      </>
    );
  };

  const verdictMeta = (v: PoemResult["verdict"]) => {
    switch (v) {
      case "correct": return { label: t.verdictCorrect, color: "emerald", Icon: Check };
      case "minor_errors": return { label: t.verdictMinor, color: "amber", Icon: AlertTriangle };
      case "incorrect": return { label: t.verdictIncorrect, color: "red", Icon: X };
      default: return { label: t.verdictNotFound, color: "muted", Icon: X };
    }
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onBack}
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
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">{t.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{t.description}</p>
      </header>

      <section className="max-w-3xl mx-auto mt-12 z-10 relative animate-fade-up space-y-5">
        <div className="rounded-3xl p-5 border border-white/10 bg-secondary/40 backdrop-blur space-y-4">
          <div className="flex items-center justify-between gap-3">
            <button onClick={goPrev} aria-label={t.prev} className="w-10 h-10 rounded-full border border-white/10 bg-background/40 flex items-center justify-center hover:border-primary/40 transition-colors">
              {language === "ar" ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
            </button>
            <div className="flex-1 text-center">
              <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-1">
                {t.poemLabel} {index + 1} / {ARABIC_POEMS.length}
              </div>
              <div className="text-lg md:text-xl font-semibold text-foreground" dir="rtl">{current.title}</div>
              <div className="text-xs text-muted-foreground mt-0.5" dir="rtl">{t.by} {current.author}</div>
            </div>
            <button onClick={goNext} aria-label={t.next} className="w-10 h-10 rounded-full border border-white/10 bg-background/40 flex items-center justify-center hover:border-primary/40 transition-colors">
              {language === "ar" ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </button>
          </div>
          <div>
            <label className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">
              <BookOpen className="w-3.5 h-3.5" /> {t.selectPoem}
            </label>
            <select
              value={index}
              onChange={(e) => goTo(Number(e.target.value))}
              className="w-full h-11 rounded-2xl bg-background/40 border border-white/10 px-3 text-base text-foreground"
              dir="rtl"
            >
              {ARABIC_POEMS.map((p, i) => (
                <option key={i} value={i}>{i + 1}. {p.title} — {p.author}</option>
              ))}
            </select>
          </div>
          <button
            onClick={() => setShowRef((s) => !s)}
            className="w-full h-10 rounded-2xl border border-white/10 bg-background/40 text-sm text-foreground/80 hover:border-primary/40 transition-colors"
          >
            {showRef ? t.hideRef : t.showRef}
          </button>
          {showRef && (
            <pre className="whitespace-pre-wrap text-foreground/90 leading-loose text-base font-sans rounded-2xl p-4 bg-background/40 border border-white/10" dir="rtl">
              {current.text}
            </pre>
          )}
        </div>

        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="min-h-[220px] rounded-2xl bg-secondary/40 backdrop-blur border-white/10 text-base"
          dir="rtl"
        />
        <button
          onClick={verify}
          disabled={loading || !input.trim()}
          className="w-full h-12 rounded-2xl bg-primary text-primary-foreground font-medium hover:opacity-90 transition-opacity inline-flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> {t.verifying}</>
          ) : (
            <><Eye className="w-4 h-4" /> {t.verify}</>
          )}
        </button>
        {result && (() => {
          const m = verdictMeta(result.verdict);
          const colorMap: Record<string, string> = {
            emerald: "border-emerald-400/40 bg-emerald-500/10 text-emerald-300",
            amber: "border-amber-400/40 bg-amber-500/10 text-amber-300",
            red: "border-red-400/40 bg-red-500/10 text-red-300",
            muted: "border-white/10 bg-secondary/40 text-muted-foreground",
          };
          return (
            <div className="space-y-4">
              <div className={`rounded-3xl p-6 border backdrop-blur ${colorMap[m.color]}`}>
                <div className="flex items-center gap-2 mb-2">
                  <m.Icon className="w-5 h-5" />
                  <span className="font-semibold">{m.label}</span>
                  {typeof result.score === "number" && (
                    <span className="ms-auto text-xs opacity-80">{result.score}%</span>
                  )}
                </div>
                {result.summary && <p className="text-foreground/90 leading-relaxed">{result.summary}</p>}
              </div>
              {result.correct_text && (
                <div className="rounded-3xl p-6 border border-emerald-400/30 bg-emerald-500/5 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-2">{t.correctText}</div>
                  <p className="text-foreground/90 leading-loose whitespace-pre-wrap" dir="rtl">{result.correct_text}</p>
                </div>
              )}
              {submitted && result.mistakes && result.mistakes.length > 0 && (
                <div className="rounded-3xl p-6 border border-amber-400/30 bg-amber-500/5 backdrop-blur">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-amber-300 mb-3">
                    <Pencil className="w-3.5 h-3.5" /> {t.yourAnswer}
                  </div>
                  <p className="text-foreground/90 leading-loose whitespace-pre-wrap text-lg" dir="rtl">
                    {renderAnnotated(submitted, result.mistakes)}
                  </p>
                </div>
              )}
              {result.mistakes && result.mistakes.length > 0 && (
                <div className="rounded-3xl p-6 border border-white/10 bg-secondary/40 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-3">{t.notes}</div>
                  <ol className="space-y-3" dir="rtl">
                    {result.mistakes.map((mk, i) => (
                      <li key={i} className="rounded-2xl border border-white/10 bg-background/40 p-4">
                        <div className="flex items-center gap-2 mb-2">
                          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-primary/20 text-primary text-xs font-bold">{i + 1}</span>
                          {kindLabel(mk.kind) && (
                            <span className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground">{kindLabel(mk.kind)}</span>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-x-3 gap-y-1 text-sm mb-2">
                          {mk.student_wrote ? (
                            <span>
                              <span className="text-muted-foreground">{t.youWrote}: </span>
                              <span className="text-red-300 line-through">{mk.student_wrote}</span>
                            </span>
                          ) : null}
                          {mk.should_be ? (
                            <span>
                              <span className="text-muted-foreground">{t.shouldBe}: </span>
                              <span className="text-emerald-300 font-semibold">{mk.should_be}</span>
                            </span>
                          ) : null}
                        </div>
                        {mk.note && <p className="text-foreground/80 text-sm leading-relaxed">{mk.note}</p>}
                      </li>
                    ))}
                  </ol>
                </div>
              )}
              {result.tips && result.tips.length > 0 && (
                <div className="rounded-3xl p-6 border border-primary/20 bg-primary/5 backdrop-blur">
                  <div className="flex items-center gap-2 text-xs uppercase tracking-[0.25em] text-primary mb-2">
                    <Lightbulb className="w-3.5 h-3.5" /> {t.tips}
                  </div>
                  <ul className="list-disc ps-5 space-y-1 text-foreground/80">
                    {result.tips.map((tip, i) => <li key={i}>{tip}</li>)}
                  </ul>
                </div>
              )}
              {result.source_hint && (
                <div className="rounded-2xl p-4 border border-white/10 bg-secondary/30 backdrop-blur text-sm text-muted-foreground">
                  <span className="font-medium text-foreground/80">{t.source}:</span> {result.source_hint}
                </div>
              )}
            </div>
          );
        })()}
      </section>
    </main>
  );
};

export default PoemsChecker;