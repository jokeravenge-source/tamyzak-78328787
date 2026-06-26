import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Swords, Users, Trophy, Copy, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import { buildBattleMcqs, type BattleSubject, type BattleMCQ } from "@/lib/battleMcqBank";

type Subject = BattleSubject;
type MCQ = BattleMCQ;

function pickQuestions(n: number, seed: number, subject: Subject = "general"): MCQ[] {
  // Mix in time-based randomness so each room gets a fresh set even with the same seed range.
  const mixed = (seed ^ Date.now()) >>> 0;
  return buildBattleMcqs(subject, n, mixed);
}

const T = (l: AppLanguage) => ({
  title: l === "ar" ? "المعركة المباشرة" : "Live Battle",
  subtitle: l === "ar" ? "تحدَّ صديقك في 10 أسئلة" : "Challenge a friend in 10 questions",
  create: l === "ar" ? "إنشاء غرفة" : "Create Room",
  join: l === "ar" ? "انضمام لغرفة" : "Join Room",
  back: l === "ar" ? "رجوع" : "Back",
  name: l === "ar" ? "اسمك" : "Your name",
  code: l === "ar" ? "رمز الغرفة" : "Room code",
  shareCode: l === "ar" ? "شارك هذا الرمز مع صديقك" : "Share this code with your friend",
  waiting: l === "ar" ? "بانتظار اللاعب الثاني..." : "Waiting for second player...",
  starting: l === "ar" ? "تبدأ خلال" : "Starting in",
  q: l === "ar" ? "سؤال" : "Question",
  of: l === "ar" ? "من" : "of",
  you: l === "ar" ? "أنت" : "You",
  opp: l === "ar" ? "الخصم" : "Opponent",
  winner: l === "ar" ? "الفائز" : "Winner",
  tie: l === "ar" ? "تعادل!" : "It's a tie!",
  youWin: l === "ar" ? "فزت! 🎉" : "You win! 🎉",
  youLose: l === "ar" ? "خسارة 😔" : "You lost 😔",
  pointsEarned: l === "ar" ? "نقاط مكتسبة" : "Points earned",
  playAgain: l === "ar" ? "العب مرة أخرى" : "Play again",
  invalidCode: l === "ar" ? "أدخل رمزاً صحيحاً" : "Enter a valid 6-digit code",
  copied: l === "ar" ? "تم النسخ" : "Copied",
  start: l === "ar" ? "ابدأ" : "Start",
  locked: l === "ar" ? "لا يمكنك مغادرة المعركة حتى تنتهي" : "You can't leave until the battle is over",
  subject: l === "ar" ? "المادة" : "Subject",
  questionsCount: l === "ar" ? "عدد الأسئلة" : "Number of questions",
  subjGeneral: l === "ar" ? "مختلط" : "Mixed",
  subjPhysics: l === "ar" ? "فيزياء" : "Physics",
  subjChemistry: l === "ar" ? "كيمياء" : "Chemistry",
  subjBiology: l === "ar" ? "أحياء" : "Biology",
  subjArabic: l === "ar" ? "عربي" : "Arabic",
  subjEnglish: l === "ar" ? "إنجليزي" : "English",
  subjFrench: l === "ar" ? "فرنسي" : "French",
  subjIslamic: l === "ar" ? "إسلامية" : "Islamic",
  createNow: l === "ar" ? "إنشاء الغرفة" : "Create room",
});

type Phase = "menu" | "createSettings" | "join" | "lobby" | "countdown" | "playing" | "done";

export default function LiveBattle({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  const t = T(language);
  const [phase, setPhase] = useState<Phase>("menu");
  const [name, setName] = useState<string>(() => localStorage.getItem("app_display_name_v1") || (language === "ar" ? "لاعب" : "Player"));
  const [code, setCode] = useState<string>("");
  const [joinInput, setJoinInput] = useState<string>("");
  const [isHost, setIsHost] = useState(false);
  const [players, setPlayers] = useState<{ id: string; name: string }[]>([]);
  const [questions, setQuestions] = useState<MCQ[]>([]);
  const [qIdx, setQIdx] = useState(0);
  const [timeLeft, setTimeLeft] = useState(15);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [answered, setAnswered] = useState<number | null>(null);
  const [answeredFor, setAnsweredFor] = useState<number | null>(null);
  const [countdown, setCountdown] = useState(3);
  const [subject, setSubject] = useState<Subject>("general");
  const [qCount, setQCount] = useState<number>(10);

  const meId = useRef<string>(Math.random().toString(36).slice(2, 10));
  const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const questionsRef = useRef<MCQ[]>([]);
  useEffect(() => { questionsRef.current = questions; }, [questions]);

  // Lock navigation while a battle is in progress
  const isLocked = phase === "countdown" || phase === "playing";
  useEffect(() => {
    (window as any).__battleLocked = isLocked;
    window.dispatchEvent(new CustomEvent("app:battle-lock", { detail: { locked: isLocked } }));
    if (!isLocked) return;
    const beforeUnload = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", beforeUnload);
    return () => {
      window.removeEventListener("beforeunload", beforeUnload);
    };
  }, [isLocked]);
  useEffect(() => () => {
    (window as any).__battleLocked = false;
    window.dispatchEvent(new CustomEvent("app:battle-lock", { detail: { locked: false } }));
  }, []);

  const guardedBack = () => {
    if (isLocked) { toast.error(t.locked); return; }
    onBack();
  };

  const cleanup = () => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current);
      channelRef.current = null;
    }
  };
  useEffect(() => () => cleanup(), []);

  // Question timer
  useEffect(() => {
    if (phase !== "playing") return;
    setTimeLeft(15);
    setAnswered(null);
    setAnsweredFor(null);
    const start = Date.now();
    const iv = setInterval(() => {
      const left = Math.max(0, 15 - Math.floor((Date.now() - start) / 1000));
      setTimeLeft(left);
      if (left <= 0) {
        clearInterval(iv);
        // advance after a brief pause; host orchestrates
        if (isHost) setTimeout(() => advanceQuestion(), 800);
      }
    }, 200);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase, qIdx]);

  // Countdown
  useEffect(() => {
    if (phase !== "countdown") return;
    setCountdown(3);
    const start = Date.now();
    const iv = setInterval(() => {
      const c = 3 - Math.floor((Date.now() - start) / 1000);
      if (c <= 0) {
        clearInterval(iv);
        setPhase("playing");
        setQIdx(0);
      } else {
        setCountdown(c);
      }
    }, 100);
    return () => clearInterval(iv);
  }, [phase]);

  const setupChannel = (roomCode: string, host: boolean, seedQuestions?: MCQ[]) => {
    cleanup();
    const ch = supabase.channel(`battle:${roomCode}`, {
      config: { presence: { key: meId.current } },
    });
    channelRef.current = ch;

    ch.on("presence", { event: "sync" }, () => {
      const state = ch.presenceState() as Record<string, Array<{ name: string }>>;
      const list = Object.entries(state).map(([id, metas]) => ({ id, name: metas[0]?.name || "?" }));
      setPlayers(list);
      // Host auto-starts when 2 players
      if (host && list.length === 2 && seedQuestions) {
        // small delay to let everyone settle
        setTimeout(() => {
          ch.send({ type: "broadcast", event: "start", payload: { questions: seedQuestions, players: list } });
          setQuestions(seedQuestions);
          setScores(Object.fromEntries(list.map((p) => [p.id, 0])));
          setPhase("countdown");
        }, 400);
      }
    });

    ch.on("broadcast", { event: "start" }, ({ payload }) => {
      setQuestions(payload.questions);
      setPlayers(payload.players);
      setScores(Object.fromEntries(payload.players.map((p: any) => [p.id, 0])));
      setPhase("countdown");
    });

    ch.on("broadcast", { event: "answer" }, ({ payload }) => {
      const { playerId, qIdx: aIdx, correct } = payload;
      if (correct) {
        setScores((prev) => ({ ...prev, [playerId]: (prev[playerId] || 0) + 1 }));
      }
      // host advances if both answered
      if (host) {
        hostAnswers.current[aIdx] = (hostAnswers.current[aIdx] || 0) + 1;
        if (hostAnswers.current[aIdx] >= 2) {
          setTimeout(() => advanceQuestion(), 600);
        }
      }
    });

    ch.on("broadcast", { event: "next" }, ({ payload }) => {
      const { qIdx: nextIdx } = payload;
      if (nextIdx >= (questionsRef.current.length || 10)) setPhase("done");
      else setQIdx(nextIdx);
    });

    ch.subscribe(async (status) => {
      if (status === "SUBSCRIBED") {
        await ch.track({ name });
      }
    });
  };

  const hostAnswers = useRef<Record<number, number>>({});

  const advanceQuestion = () => {
    if (!channelRef.current) return;
    const tot = questionsRef.current.length || 10;
    setQIdx((cur) => {
      const next = cur + 1;
      hostAnswers.current = {};
      channelRef.current!.send({ type: "broadcast", event: "next", payload: { qIdx: next } });
      if (next >= tot) {
        setPhase("done");
      }
      return next >= tot ? cur : next;
    });
  };

  const createRoom = () => {
    const c = String(Math.floor(100000 + Math.random() * 900000));
    setCode(c);
    setIsHost(true);
    const seed = Number(c);
    const qs = pickQuestions(qCount, seed, subject);
    setupChannel(c, true, qs);
    setPhase("lobby");
  };

  const joinRoom = () => {
    const c = joinInput.trim();
    if (!/^\d{6}$/.test(c)) { toast.error(t.invalidCode); return; }
    setCode(c);
    setIsHost(false);
    setupChannel(c, false);
    setPhase("lobby");
  };

  const submitAnswer = (idx: number) => {
    if (answered !== null || !channelRef.current) return;
    setAnswered(idx);
    setAnsweredFor(qIdx);
    const correct = questions[qIdx]?.answer === idx;
    if (correct) setScores((prev) => ({ ...prev, [meId.current]: (prev[meId.current] || 0) + 1 }));
    channelRef.current.send({
      type: "broadcast",
      event: "answer",
      payload: { playerId: meId.current, qIdx, correct },
    });
  };

  // Award points on completion
  const awardedRef = useRef(false);
  useEffect(() => {
    if (phase !== "done" || awardedRef.current) return;
    awardedRef.current = true;
    const myScore = scores[meId.current] || 0;
    const oppId = players.find((p) => p.id !== meId.current)?.id;
    const oppScore = oppId ? (scores[oppId] || 0) : 0;
    const won = myScore > oppScore;
    const earned = myScore * 2 + (won ? (questionsRef.current.length || 10) : 0);
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (u.user && earned > 0) {
          await supabase.rpc("award_points_safe", {
            _source: "live_battle",
            _points: earned,
            _ref_id: code,
          });
        }
      } catch { /* ignore */ }
    })();
  }, [phase, scores, players, code]);

  const restart = () => {
    cleanup();
    setPhase("menu");
    setCode("");
    setJoinInput("");
    setQuestions([]);
    setQIdx(0);
    setScores({});
    setPlayers([]);
    awardedRef.current = false;
    hostAnswers.current = {};
  };

  const me = players.find((p) => p.id === meId.current);
  const opp = players.find((p) => p.id !== meId.current);
  const myScore = scores[meId.current] || 0;
  const oppScore = opp ? (scores[opp.id] || 0) : 0;

  const cur = questions[qIdx];

  return (
    <main className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 p-4 pb-24" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-2xl mx-auto">
        <div className="flex items-center gap-2 mb-4">
          <Button variant="ghost" size="sm" onClick={guardedBack} disabled={isLocked}>
            <ArrowLeft className="w-4 h-4" /> {t.back}
          </Button>
        </div>

        <div className="text-center mb-6">
          <div className="inline-flex items-center gap-2 text-2xl font-bold">
            <Swords className="w-6 h-6 text-primary" />
            {t.title}
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </div>

        {phase === "menu" && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4">
              <label className="text-sm font-medium">{t.name}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button onClick={() => setPhase("createSettings")} className="rounded-2xl p-6 bg-gradient-to-br from-primary to-primary/70 text-primary-foreground text-left hover:opacity-90 transition">
                <Swords className="w-8 h-8 mb-2" />
                <div className="font-bold text-lg">{t.create}</div>
              </button>
              <button onClick={() => setPhase("join")} className="rounded-2xl p-6 bg-card border text-left hover:bg-accent transition">
                <Users className="w-8 h-8 mb-2 text-primary" />
                <div className="font-bold text-lg">{t.join}</div>
              </button>
            </div>
          </div>
        )}

        {phase === "join" && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4">
              <label className="text-sm font-medium">{t.code}</label>
              <Input
                value={joinInput}
                onChange={(e) => setJoinInput(e.target.value.replace(/\D/g, "").slice(0, 6))}
                placeholder="123456"
                className="mt-2 text-center text-2xl font-mono tracking-widest"
                inputMode="numeric"
              />
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("menu")} className="flex-1">{t.back}</Button>
              <Button onClick={joinRoom} className="flex-1">{t.join}</Button>
            </div>
          </div>
        )}

        {phase === "createSettings" && (
          <div className="space-y-4">
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <label className="text-sm font-medium">{t.subject}</label>
              <div className="grid grid-cols-2 gap-2">
                {([
                  { key: "general", label: t.subjGeneral },
                  { key: "physics", label: t.subjPhysics },
                  { key: "chemistry", label: t.subjChemistry },
                  { key: "biology", label: t.subjBiology },
                  { key: "arabic", label: t.subjArabic },
                  { key: "english", label: t.subjEnglish },
                  { key: "french", label: t.subjFrench },
                  { key: "islamic", label: t.subjIslamic },
                ] as { key: Subject; label: string }[]).map((s) => (
                  <button
                    key={s.key}
                    onClick={() => setSubject(s.key)}
                    className={`rounded-xl border p-3 text-sm transition ${
                      subject === s.key ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-4 space-y-3">
              <label className="text-sm font-medium">{t.questionsCount}</label>
              <div className="grid grid-cols-4 gap-2">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    onClick={() => setQCount(n)}
                    className={`rounded-xl border p-3 text-sm font-bold transition ${
                      qCount === n ? "bg-primary text-primary-foreground border-primary" : "hover:bg-accent"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setPhase("menu")} className="flex-1">{t.back}</Button>
              <Button onClick={createRoom} className="flex-1">{t.createNow}</Button>
            </div>
          </div>
        )}

        {phase === "lobby" && (
          <div className="space-y-4 text-center">
            <div className="rounded-2xl border bg-card p-6">
              <div className="text-sm text-muted-foreground mb-2">{t.shareCode}</div>
              <div className="flex items-center justify-center gap-3">
                <div className="text-4xl font-mono font-bold tracking-widest">{code}</div>
                <Button variant="ghost" size="icon" onClick={() => { navigator.clipboard.writeText(code); toast.success(t.copied); }}>
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div className="rounded-2xl border bg-card p-4">
              <div className="text-sm font-medium mb-2 flex items-center justify-center gap-2">
                <Users className="w-4 h-4" /> {players.length}/2
              </div>
              <div className="space-y-1">
                {players.map((p) => (
                  <div key={p.id} className="text-sm">{p.name}{p.id === meId.current ? ` (${t.you})` : ""}</div>
                ))}
              </div>
              {players.length < 2 && (
                <div className="mt-3 text-xs text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> {t.waiting}
                </div>
              )}
            </div>
            <Button variant="ghost" onClick={restart}>{t.back}</Button>
          </div>
        )}

        {phase === "countdown" && (
          <div className="text-center py-20">
            <div className="text-sm text-muted-foreground mb-4">{t.starting}</div>
            <div className="text-8xl font-bold text-primary animate-pulse">{countdown}</div>
          </div>
        )}

        {phase === "playing" && cur && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-card p-3">
                <div className="text-xs text-muted-foreground truncate">{me?.name || t.you}</div>
                <div className="text-2xl font-bold text-primary">{myScore}</div>
              </div>
              <div className="rounded-xl border bg-card p-3">
                <div className="text-xs text-muted-foreground truncate">{opp?.name || t.opp}</div>
                <div className="text-2xl font-bold">{oppScore}</div>
              </div>
            </div>

            <div className="flex justify-between items-center text-xs text-muted-foreground">
              <span>{t.q} {qIdx + 1} {t.of} {questions.length}</span>
              <span className={timeLeft <= 5 ? "text-destructive font-bold" : ""}>{timeLeft}s</span>
            </div>
            <Progress value={(timeLeft / 15) * 100} className="h-2" />

            <div className="rounded-2xl border bg-card p-6">
              <div className="text-lg font-medium mb-4">{cur.q}</div>
              <div className="grid gap-2">
                {cur.choices.map((c, i) => {
                  const hasAnswered = answered !== null && answeredFor === qIdx;
                  const isMine = hasAnswered && answered === i;
                  const isCorrect = cur.answer === i;
                  return (
                    <button
                      key={i}
                      disabled={hasAnswered}
                      onClick={() => submitAnswer(i)}
                      className={`rounded-xl border p-3 text-left transition ${
                        hasAnswered
                          ? isCorrect
                            ? "bg-green-100 border-green-500 text-green-900"
                            : isMine
                              ? "bg-red-100 border-red-500 text-red-900"
                              : "opacity-60"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span className="font-mono text-xs me-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                      {c}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {phase === "done" && (
          <div className="text-center space-y-6 py-8">
            <Trophy className="w-20 h-20 text-amber-500 mx-auto" />
            <div className="text-3xl font-bold">
              {myScore === oppScore ? t.tie : myScore > oppScore ? t.youWin : t.youLose}
            </div>
            <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto">
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">{me?.name || t.you}</div>
                <div className="text-3xl font-bold text-primary">{myScore}</div>
              </div>
              <div className="rounded-xl border bg-card p-4">
                <div className="text-xs text-muted-foreground">{opp?.name || t.opp}</div>
                <div className="text-3xl font-bold">{oppScore}</div>
              </div>
            </div>
            <div className="text-sm text-muted-foreground">
              {t.pointsEarned}: <span className="font-bold text-foreground">{myScore * 2 + (myScore > oppScore ? questions.length : 0)}</span>
            </div>
            <Button onClick={restart} size="lg">{t.playAgain}</Button>
          </div>
        )}
      </div>
    </main>
  );
}