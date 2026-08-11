import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Trophy, Sparkles, Eye, Check, X } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECT_LABEL, DAILY_GAME_REF_PREFIX, todayKey } from "@/lib/dailyGame";
import { loadTodayGame, baghdadDayOfMonth } from "@/lib/dailyGames/manifest";
import type { DailyGameRow } from "@/lib/dailyGames/types";
import type { BattleSubject } from "@/lib/battleMcqBank";
import { buildWrittenSet, type WrittenQuestion } from "@/lib/ministerialWritten";
import { awardPoints } from "@/lib/points";
import { supabase } from "@/integrations/supabase/client";

type Props = { language: AppLanguage; onBack: () => void; previewDay?: number };

const T = (language: AppLanguage) => ({
  title: language === "ar" ? "تحدي اليوم" : "Daily Challenge",
  subjectOfDay: language === "ar" ? "مادة اليوم" : "Today's subject",
  back: language === "ar" ? "رجوع" : "Back",
  start: language === "ar" ? "ابدأ" : "Start",
  playAgain: language === "ar" ? "أعد المحاولة" : "Try again",
  score: language === "ar" ? "النتيجة" : "Score",
  gameOver: language === "ar" ? "انتهى التحدي" : "Challenge over",
  youWon: language === "ar" ? "أحسنت!" : "Well done!",
  earned: language === "ar" ? "حصلت على 5 نقاط 🎉" : "You earned 5 points 🎉",
  alreadyClaimed: language === "ar" ? "لعبت اليوم بالفعل — عد غداً لجائزة جديدة." : "You've already claimed today — come back tomorrow.",
  tryTomorrow: language === "ar" ? "لم تصل للحد الأدنى — حاول مجدداً غداً." : "Below the threshold — try again tomorrow.",
  hint: language === "ar"
    ? "أسئلة وزارية كتابية — اكتب أو استرجع الإجابة ذهنياً ثم اكشف الإجابة النموذجية وقيّم نفسك بصدق."
    : "Written ministerial questions — recall or write your answer, then reveal the model answer and grade yourself honestly.",
  yourAnswer: language === "ar" ? "اكتب إجابتك هنا (اختياري)" : "Write your answer here (optional)",
  reveal: language === "ar" ? "اكشف الإجابة النموذجية" : "Reveal model answer",
  modelAnswer: language === "ar" ? "الإجابة النموذجية" : "Model answer",
  knew: language === "ar" ? "عرفتها" : "I knew it",
  didnt: language === "ar" ? "لم أعرفها" : "I didn't",
});

function ShellHeader({ language, onBack, subjectLabel }: { language: AppLanguage; onBack: () => void; subjectLabel: string }) {
  const t = T(language);
  return (
    <div className="flex items-center justify-between mb-4">
      <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary">
        <ArrowLeft className="w-4 h-4" />
        {t.back}
      </button>
      <div className="text-right">
        <div className="text-[10px] uppercase tracking-widest text-muted-foreground">{t.subjectOfDay}</div>
        <div className="font-bold text-primary">{subjectLabel}</div>
      </div>
    </div>
  );
}

/* -------------------- Written recall game -------------------- */

function WrittenGame({
  questions,
  language,
  onFinish,
}: {
  questions: WrittenQuestion[];
  language: AppLanguage;
  onFinish: (score: number, max: number) => void;
}) {
  const t = T(language);
  const [idx, setIdx] = useState(0);
  const [draft, setDraft] = useState("");
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);

  const q = questions[idx];
  if (!q) return null;

  const grade = (knew: boolean) => {
    const nextScore = score + (knew ? 1 : 0);
    setScore(nextScore);
    if (idx + 1 >= questions.length) {
      onFinish(nextScore, questions.length);
      return;
    }
    setIdx(idx + 1);
    setDraft("");
    setRevealed(false);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3 text-sm">
        <div className="inline-flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />{t.score}: <b>{score}</b></div>
        <div className="text-xs text-muted-foreground tabular-nums">{idx + 1} / {questions.length}</div>
      </div>

      <p className="text-center text-xs text-muted-foreground mb-3">{t.hint}</p>

      <div className="rounded-xl border border-border bg-secondary/40 p-4 text-sm font-semibold leading-relaxed whitespace-pre-wrap">
        {q.q}
      </div>

      <textarea
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        placeholder={t.yourAnswer}
        rows={4}
        className="mt-3 w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary"
      />

      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          className="mt-3 w-full h-12 rounded-xl bg-primary text-primary-foreground font-bold inline-flex items-center justify-center gap-2"
        >
          <Eye className="w-4 h-4" /> {t.reveal}
        </button>
      ) : (
        <>
          <div className="mt-3 rounded-xl border border-emerald-500/40 bg-emerald-500/5 p-4">
            <div className="text-[11px] font-bold uppercase tracking-wider text-emerald-600 mb-1">{t.modelAnswer}</div>
            <div className="text-sm leading-relaxed whitespace-pre-wrap">{q.a}</div>
          </div>
          <div className="mt-3 flex gap-2">
            <button onClick={() => grade(true)} className="flex-1 h-12 rounded-xl bg-emerald-500 text-white font-bold inline-flex items-center justify-center gap-2">
              <Check className="w-4 h-4" /> {t.knew}
            </button>
            <button onClick={() => grade(false)} className="flex-1 h-12 rounded-xl border border-border bg-secondary font-bold inline-flex items-center justify-center gap-2">
              <X className="w-4 h-4" /> {t.didnt}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

/* -------------------- Page -------------------- */

export default function DailyGame({ language, onBack, previewDay }: Props) {
  const t = T(language);
  const lang: "ar" | "en" = language === "ar" ? "ar" : "en";
  const [loading, setLoading] = useState(true);
  const [today, setToday] = useState<DailyGameRow | null>(null);
  const [questions, setQuestions] = useState<WrittenQuestion[]>([]);
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number; awarded: boolean } | null>(null);
  const refId = `${DAILY_GAME_REF_PREFIX}${todayKey()}`;

  const [sessionPreview] = useState<number | undefined>(() => {
    try {
      const raw = sessionStorage.getItem("daily_game_preview_day");
      if (raw) {
        sessionStorage.removeItem("daily_game_preview_day");
        const n = parseInt(raw, 10);
        if (Number.isFinite(n) && n >= 1 && n <= 31) return n;
      }
    } catch {}
    return undefined;
  });
  const activePreviewDay = previewDay ?? sessionPreview;
  const effectiveDay = activePreviewDay ?? baghdadDayOfMonth();
  const seed = useMemo(() => effectiveDay * 137 + 11, [effectiveDay]);
  const isPreview = activePreviewDay != null;

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true);
      const row = await loadTodayGame(new Date(), activePreviewDay);
      if (cancel) return;
      const count = Math.min(6, row.spec.count ?? 5);
      setToday(row);
      setQuestions(buildWrittenSet(row.subject as BattleSubject, count, seed, lang));
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [seed, activePreviewDay, lang]);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("user_points")
        .select("id")
        .eq("user_id", u.user.id)
        .eq("source", "mcq")
        .eq("ref_id", refId)
        .maybeSingle();
      if (data) setAlreadyClaimed(true);
    })();
  }, [refId]);

  const onFinish = async (score: number, max: number) => {
    const threshold = today?.spec.passThreshold ?? 0.6;
    const passed = max > 0 && score / max >= threshold;
    let awarded = false;
    if (passed && !alreadyClaimed && !isPreview) {
      await awardPoints("mcq", refId);
      awarded = true;
      setAlreadyClaimed(true);
    }
    setResult({ score, max, awarded });
    setPhase("done");
  };

  if (loading) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="max-w-2xl mx-auto px-4 pt-6" dir={language === "ar" ? "rtl" : "ltr"}>
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground animate-pulse">
            {language === "ar" ? "جاري تحضير تحدي اليوم…" : "Preparing today's challenge…"}
          </div>
        </div>
      </main>
    );
  }

  const subjectLabel = today ? SUBJECT_LABEL[today.subject][language] : "";

  if (!today || questions.length < 3) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="max-w-2xl mx-auto px-4 pt-6" dir={language === "ar" ? "rtl" : "ltr"}>
          <ShellHeader language={language} onBack={onBack} subjectLabel={subjectLabel} />
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            {language === "ar" ? "لا توجد أسئلة وزارية كافية لهذه المادة اليوم — عد غداً." : "Not enough ministerial questions for today's subject — come back tomorrow."}
          </div>
        </div>
      </main>
    );
  }

  const gradient = today.spec?.theme?.gradient ?? "from-primary/10 via-fuchsia-500/5 to-amber-500/10";
  const motif = today.spec?.theme?.motif ?? "✨";

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-6" dir={language === "ar" ? "rtl" : "ltr"}>
        <ShellHeader language={language} onBack={onBack} subjectLabel={subjectLabel} />

        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {t.title}
            <span className="text-xl">{motif}</span>
          </h1>
          <p className="text-xs text-muted-foreground mt-1">
            {language === "ar" ? "أسئلة وزارية كتابية" : "Written ministerial questions"}
          </p>
        </div>

        {phase === "intro" && (
          <div className={`rounded-2xl border border-border bg-gradient-to-br ${gradient} p-6 text-center`}>
            <p className="text-sm text-muted-foreground mb-1">{t.subjectOfDay}</p>
            <p className="text-3xl font-black mb-4">{subjectLabel}</p>
            <p className="text-sm mb-6">{t.hint}</p>
            {alreadyClaimed && (
              <p className="text-xs text-amber-600 dark:text-amber-400 mb-4">{t.alreadyClaimed}</p>
            )}
            <button
              onClick={() => setPhase("play")}
              className="h-12 px-8 rounded-xl bg-primary text-primary-foreground font-bold text-base shadow-lg hover:opacity-90"
            >
              {t.start}
            </button>
          </div>
        )}

        {phase === "play" && (
          <WrittenGame questions={questions} language={language} onFinish={onFinish} />
        )}

        {phase === "done" && result && (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <div className="text-5xl mb-2">{result.awarded ? "🎉" : result.score >= result.max * 0.6 ? "👏" : "💪"}</div>
            <p className="text-lg font-bold mb-1">
              {result.score >= result.max * 0.6 ? t.youWon : t.gameOver}
            </p>
            <p className="text-sm text-muted-foreground mb-4">
              {t.score}: <b>{result.score}</b> / {result.max}
            </p>
            {result.awarded && <p className="text-emerald-500 font-semibold mb-4">{t.earned}</p>}
            {!result.awarded && result.score >= result.max * 0.6 && (
              <p className="text-amber-500 mb-4 text-sm">{t.alreadyClaimed}</p>
            )}
            {!result.awarded && result.score < result.max * 0.6 && (
              <p className="text-muted-foreground mb-4 text-sm">{t.tryTomorrow}</p>
            )}
            <button
              onClick={() => { setResult(null); setPhase("intro"); }}
              className="h-11 px-6 rounded-xl border border-border bg-secondary font-semibold hover:opacity-90"
            >
              {t.playAgain}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
