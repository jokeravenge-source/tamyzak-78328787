import { useMemo, useState } from "react";
import { DotLottieReact } from "@lottiefiles/dotlottie-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { buildBattleMcqs, type BattleMCQ } from "@/lib/battleMcqBank";
import type { AppLanguage } from "@/components/LanguageGate";
import giftAsset from "@/assets/gift-premium.json.asset.json";
import { Check, X, Sparkles } from "lucide-react";

/**
 * Gift animation in the profile row. Tapping it hands the student a surprise
 * MCQ drawn from the ministerial question bank.
 */
export default function GiftMcqButton({ language }: { language: AppLanguage }) {
  const isAr = language === "ar";
  const [open, setOpen] = useState(false);
  const [seed, setSeed] = useState(() => Date.now() % 233280);
  const [picked, setPicked] = useState<number | null>(null);

  const question: BattleMCQ | null = useMemo(() => {
    const list = buildBattleMcqs("general", 1, seed || 1);
    return list[0] ?? null;
  }, [seed]);

  const openGift = () => {
    setSeed(Math.floor(Math.random() * 233279) + 1);
    setPicked(null);
    setOpen(true);
  };

  const next = () => {
    setSeed(Math.floor(Math.random() * 233279) + 1);
    setPicked(null);
  };

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
              {isAr ? "من بنك الأسئلة الوزارية" : "From the ministerial question bank"}
            </DialogDescription>
          </DialogHeader>

          {!question ? (
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