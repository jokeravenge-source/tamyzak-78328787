import { useCallback, useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { awardPoints } from "@/lib/points";
import type { AppLanguage } from "@/components/LanguageGate";
import { Button } from "@/components/ui/button";
import { Check, X, Sparkles, Loader2, ArrowLeft, ArrowRight, Gift, CalendarClock } from "lucide-react";

type GiftQuestion = {
  q: string;
  choices: string[];
  answer: number;
  subject: string;
  chapter: number;
};

const SUBJECT_AR: Record<string, string> = {
  arabic: "العربية", english: "الإنجليزية", math: "الرياضيات", chemistry: "الكيمياء",
  biology: "الأحياء", physics: "الفيزياء", islamic: "التربية الإسلامية", french: "الفرنسية",
};

const FEATURE = "gift_daily_mcq";
const LOCAL_KEY = "gift_daily_state_v1";
const clip = (s: string, n = 220) => (s.length > n ? `${s.slice(0, n - 1).trimEnd()}…` : s);
const todayKey = () => new Date().toISOString().slice(0, 10);

type LocalState = { day: string; question: GiftQuestion; picked: number | null };

function readLocal(): LocalState | null {
  try {
    const raw = JSON.parse(localStorage.getItem(LOCAL_KEY) || "null") as LocalState | null;
    return raw && raw.day === todayKey() ? raw : null;
  } catch { return null; }
}
function writeLocal(state: LocalState) {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify(state)); } catch { /* ignore */ }
}

function celebrate() {
  const end = Date.now() + 1200;
  const tick = () => {
    confetti({ particleCount: 40, spread: 70, startVelocity: 45, origin: { x: Math.random(), y: 0.2 } });
    if (Date.now() < end) requestAnimationFrame(tick);
  };
  tick();
}

/** Full-screen daily gift question drawn from the ministerial bank (chapters 1-2). */
export default function GiftDailyScreen({ language, onClose }: { language: AppLanguage; onClose: () => void }) {
  const isAr = language === "ar";
  const [loading, setLoading] = useState(true);
  const [question, setQuestion] = useState<GiftQuestion | null>(null);
  const [picked, setPicked] = useState<number | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [alreadyPlayed, setAlreadyPlayed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      // One question per calendar day: reuse today's draw, and show the result
      // again if it was already answered.
      const cached = readLocal();
      if (cached) {
        setQuestion(cached.question);
        if (cached.picked !== null) {
          setPicked(cached.picked);
          setResult(cached.picked === cached.question.answer ? "correct" : "wrong");
        }
        return;
      }

      const { data: used } = await supabase.rpc("feature_usage_today", { _feature: FEATURE });
      if ((used ?? 0) > 0) { setAlreadyPlayed(true); return; }

      // Consume the single daily attempt up front so the question can't be rerolled.
      await supabase.rpc("claim_daily_feature_limit", { _feature: FEATURE, _limit: 1 });

      const lang = isAr ? "ar" : "en";

      // Prefer real MCQs from the MCQ bank (with authored choices).
      const { count: mcqCount } = await supabase
        .from("mcq_banks")
        .select("*", { count: "exact", head: true })
        .eq("language", lang);
      if (mcqCount) {
        const mcqOffset = Math.floor(Math.random() * mcqCount);
        const { data: mcqPick } = await supabase
          .from("mcq_banks")
          .select("id, subject, chapter, question, choices, answer_index")
          .eq("language", lang)
          .order("id", { ascending: true })
          .range(mcqOffset, mcqOffset);
        const m = mcqPick?.[0];
        const rawChoices = Array.isArray(m?.choices) ? (m!.choices as unknown[]).map((c) => String(c)) : [];
        if (m && rawChoices.length >= 2) {
          const correctText = rawChoices[m.answer_index] ?? rawChoices[0];
          const shuffled = [...rawChoices];
          for (let i = shuffled.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
          }
          const drawnMcq: GiftQuestion = {
            q: m.question,
            choices: shuffled,
            answer: shuffled.indexOf(correctText),
            subject: m.subject,
            chapter: m.chapter,
          };
          setQuestion(drawnMcq);
          writeLocal({ day: todayKey(), question: drawnMcq, picked: null });
          return;
        }
      }

      const { count } = await supabase
        .from("bank_text_questions")
        .select("*", { count: "exact", head: true })
        .eq("language", lang)
        .in("chapter", [1, 2]);
      if (!count) { setQuestion(null); return; }

      const offset = Math.floor(Math.random() * count);
      const { data: picks } = await supabase
        .from("bank_text_questions")
        .select("id, subject, chapter, question, answer")
        .eq("language", lang)
        .in("chapter", [1, 2])
        .order("id", { ascending: true })
        .range(offset, offset);
      const row = picks?.[0];
      if (!row) { setQuestion(null); return; }

      const { data: siblings } = await supabase
        .from("bank_text_questions")
        .select("id, answer")
        .eq("language", lang)
        .eq("subject", row.subject)
        .eq("chapter", row.chapter)
        .neq("id", row.id)
        .limit(60);

      const pool = Array.from(new Set(
        (siblings ?? []).map((s) => (s.answer ?? "").trim()).filter((a) => a && a !== row.answer.trim()),
      ));
      for (let i = pool.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [pool[i], pool[j]] = [pool[j], pool[i]];
      }
      const correct = clip(row.answer.trim());
      const choices = [correct, ...pool.slice(0, 3).map((c) => clip(c))];
      for (let i = choices.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [choices[i], choices[j]] = [choices[j], choices[i]];
      }
      const drawn: GiftQuestion = {
        q: row.question,
        choices,
        answer: choices.indexOf(correct),
        subject: row.subject,
        chapter: row.chapter,
      };
      setQuestion(drawn);
      writeLocal({ day: todayKey(), question: drawn, picked: null });
    } finally {
      setLoading(false);
    }
  }, [isAr]);

  useEffect(() => { void load(); }, [load]);

  const answer = async (i: number) => {
    if (picked !== null || !question) return;
    setPicked(i);
    writeLocal({ day: todayKey(), question, picked: i });
    const ok = i === question.answer;
    setResult(ok ? "correct" : "wrong");
    if (ok) {
      celebrate();
      await awardPoints("mcq", `gift-${todayKey()}`);
    } else if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate?.([60, 40, 60]);
    }
  };

  const Back = isAr ? ArrowRight : ArrowLeft;

  return (
    <div dir={isAr ? "rtl" : "ltr"} className="fixed inset-0 z-[120] bg-background overflow-y-auto">
      <div className="mx-auto w-full max-w-2xl px-4 py-5 pb-24">
        <button
          type="button"
          onClick={onClose}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
        >
          <Back className="w-4 h-4" />
          {isAr ? "رجوع" : "Back"}
        </button>

        <div className="mt-5 flex items-center gap-2 text-primary">
          <Sparkles className="w-5 h-5" />
          <h1 className="text-xl font-bold">{isAr ? "سؤال الهدية اليومي" : "Daily gift question"}</h1>
        </div>
        <p className="mt-1 text-sm text-muted-foreground">
          {isAr ? "من بنك الأسئلة الوزارية — محاولة واحدة كل يوم" : "From the ministerial bank — one attempt per day"}
          {question && ` · ${isAr ? SUBJECT_AR[question.subject] ?? question.subject : question.subject} · ${isAr ? `الفصل ${question.chapter}` : `Chapter ${question.chapter}`}`}
        </p>

        {loading ? (
          <div className="flex items-center justify-center py-24 text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        ) : alreadyPlayed ? (
          <div className="mt-10 rounded-3xl border border-border bg-card p-8 text-center">
            <CalendarClock className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="font-semibold">{isAr ? "استخدمت هديتك اليوم" : "You used today's gift"}</p>
            <p className="mt-1 text-sm text-muted-foreground">{isAr ? "عد غداً لسؤال جديد." : "Come back tomorrow for a new one."}</p>
          </div>
        ) : !question ? (
          <p className="mt-10 text-sm text-muted-foreground">{isAr ? "لا يوجد سؤال متاح الآن." : "No question available right now."}</p>
        ) : (
          <div className="mt-6 space-y-4">
            <p className="text-lg font-semibold leading-relaxed">{question.q}</p>
            <div className="grid gap-3">
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
                    onClick={() => void answer(i)}
                    className={`w-full ${isAr ? "text-right" : "text-left"} rounded-2xl border p-4 text-sm transition-colors ${state}`}
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
          </div>
        )}
      </div>

      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-[130] flex items-start justify-center bg-background/80 backdrop-blur-sm px-6 pt-[6vh]"
          >
            <motion.div
              initial={{ scale: 0.7, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
              className={`w-full max-w-sm rounded-3xl border p-7 text-center shadow-[var(--shadow-card)] ${
                result === "correct" ? "border-primary bg-primary/10" : "border-destructive bg-destructive/10"
              }`}
            >
              <motion.div
                animate={result === "correct" ? { rotate: [0, -10, 10, 0], scale: [1, 1.15, 1] } : { x: [0, -8, 8, -6, 0] }}
                transition={{ duration: 0.6 }}
                className={`w-16 h-16 mx-auto rounded-2xl flex items-center justify-center ${
                  result === "correct" ? "bg-primary/20 text-primary" : "bg-destructive/20 text-destructive"
                }`}
              >
                {result === "correct" ? <Gift className="w-8 h-8" /> : <X className="w-8 h-8" />}
              </motion.div>
              <h2 className="mt-4 text-xl font-bold">
                {result === "correct"
                  ? isAr ? "أحسنت! 🎉" : "Congrats! 🎉"
                  : isAr ? "أوبس!" : "Oops!"}
              </h2>
              <p className="mt-2 text-sm text-muted-foreground">
                {result === "correct"
                  ? isAr ? "إجابة صحيحة — حصلت على 5 نقاط" : "Correct — you earned 5 points"
                  : isAr ? "إجابة خاطئة، حاول غداً" : "Wrong answer, try again tomorrow"}
              </p>
              <Button className="mt-5 w-full" onClick={onClose}>
                {isAr ? "تم" : "Done"}
              </Button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
