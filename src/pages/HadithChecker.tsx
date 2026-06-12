import { useState } from "react";
import { ArrowLeft, Sparkles, Eye, Loader2, Check, X, AlertTriangle } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type HadithResult = {
  verdict: "correct" | "minor_errors" | "incorrect" | "not_in_reference";
  score?: number;
  summary?: string;
  correct_text?: string;
  differences?: string[];
  source_hint?: string;
};

const copy = {
  en: {
    badge: "Hadith Checker",
    title: "Hadith Checker",
    description: "Type a Prophetic Hadith and the AI will check it against the official curriculum book.",
    placeholder: "Type the hadith here...",
    verify: "Check Hadith",
    verifying: "Checking...",
    verdictCorrect: "Correct",
    verdictMinor: "Almost correct",
    verdictIncorrect: "Incorrect wording",
    verdictNotFound: "Not found in the reference book",
    correctText: "Correct text from the book",
    mistakes: "Differences",
    source: "Source hint",
    errorGeneric: "Couldn't check right now. Please try again.",
  },
  ar: {
    badge: "فاحص الأحاديث",
    title: "فاحص الأحاديث",
    description: "اكتب حديثاً نبوياً وسيتحقق الذكاء الاصطناعي من صحته بالاعتماد على كتاب المنهج الرسمي.",
    placeholder: "اكتب الحديث هنا...",
    verify: "تحقّق من الحديث",
    verifying: "جاري التحقق...",
    verdictCorrect: "صحيح",
    verdictMinor: "قريب من الصحيح",
    verdictIncorrect: "صياغة غير صحيحة",
    verdictNotFound: "غير موجود في كتاب المنهج",
    correctText: "النص الصحيح من الكتاب",
    mistakes: "الفروقات",
    source: "المصدر",
    errorGeneric: "تعذّر التحقق الآن. حاول مرة أخرى.",
  },
} as const;

const HadithChecker = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<HadithResult | null>(null);

  const verify = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setLoading(true);
    setResult(null);
    try {
      const { data, error } = await supabase.functions.invoke("verify-hadith", {
        body: { hadith: text, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(String(data.error));
      setResult(data?.result as HadithResult);
    } catch {
      toast({ title: t.errorGeneric, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const verdictMeta = (v: HadithResult["verdict"]) => {
    switch (v) {
      case "correct":
        return { label: t.verdictCorrect, color: "emerald", Icon: Check };
      case "minor_errors":
        return { label: t.verdictMinor, color: "amber", Icon: AlertTriangle };
      case "incorrect":
        return { label: t.verdictIncorrect, color: "red", Icon: X };
      default:
        return { label: t.verdictNotFound, color: "muted", Icon: X };
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
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder={t.placeholder}
          className="min-h-[180px] rounded-2xl bg-secondary/40 backdrop-blur border-white/10 text-base"
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
                {result.summary && (
                  <p className="text-foreground/90 leading-relaxed">{result.summary}</p>
                )}
              </div>
              {result.correct_text && (
                <div className="rounded-3xl p-6 border border-emerald-400/30 bg-emerald-500/5 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.25em] text-emerald-300 mb-2">{t.correctText}</div>
                  <p className="text-foreground/90 leading-relaxed whitespace-pre-wrap" dir="rtl">{result.correct_text}</p>
                </div>
              )}
              {result.differences && result.differences.length > 0 && (
                <div className="rounded-3xl p-6 border border-white/10 bg-secondary/40 backdrop-blur">
                  <div className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-2">{t.mistakes}</div>
                  <ul className="list-disc ps-5 space-y-1 text-foreground/80">
                    {result.differences.map((d, i) => <li key={i}>{d}</li>)}
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

export default HadithChecker;