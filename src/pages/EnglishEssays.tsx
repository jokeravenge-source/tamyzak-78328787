import { useState } from "react";
import { ArrowLeft, Sparkles, Loader2, CheckCircle2, XCircle, PenLine, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { englishEssayTopics, type EnglishEssayTopic } from "@/data/englishEssayTopics";

type Mistake = {
  wrong: string;
  correct: string;
  reason_ar: string;
  kind: string;
};
type Review = {
  mistakes: Mistake[];
  corrected_essay: string;
  scores: {
    grammar: number;
    spelling: number;
    vocabulary: number;
    structure: number;
    content: number;
    overall: number;
  };
  feedback_ar: string;
};

const copy = {
  en: {
    title: "English Compositions",
    desc: "Pick a topic, write your composition, and AI will mark every mistake.",
    pick: "Pick a topic",
    custom: "Or write your own topic",
    customPh: "e.g. My Favorite Day",
    essay: "Your composition",
    essayPh: "Write your composition in English here…",
    check: "Check my composition",
    checking: "Checking…",
    restart: "Try another",
    mistakes: "Mistakes",
    none: "No mistakes — excellent!",
    corrected: "Corrected version",
    scores: "Scores",
    overall: "Overall",
    feedback: "Feedback",
    tooShort: "Please write more before checking.",
    hint: "Hint",
  },
  ar: {
    title: "إنشاءات الإنكليزي",
    desc: "اختر موضوعاً، اكتب إنشاءك، والذكاء الاصطناعي يؤشر كل غلطة.",
    pick: "اختر موضوعاً",
    custom: "أو اكتب موضوعك الخاص",
    customPh: "مثلاً: My Favorite Day",
    essay: "إنشاؤك",
    essayPh: "اكتب إنشاءك بالإنكليزي هنا…",
    check: "صحح إنشائي",
    checking: "جارٍ التصحيح…",
    restart: "موضوع جديد",
    mistakes: "الأخطاء",
    none: "ما إكو أخطاء — ممتاز!",
    corrected: "النسخة المصححة",
    scores: "الدرجات",
    overall: "المجموع",
    feedback: "الملاحظات",
    tooShort: "اكتب أكثر قبل التصحيح.",
    hint: "تلميح",
  },
} as const;

const kindLabel: Record<string, { en: string; ar: string; color: string }> = {
  spelling:      { en: "Spelling",       ar: "إملاء",         color: "bg-rose-500/15 text-rose-600 border-rose-500/30" },
  grammar:       { en: "Grammar",        ar: "قواعد",         color: "bg-amber-500/15 text-amber-600 border-amber-500/30" },
  tense:         { en: "Tense",          ar: "زمن الفعل",     color: "bg-orange-500/15 text-orange-600 border-orange-500/30" },
  article:       { en: "Article",        ar: "أداة التعريف",  color: "bg-violet-500/15 text-violet-600 border-violet-500/30" },
  preposition:   { en: "Preposition",    ar: "حرف جر",        color: "bg-cyan-500/15 text-cyan-600 border-cyan-500/30" },
  agreement:     { en: "Agreement",      ar: "مطابقة",         color: "bg-blue-500/15 text-blue-600 border-blue-500/30" },
  punctuation:   { en: "Punctuation",    ar: "ترقيم",          color: "bg-emerald-500/15 text-emerald-600 border-emerald-500/30" },
  capitalization:{ en: "Capitalization", ar: "حرف كبير",       color: "bg-teal-500/15 text-teal-600 border-teal-500/30" },
  word_choice:   { en: "Word choice",    ar: "اختيار كلمة",    color: "bg-pink-500/15 text-pink-600 border-pink-500/30" },
  structure:     { en: "Structure",      ar: "بناء جملة",      color: "bg-fuchsia-500/15 text-fuchsia-600 border-fuchsia-500/30" },
};

const EnglishEssays = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const rtl = language === "ar";
  const [topic, setTopic] = useState<EnglishEssayTopic | null>(null);
  const [customTopic, setCustomTopic] = useState("");
  const [essay, setEssay] = useState("");
  const [loading, setLoading] = useState(false);
  const [review, setReview] = useState<Review | null>(null);

  const effectiveTopic = topic ? (language === "ar" ? `${topic.title} — ${topic.titleAr}` : topic.title) : customTopic.trim();

  const check = async () => {
    if (essay.trim().length < 20) {
      toast.error(t.tooShort);
      return;
    }
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("english-essay-check", {
        body: { topic: effectiveTopic, essay },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setReview(data as Review);
    } catch (e: any) {
      toast.error(e.message || "Error");
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setReview(null);
    setEssay("");
    setTopic(null);
    setCustomTopic("");
  };

  return (
    <main className="min-h-screen bg-background px-4 py-10 md:py-16" dir={rtl ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={onBack}
          className="mb-6 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-border bg-secondary/40 text-sm hover:bg-secondary"
        >
          <ArrowLeft className="w-4 h-4" /> {rtl ? "رجوع" : "Back"}
        </button>

        <header className="mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-primary/30 bg-primary/10 mb-3">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs text-primary font-semibold">{rtl ? "أداة جديدة" : "New tool"}</span>
          </div>
          <h1 className="text-3xl md:text-5xl font-bold gradient-text mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.desc}</p>
        </header>

        {!review && (
          <>
            <section className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">{t.pick}</h2>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5">
                {englishEssayTopics.map((tp) => {
                  const active = topic?.id === tp.id;
                  return (
                    <button
                      key={tp.id}
                      onClick={() => { setTopic(tp); setCustomTopic(""); }}
                      className={`text-start rounded-2xl border p-3 transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-secondary/40 hover:border-primary/40"}`}
                    >
                      <p className="font-semibold text-foreground text-sm">{tp.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">{tp.titleAr}</p>
                    </button>
                  );
                })}
              </div>
            </section>

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.custom}</h2>
              <input
                type="text"
                value={customTopic}
                onChange={(e) => { setCustomTopic(e.target.value); setTopic(null); }}
                placeholder={t.customPh}
                className="w-full rounded-2xl border border-border bg-secondary/40 px-4 py-3 text-sm outline-none focus:border-primary"
                dir="ltr"
              />
            </section>

            {topic && (
              <div className="mb-4 p-3 rounded-2xl border border-primary/30 bg-primary/5 text-sm">
                <span className="font-semibold text-primary">{t.hint}: </span>
                <span className="text-foreground/80" dir="ltr">{topic.hint}</span>
              </div>
            )}

            <section className="mb-6">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-2">{t.essay}</h2>
              <Textarea
                dir="ltr"
                value={essay}
                onChange={(e) => setEssay(e.target.value)}
                placeholder={t.essayPh}
                rows={12}
                className="resize-none text-base leading-relaxed"
              />
              <p className="text-xs text-muted-foreground mt-1 text-right" dir="ltr">{essay.trim().split(/\s+/).filter(Boolean).length} words</p>
            </section>

            <Button onClick={check} disabled={loading || essay.trim().length < 20} size="lg" className="w-full">
              {loading ? (<><Loader2 className="w-4 h-4 animate-spin me-2" /> {t.checking}</>) : (<><PenLine className="w-4 h-4 me-2" /> {t.check}</>)}
            </Button>
          </>
        )}

        {review && (
          <div className="space-y-6">
            <section className="rounded-3xl border border-border bg-secondary/40 p-5">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-bold">{t.scores}</h2>
                <div className="text-3xl font-extrabold text-primary">{review.scores.overall}/10</div>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                {(["grammar","spelling","vocabulary","structure","content"] as const).map((k) => (
                  <div key={k} className="rounded-xl bg-background p-3 border border-border">
                    <p className="text-[11px] uppercase text-muted-foreground tracking-wider">{k}</p>
                    <p className="text-xl font-bold mt-1">{review.scores[k]}<span className="text-sm text-muted-foreground">/10</span></p>
                    <Progress value={review.scores[k] * 10} className="h-1 mt-2" />
                  </div>
                ))}
              </div>
              <div className="mt-4 p-3 rounded-xl bg-primary/5 border border-primary/20 text-sm">
                <p className="font-semibold mb-1 text-primary">{t.feedback}</p>
                <p>{review.feedback_ar}</p>
              </div>
            </section>

            <section className="rounded-3xl border border-border bg-secondary/40 p-5">
              <h2 className="text-lg font-bold mb-3">{t.mistakes} ({review.mistakes.length})</h2>
              {review.mistakes.length === 0 ? (
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle2 className="w-5 h-5" /> {t.none}
                </div>
              ) : (
                <ul className="space-y-3">
                  {review.mistakes.map((m, i) => {
                    const k = kindLabel[m.kind] ?? kindLabel.grammar;
                    return (
                      <li key={i} className="rounded-2xl bg-background border border-border p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full border ${k.color}`}>
                            {rtl ? k.ar : k.en}
                          </span>
                        </div>
                        <div className="flex flex-wrap items-center gap-2 text-sm" dir="ltr">
                          <span className="line-through text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded">{m.wrong}</span>
                          <span className="text-muted-foreground">→</span>
                          <span className="text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded font-semibold">{m.correct}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-2">{m.reason_ar}</p>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="rounded-3xl border border-border bg-secondary/40 p-5">
              <h2 className="text-lg font-bold mb-3">{t.corrected}</h2>
              <p dir="ltr" className="whitespace-pre-wrap leading-relaxed text-foreground/90">{review.corrected_essay}</p>
            </section>

            <Button onClick={reset} variant="outline" size="lg" className="w-full">
              <RotateCw className="w-4 h-4 me-2" /> {t.restart}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
};

export default EnglishEssays;