import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Heart, Trophy, Sparkles, Timer } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { buildDailyPool, SUBJECT_LABEL, DAILY_GAME_REF_PREFIX, todayKey } from "@/lib/dailyGame";
import { awardPoints } from "@/lib/points";
import { supabase } from "@/integrations/supabase/client";

type Props = { language: AppLanguage; onBack: () => void };

const T = (language: AppLanguage) => ({
  title: language === "ar" ? "لعبة اليوم" : "Daily Game",
  subjectOfDay: language === "ar" ? "مادة اليوم" : "Today's subject",
  back: language === "ar" ? "رجوع" : "Back",
  start: language === "ar" ? "ابدأ اللعب" : "Start playing",
  playAgain: language === "ar" ? "العب مجدداً" : "Play again",
  score: language === "ar" ? "النقاط" : "Score",
  lives: language === "ar" ? "المحاولات" : "Lives",
  time: language === "ar" ? "الوقت" : "Time",
  gameOver: language === "ar" ? "انتهت اللعبة" : "Game over",
  youWon: language === "ar" ? "أحسنت!" : "Well done!",
  earned: language === "ar" ? "حصلت على 5 نقاط 🎉" : "You earned 5 points 🎉",
  alreadyClaimed: language === "ar" ? "لعبت اليوم بالفعل — عد غداً لجائزة جديدة." : "You've already claimed today — come back tomorrow.",
  tryTomorrow: language === "ar" ? "لم تصل للحد الأدنى — حاول مجدداً غداً." : "Below the threshold — try again tomorrow.",
  fallingHint: language === "ar" ? "اضغط على الإجابة الصحيحة قبل أن تسقط للأسفل." : "Tap the correct answer before it hits the floor.",
  matchHint: language === "ar" ? "طابق كل سؤال مع إجابته الصحيحة." : "Match each question with its correct answer.",
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

/* -------------------- Falling Answers -------------------- */

function FallingGame({
  mcqs,
  language,
  onFinish,
}: {
  mcqs: ReturnType<typeof buildDailyPool>["mcqs"];
  language: AppLanguage;
  onFinish: (score: number, max: number) => void;
}) {
  const t = T(language);
  const [qIdx, setQIdx] = useState(0);
  const [lives, setLives] = useState(3);
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(0);
  const [tick, setTick] = useState(0);
  const [feedback, setFeedback] = useState<"ok" | "bad" | null>(null);

  const q = mcqs[qIdx];
  // deterministic per-question start offsets so bubbles don't overlap
  const layout = useMemo(() => {
    if (!q) return [] as { left: number; offset: number }[];
    return q.choices.map((_, i) => ({ left: 5 + i * 22 + (i % 2 === 0 ? 2 : 6), offset: i * 12 }));
  }, [q]);

  const speed = 0.28 + Math.min(qIdx, 8) * 0.05; // % of container height per tick
  const startedAt = useRef<number>(Date.now());

  useEffect(() => {
    startedAt.current = Date.now();
    setFeedback(null);
  }, [qIdx]);

  useEffect(() => {
    if (!q) return;
    const id = window.setInterval(() => setTick((x) => x + 1), 60);
    return () => window.clearInterval(id);
  }, [q]);

  const progress = ((Date.now() - startedAt.current) / 1000) * speed * 100;

  useEffect(() => {
    if (progress > 100 && q) {
      const nextLives = lives - 1;
      setLives(nextLives);
      setCombo(0);
      setFeedback("bad");
      window.setTimeout(() => {
        if (nextLives <= 0 || qIdx + 1 >= mcqs.length) onFinish(score, mcqs.length);
        else setQIdx((i) => i + 1);
      }, 500);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tick]);

  if (!q) return null;

  const handlePick = (i: number) => {
    if (feedback) return;
    const correct = i === q.answer;
    if (correct) {
      const newCombo = combo + 1;
      const bonus = newCombo >= 5 ? 3 : newCombo >= 3 ? 2 : 1;
      setScore((s) => s + bonus);
      setCombo(newCombo);
      setFeedback("ok");
    } else {
      setLives((l) => l - 1);
      setCombo(0);
      setFeedback("bad");
    }
    window.setTimeout(() => {
      const lastLives = correct ? lives : lives - 1;
      if (lastLives <= 0 || qIdx + 1 >= mcqs.length) onFinish(score + (correct ? (combo >= 5 ? 3 : combo >= 3 ? 2 : 1) : 0), mcqs.length);
      else setQIdx((i) => i + 1);
    }, 450);
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3 text-sm">
        <div className="inline-flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />{t.score}: <b>{score}</b></div>
        <div className="inline-flex items-center gap-1 text-rose-500">
          {Array.from({ length: 3 }).map((_, i) => (
            <Heart key={i} className={`w-4 h-4 ${i < lives ? "fill-rose-500" : "opacity-30"}`} />
          ))}
        </div>
        {combo >= 2 && <div className="text-xs font-bold text-fuchsia-500 animate-pulse">×{combo} combo</div>}
      </div>

      <div className="text-base font-semibold text-center mb-2 leading-snug min-h-[3.5em]">{q.q}</div>
      <p className="text-center text-xs text-muted-foreground mb-3">{t.fallingHint}</p>

      <div
        className={`relative h-[340px] rounded-xl border overflow-hidden transition-colors ${
          feedback === "ok" ? "border-emerald-400 bg-emerald-500/5"
          : feedback === "bad" ? "border-rose-400 bg-rose-500/5"
          : "border-border bg-gradient-to-b from-sky-500/5 to-transparent"
        }`}
      >
        {/* floor line */}
        <div className="absolute bottom-0 inset-x-0 h-8 border-t border-dashed border-border/60 bg-background/40" />

        {q.choices.map((c, i) => {
          const y = Math.max(0, Math.min(100, progress - (layout[i]?.offset ?? 0)));
          const isCorrect = i === q.answer;
          return (
            <button
              key={i}
              onClick={() => handlePick(i)}
              className={`absolute px-3 py-2 rounded-full shadow-lg text-xs sm:text-sm font-semibold border transition-transform active:scale-95 ${
                feedback === "ok" && isCorrect
                  ? "bg-emerald-500 text-white border-emerald-600 scale-110"
                  : feedback === "bad" && isCorrect
                  ? "bg-emerald-400/40 border-emerald-500/60"
                  : "bg-primary/90 text-primary-foreground border-primary/70 hover:scale-105"
              }`}
              style={{ left: `${layout[i]?.left ?? 10}%`, top: `${y}%`, maxWidth: "40%" }}
            >
              <span className="line-clamp-2">{c}</span>
            </button>
          );
        })}
      </div>

      <div className="mt-3 text-center text-xs text-muted-foreground">
        {qIdx + 1} / {mcqs.length}
      </div>
    </div>
  );
}

/* -------------------- Term Match Blitz -------------------- */

type Tile = { id: string; pairId: number; text: string; kind: "q" | "a"; done: boolean };

function shuffle<T>(arr: T[], seed: number): T[] {
  let s = seed || 1;
  const rand = () => { s = (s * 9301 + 49297) % 233280; return s / 233280; };
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function MatchGame({
  mcqs,
  language,
  seed,
  onFinish,
}: {
  mcqs: ReturnType<typeof buildDailyPool>["mcqs"];
  language: AppLanguage;
  seed: number;
  onFinish: (score: number, max: number) => void;
}) {
  const t = T(language);
  const pairs = mcqs.slice(0, 6);
  const [tiles, setTiles] = useState<Tile[]>(() => {
    const raw: Tile[] = [];
    pairs.forEach((m, idx) => {
      raw.push({ id: `q${idx}`, pairId: idx, text: m.q, kind: "q", done: false });
      raw.push({ id: `a${idx}`, pairId: idx, text: m.choices[m.answer], kind: "a", done: false });
    });
    return shuffle(raw, seed);
  });
  const [picked, setPicked] = useState<Tile | null>(null);
  const [wrong, setWrong] = useState<Set<string>>(new Set());
  const [score, setScore] = useState(0);
  const [misses, setMisses] = useState(0);
  const [timeLeft, setTimeLeft] = useState(75);

  useEffect(() => {
    const id = window.setInterval(() => setTimeLeft((x) => Math.max(0, x - 1)), 1000);
    return () => window.clearInterval(id);
  }, []);

  useEffect(() => {
    if (timeLeft === 0 || tiles.every((t) => t.done)) {
      const max = pairs.length;
      window.setTimeout(() => onFinish(score, max), 300);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft, tiles]);

  const onTap = (tile: Tile) => {
    if (tile.done || timeLeft === 0) return;
    if (!picked) { setPicked(tile); return; }
    if (picked.id === tile.id) { setPicked(null); return; }
    if (picked.pairId === tile.pairId && picked.kind !== tile.kind) {
      setTiles((prev) => prev.map((x) => (x.pairId === tile.pairId ? { ...x, done: true } : x)));
      setScore((s) => s + 1);
      setPicked(null);
    } else {
      const s = new Set([picked.id, tile.id]);
      setWrong(s);
      setMisses((m) => m + 1);
      window.setTimeout(() => { setWrong(new Set()); setPicked(null); }, 500);
    }
  };

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-3 text-sm">
        <div className="inline-flex items-center gap-2"><Trophy className="w-4 h-4 text-amber-500" />{t.score}: <b>{score}</b> / {pairs.length}</div>
        <div className="inline-flex items-center gap-2 text-primary"><Timer className="w-4 h-4" />{timeLeft}s</div>
        <div className="text-xs text-muted-foreground">✗ {misses}</div>
      </div>
      <p className="text-center text-xs text-muted-foreground mb-3">{t.matchHint}</p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
        {tiles.map((tile) => {
          const isPicked = picked?.id === tile.id;
          const isWrong = wrong.has(tile.id);
          return (
            <button
              key={tile.id}
              onClick={() => onTap(tile)}
              disabled={tile.done}
              className={`min-h-[74px] px-2 py-2 rounded-xl border text-xs font-semibold text-center transition-all ${
                tile.done
                  ? "opacity-40 bg-emerald-500/10 border-emerald-500/40 line-through"
                  : isWrong
                  ? "bg-rose-500/15 border-rose-500 animate-pulse"
                  : isPicked
                  ? "bg-primary text-primary-foreground border-primary scale-[1.02] shadow-md"
                  : tile.kind === "q"
                  ? "bg-sky-500/10 border-sky-500/30 hover:bg-sky-500/20"
                  : "bg-fuchsia-500/10 border-fuchsia-500/30 hover:bg-fuchsia-500/20"
              }`}
            >
              <span className="line-clamp-4 leading-tight">{tile.text}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

/* -------------------- Page shell -------------------- */

export default function DailyGame({ language, onBack }: Props) {
  const t = T(language);
  const daily = useMemo(() => buildDailyPool(8), []);
  const subjectLabel = SUBJECT_LABEL[daily.subject][language];
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [alreadyClaimed, setAlreadyClaimed] = useState(false);
  const [result, setResult] = useState<{ score: number; max: number; awarded: boolean } | null>(null);
  const refId = `${DAILY_GAME_REF_PREFIX}${todayKey()}`;

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
    const passed = max > 0 && score / max >= 0.6;
    let awarded = false;
    if (passed && !alreadyClaimed) {
      await awardPoints("mcq", refId);
      awarded = true;
      setAlreadyClaimed(true);
    }
    setResult({ score, max, awarded });
    setPhase("done");
  };

  if (daily.mcqs.length < 4) {
    return (
      <main className="min-h-screen bg-background pb-28">
        <div className="max-w-2xl mx-auto px-4 pt-6" dir={language === "ar" ? "rtl" : "ltr"}>
          <ShellHeader language={language} onBack={onBack} subjectLabel={subjectLabel} />
          <div className="rounded-2xl border border-border bg-card p-6 text-center text-muted-foreground">
            {language === "ar" ? "لا توجد أسئلة كافية لهذه المادة اليوم — عد غداً." : "Not enough questions for today's subject — come back tomorrow."}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background pb-28">
      <div className="max-w-2xl mx-auto px-4 pt-6" dir={language === "ar" ? "rtl" : "ltr"}>
        <ShellHeader language={language} onBack={onBack} subjectLabel={subjectLabel} />

        <div className="mb-4">
          <h1 className="text-2xl font-black tracking-tight flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-primary" />
            {t.title}
          </h1>
        </div>

        {phase === "intro" && (
          <div className="rounded-2xl border border-border bg-gradient-to-br from-primary/10 via-fuchsia-500/5 to-amber-500/10 p-6 text-center">
            <p className="text-sm text-muted-foreground mb-1">{t.subjectOfDay}</p>
            <p className="text-3xl font-black mb-4">{subjectLabel}</p>
            <p className="text-sm mb-6">
              {daily.kind === "falling" ? t.fallingHint : t.matchHint}
            </p>
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

        {phase === "play" && daily.kind === "falling" && (
          <FallingGame mcqs={daily.mcqs} language={language} onFinish={onFinish} />
        )}
        {phase === "play" && daily.kind === "match" && (
          <MatchGame mcqs={daily.mcqs} language={language} seed={daily.seed} onFinish={onFinish} />
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