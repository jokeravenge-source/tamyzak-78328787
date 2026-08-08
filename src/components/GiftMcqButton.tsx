import { useCallback, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import giftAsset from "@/assets/gift-premium.json.asset.json";
import { Check, X, Sparkles, Loader2 } from "lucide-react";

type GiftQuestion = {
  q: string;
  choices: string[];
  answer: number;
  subject: string;
  chapter: number;
  chapterTitle: string | null;
};

const SUBJECT_AR: Record<string, string> = {
  arabic: "العربية", english: "الإنجليزية", math: "الرياضيات", chemistry: "الكيمياء",
  biology: "الأحياء", physics: "الفيزياء", islamic: "التربية الإسلامية", french: "الفرنسية",
};

const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);

/**
 * Gift animation in the profile row. Tapping it hands the student a surprise
 * MCQ drawn from the ministerial question bank. The question, its correct
 * answer and the distractors all come from the SAME subject and chapter, so
 * nothing is ever mixed across subjects.
 */
export default function GiftMcqButton({ language }: { language: AppLanguage }) {
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [picked, setPicked] = useState<number | null>(null);
  const [loading, setLoading] = useState(false);
  const [question, setQuestion] = useState<GiftQuestion | null>(null);

  const loadQuestion = useCallback(async () => {
    setLoading(true);
    setPicked(null);
    setQuestion(null);
    try {
      const lang = isAr ? "ar" : "en";
      const base = () =>
        supabase.from("bank_text_questions").select("*", { count: "exact", head: true }).eq("language", lang);
      const { count } = await base();
      if (!count) { setQuestion(null); return; }

      const offset = Math.floor(Math.random() * count);
      const { data: picks } = await supabase
        .from("bank_text_questions")
        .select("id, subject, chapter, chapter_title, question, answer")
        .eq("language", lang)
        .order("id", { ascending: true })
        .range(offset, offset);
      const row = picks?.[0];
      if (!row) { setQuestion(null); return; }

      // Distractors strictly from the same subject + chapter + language.
      const { data: siblings } = await supabase
        .from("bank_text_questions")
        .select("id, answer")
        .eq("language", lang)
        .eq("subject", row.subject)
        .eq("chapter", row.chapter)
        .neq("id", row.id)
        .limit(60);

      const pool = Array.from(
        new Set(
          (siblings ?? [])
            .map((s) => (s.answer ?? "").trim())
            .filter((a) => a && a !== row.answer.trim()),
        ),
      );
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const distractors = pool.slice(0, 3);
      const correct = row.answer.trim();
      const choices = [correct, ...distractors].map((c) => clip(c));
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }

      setQuestion({
        q: row.question,
        choices,
        answer: choices.indexOf(clip(correct)),
        subject: row.subject,
        chapter: row.chapter,
        chapterTitle: row.chapter_title,
      });
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  const openGift = () => {
    setOpen(true);
    void loadQuestion();
  };

  const next = () => { void loadQuestion(); };

  return (
    <>
      <button
        type="button"
        onClick={openGift}
        aria-label={isAr ? "سؤال هدية" : "Gift question"}
        title={isAr ? "سؤال هدية من بنك الأسئلة الوزارية" : "Gift question from the ministerial bank"}
        className="shrink-0 w-14 h-14 sm:w-16 sm:h-16 rounded-2xl border border-primary/40 bg-primary/5 hover:bg-primary/10 hover:border-primary transition-colors flex items-center justify-center"
      >
        <DotLottieReact src={giftAsset.url} loop autoplay style={{ width: "100%", height: "100%" }} />
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent dir={isAr ? "rtl" : "ltr"} className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-primary" />
              {isAr ? "سؤال هدية" : "Gift question"}
            </DialogTitle>
            <DialogDescription>
              {question
                ? `${isAr ? "من بنك الأسئلة الوزارية" : "From the ministerial question bank"} · ${
                    isAr ? SUBJECT_AR[question.subject] ?? question.subject : question.subject
                  } · ${isAr ? `الفصل ${question.chapter}` : `Chapter ${question.chapter}`}`
                : isAr ? "من بنك الأسئلة الوزارية" : "From the ministerial question bank"}
            </DialogDescription>
          </DialogHeader>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
            </div>
          ) : !question ? (
            <p className="text-sm text-muted-foreground">
              {isAr ? "لا يوجد سؤال متاح الآن." : "No question available right now."}
            </p>
          ) : (
            <div className="space-y-4">
              <p className="font-semibold leading-relaxed">{question.q}</p>
              <div className="grid gap-2">
                {question.choices.map((c, i) => {
                  const isCorrect = i === question.answer;
                  const answered = picked !== null;
                  const state = !answered
                    ? "border-border hover:border-primary/50"
                    : isCorrect
                      ? "border-primary bg-primary/10"
                      : i === picked
                        ? "border-destructive bg-destructive/10"
                        : "border-border opacity-60";
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={answered}
                      onClick={() => setPicked(i)}
                      className={`w-full ${isAr ? "text-right" : "text-left"} rounded-xl border p-3 text-sm transition-colors ${state}`}
                    >
                      <span className="flex items-center gap-2">
                        {answered && isCorrect && <Check className="w-4 h-4 text-primary shrink-0" />}
                        {answered && !isCorrect && i === picked && <X className="w-4 h-4 text-destructive shrink-0" />}
                        <span className="flex-1">{c}</span>
                      </span>
                    </button>
                  );
                })}
              </div>

              {picked !== null && (
                <div className="flex items-center justify-between gap-3 pt-1">
                  <p className="text-sm font-semibold">
                    {picked === question.answer
                      ? isAr ? "إجابة صحيحة! 🎉" : "Correct! 🎉"
                      : isAr ? "إجابة خاطئة — راجع الإجابة الصحيحة." : "Wrong — see the correct answer."}
                  </p>
                  <Button size="sm" onClick={next}>
                    {isAr ? "سؤال آخر" : "Another one"}
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}