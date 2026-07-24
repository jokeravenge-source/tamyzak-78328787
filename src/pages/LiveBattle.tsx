import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Swords, Users, Trophy, Copy, Loader2, Check, X, Sparkles, Upload, FileText, User, Shuffle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import { buildBattleMcqs, type BattleSubject, type BattleMCQ } from "@/lib/battleMcqBank";
import { extractStudyMaterial } from "@/lib/fileText";

type Subject = BattleSubject;
type MCQ = BattleMCQ;

const QUESTION_TIME = 25;
const SOLO_QUESTION_TIME = 20;

function pickQuestions(n: number, seed: number, subject: Subject = "general"): MCQ[] {
  // Mix in time-based randomness so each room gets a fresh set even with the same seed range.
  const mixed = (seed ^ Date.now()) >>> 0;
  return buildBattleMcqs(subject, n, mixed);
}

const T = (l: AppLanguage) => ({
  title: l === "ar" ? "المعركة المباشرة" : "Live Battle",
  subtitle: l === "ar" ? "اختر طريقتك: تدرّب لوحدك، تحدَّ لاعباً عشوائياً، أو العب مع صديق" : "Choose your mode: solo, random match, or play with a friend",
  soloMode: l === "ar" ? "ابدأ الحل" : "Start solving",
  soloDesc: l === "ar" ? "ارفع ملفاً وحل الأسئلة بمفردك" : "Upload a file and solve on your own",
  randomMode: l === "ar" ? "منافسة عشوائية" : "Pick a battle randomly",
  randomDesc: l === "ar" ? "طابق مع طالب آخر حسب المادة والفصل" : "Match another student by subject & chapter",
  friendMode: l === "ar" ? "العب مع صديق" : "Play with a friend",
  friendDesc: l === "ar" ? "أنشئ غرفة وشارك الرمز" : "Create a room and share the code",
  create: l === "ar" ? "إنشاء غرفة" : "Create Room",
  join: l === "ar" ? "انضمام لغرفة" : "Join Room",
  back: l === "ar" ? "رجوع" : "Back",
  name: l === "ar" ? "اسمك" : "Your name",
  code: l === "ar" ? "رمز الغرفة" : "Room code",
  shareCode: l === "ar" ? "شارك هذا الرمز مع صديقك" : "Share this code with your friend",
  waiting: l === "ar" ? "بانتظار اللاعب الثاني..." : "Waiting for second player...",
  searching: l === "ar" ? "جاري البحث عن منافس..." : "Searching for an opponent...",
  matchFound: l === "ar" ? "تم إيجاد منافس!" : "Match found!",
  cancelSearch: l === "ar" ? "إلغاء البحث" : "Cancel search",
  subject: l === "ar" ? "المادة" : "Subject",
  chapter: l === "ar" ? "الفصل" : "Chapter",
  findMatch: l === "ar" ? "ابحث عن منافس" : "Find opponent",
  finish: l === "ar" ? "إنهاء" : "Finish",
  next: l === "ar" ? "التالي" : "Next",
  starting: l === "ar" ? "تبدأ خلال" : "Starting in",
  q: l === "ar" ? "سؤال" : "Question",
  of: l === "ar" ? "من" : "of",
  you: l === "ar" ? "أنت" : "You",
  opp: l === "ar" ? "الخصم" : "Opponent",
  winner: l === "ar" ? "الفائز" : "Winner",
  tie: l === "ar" ? "تعادل!" : "It's a tie!",
  youWin: l === "ar" ? "فزت! 🎉" : "You win! 🎉",
  youLose: l === "ar" ? "خسارة 😔" : "You lost 😔",
  soloDone: l === "ar" ? "انتهيت!" : "All done!",
  pointsEarned: l === "ar" ? "نقاط مكتسبة" : "Points earned",
  correctCount: l === "ar" ? "إجابات صحيحة" : "Correct answers",
  playAgain: l === "ar" ? "العب مرة أخرى" : "Play again",
  invalidCode: l === "ar" ? "أدخل رمزاً صحيحاً" : "Enter a valid 6-digit code",
  copied: l === "ar" ? "تم النسخ" : "Copied",
  start: l === "ar" ? "ابدأ" : "Start",
  locked: l === "ar" ? "لا يمكنك مغادرة المعركة حتى تنتهي" : "You can't leave until the battle is over",
  questionsCount: l === "ar" ? "عدد الأسئلة" : "Number of questions",
  createNow: l === "ar" ? "إنشاء الغرفة" : "Create room",
  startSolo: l === "ar" ? "ابدأ الحل" : "Start solving",
  uploadFile: l === "ar" ? "ارفع ملف الدراسة" : "Upload study file",
  uploadHint: l === "ar" ? "PDF أو DOCX أو TXT" : "PDF, DOCX, or TXT",
  noFile: l === "ar" ? "اختر ملفاً أولاً" : "Pick a file first",
  generating: l === "ar" ? "جارٍ توليد الأسئلة…" : "Generating questions…",
  reading: l === "ar" ? "جارٍ قراءة الملف…" : "Reading file…",
  noText: l === "ar" ? "تعذرت قراءة النص من الملف" : "Could not read text from this file",
  genFailed: l === "ar" ? "تعذّر توليد الأسئلة" : "Failed to generate questions",
});

type Phase =
  | "menu"
  | "soloSetup"
  | "soloPlaying"
  | "soloDone"
  | "randomSetup"
  | "matchmaking"
  | "createSettings"
  | "join"
  | "lobby"
  | "countdown"
  | "playing"
  | "done";

const SUBJECT_OPTIONS: { key: BattleSubject; ar: string; en: string }[] = [
  { key: "physics",   ar: "فيزياء",   en: "Physics" },
  { key: "chemistry", ar: "كيمياء",   en: "Chemistry" },
  { key: "biology",   ar: "أحياء",     en: "Biology" },
  { key: "arabic",    ar: "عربي",     en: "Arabic" },
  { key: "english",   ar: "إنجليزي", en: "English" },
  { key: "french",    ar: "فرنسي",   en: "French" },
  { key: "islamic",   ar: "إسلامية", en: "Islamic" },
];

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
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [scores, setScores] = useState<Record<string, number>>({});
  const [answered, setAnswered] = useState<number | null>(null);
  const [answeredFor, setAnsweredFor] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<null | "correct" | "wrong">(null);
  const [countdown, setCountdown] = useState(3);
  const [subject, setSubject] = useState<Subject>("general");
  const [qCount, setQCount] = useState<number>(10);
  const [file, setFile] = useState<File | null>(null);
  const [creating, setCreating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
    setTimeLeft(QUESTION_TIME);
    setAnswered(null);
    setAnsweredFor(null);
    setFeedback(null);
    const start = Date.now();
    const iv = setInterval(() => {
      const left = Math.max(0, QUESTION_TIME - Math.floor((Date.now() - start) / 1000));
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

  const onPickFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) { toast.error("Max 100MB"); return; }
    const ok = /\.(pdf|docx|txt)$/i.test(f.name) || f.type === "application/pdf" || f.type.startsWith("text/");
    if (!ok) { toast.error("PDF / DOCX / TXT only"); return; }
    setFile(f);
  };

  const createRoom = async () => {
    if (!file) { toast.error(t.noFile); return; }
    setCreating(true);
    try {
      toast.loading(t.reading, { id: "battle-ext" });
      const material = await extractStudyMaterial(file);
      toast.dismiss("battle-ext");
      if ((!material.text || material.text.trim().length < 50) && !material.pageImages?.length) {
        toast.error(t.noText);
        setCreating(false);
        return;
      }
      toast.loading(t.generating, { id: "battle-gen" });
      const { data, error } = await supabase.functions.invoke("generate-mcq", {
        body: { text: material.text, pageImages: material.pageImages, count: qCount, language },
      });
      toast.dismiss("battle-gen");
      if (error) throw error;
      if (data?.error) throw new Error(data.message || data.error);
      const raw: any[] = (data?.questions || []).filter((q: any) => q?.choices?.length === 4);
      if (!raw.length) throw new Error(t.genFailed);
      const qs: MCQ[] = raw.slice(0, qCount).map((q) => ({
        q: q.question,
        choices: q.choices,
        answer: q.answer_index,
        subject: "general" as BattleSubject,
      }));

      const c = String(Math.floor(100000 + Math.random() * 900000));
      setCode(c);
      setIsHost(true);
      setupChannel(c, true, qs);
      setPhase("lobby");
    } catch (e: any) {
      toast.dismiss();
      toast.error(e?.message || t.genFailed);
    } finally {
      setCreating(false);
    }
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
    setFeedback(correct ? "correct" : "wrong");
    if (correct) {
      setScores((prev) => ({ ...prev, [meId.current]: (prev[meId.current] || 0) + 1 }));
      // Award 1 point per correct answer (deduped by ref_id)
      (async () => {
        try {
          const { data: u } = await supabase.auth.getUser();
          if (u.user) {
            await supabase.rpc("award_points_safe", {
              _source: "live_battle",
              _points: 1,
              _ref_id: `${code}:${qIdx}`,
            });
          }
        } catch { /* ignore */ }
      })();
    }
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

        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="text-center mb-6"
        >
          <div className="inline-flex items-center gap-2 text-3xl font-extrabold">
            <motion.span
              animate={{ rotate: [-12, 12, -12] }}
              transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
              className="inline-flex"
            >
              <Swords className="w-7 h-7 text-rose-500" />
            </motion.span>
            <span className="bg-gradient-to-r from-fuchsia-600 via-rose-500 to-orange-500 bg-clip-text text-transparent">
              {t.title}
            </span>
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-rose-500" />
            </span>
          </div>
          <p className="text-sm text-muted-foreground mt-1">{t.subtitle}</p>
        </motion.div>

        {phase === "menu" && (
          <motion.div
            initial="hidden"
            animate="show"
            variants={{ hidden: {}, show: { transition: { staggerChildren: 0.08 } } }}
            className="space-y-4"
          >
            <div className="rounded-2xl border bg-card p-4">
              <label className="text-sm font-medium">{t.name}</label>
              <Input value={name} onChange={(e) => setName(e.target.value)} className="mt-2" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <motion.button
                onClick={() => setPhase("createSettings")}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="relative group rounded-2xl text-left overflow-hidden"
              >
                <span
                  aria-hidden
                  className="absolute -inset-[1.5px] rounded-2xl"
                  style={{
                    background:
                      "conic-gradient(from 0deg, hsl(var(--primary)), #d946ef, #f97316, #ef4444, hsl(var(--primary)))",
                    animation: "spin 6s linear infinite",
                  }}
                />
                <div className="relative rounded-2xl p-6 bg-gradient-to-br from-fuchsia-600 via-rose-500 to-orange-500 text-white overflow-hidden">
                  <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/30 to-transparent" />
                  <motion.div
                    animate={{ rotate: [-10, 10, -10] }}
                    transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
                  >
                    <Swords className="w-8 h-8 mb-2 drop-shadow" />
                  </motion.div>
                  <div className="font-bold text-lg">{t.create}</div>
                </div>
              </motion.button>
              <motion.button
                onClick={() => setPhase("join")}
                variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                whileHover={{ y: -3, scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
                className="relative group rounded-2xl p-6 bg-card border-2 border-primary/20 text-left hover:border-primary/60 transition overflow-hidden"
              >
                <div className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-primary/10 to-transparent" />
                <motion.div
                  animate={{ y: [0, -4, 0] }}
                  transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                >
                  <Users className="w-8 h-8 mb-2 text-primary" />
                </motion.div>
                <div className="font-bold text-lg">{t.join}</div>
              </motion.button>
            </div>
          </motion.div>
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
              <label className="text-sm font-medium">{t.uploadFile}</label>
              <div
                onClick={() => fileInputRef.current?.click()}
                className="cursor-pointer border-2 border-dashed border-primary/30 hover:border-primary rounded-xl p-6 text-center transition"
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,.docx,.txt,application/pdf,text/plain"
                  onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
                />
                {file ? (
                  <div className="flex flex-col items-center gap-1">
                    <FileText className="w-8 h-8 text-primary" />
                    <p className="font-medium text-sm truncate max-w-full">{file.name}</p>
                    <p className="text-xs text-muted-foreground">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-1">
                    <Upload className="w-8 h-8 text-primary" />
                    <p className="font-medium text-sm">{t.uploadFile}</p>
                    <p className="text-xs text-muted-foreground">{t.uploadHint}</p>
                  </div>
                )}
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
              <Button variant="outline" onClick={() => setPhase("menu")} className="flex-1" disabled={creating}>{t.back}</Button>
              <Button onClick={createRoom} className="flex-1" disabled={creating || !file}>
                {creating ? <><Loader2 className="w-4 h-4 animate-spin" /> {t.generating}</> : t.createNow}
              </Button>
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
            <Progress value={(timeLeft / QUESTION_TIME) * 100} className="h-2" />

            <motion.div
              key={qIdx}
              animate={feedback === "wrong" ? { x: [0, -10, 10, -8, 8, -4, 4, 0] } : {}}
              transition={{ duration: 0.5 }}
              className="relative rounded-2xl border bg-card p-6 overflow-hidden"
            >
              <AnimatePresence>
                {feedback === "correct" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-green-400/20 via-emerald-300/10 to-transparent"
                  />
                )}
                {feedback === "wrong" && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="pointer-events-none absolute inset-0 bg-gradient-to-br from-red-500/20 via-rose-400/10 to-transparent"
                  />
                )}
              </AnimatePresence>
              <div className="text-lg font-medium mb-4">{cur.q}</div>
              <div className="grid gap-2">
                {cur.choices.map((c, i) => {
                  const hasAnswered = answered !== null && answeredFor === qIdx;
                  const isMine = hasAnswered && answered === i;
                  const isCorrect = cur.answer === i;
                  return (
                    <motion.button
                      key={i}
                      disabled={hasAnswered}
                      onClick={() => submitAnswer(i)}
                      animate={
                        hasAnswered && isCorrect
                          ? { scale: [1, 1.04, 1] }
                          : hasAnswered && isMine && !isCorrect
                            ? { x: [0, -6, 6, -4, 4, 0] }
                            : {}
                      }
                      transition={{ duration: 0.45 }}
                      className={`relative rounded-xl border p-3 text-left transition ${
                        hasAnswered
                          ? isCorrect
                            ? "bg-green-100 border-green-500 text-green-900 shadow-[0_0_24px_rgba(34,197,94,0.5)]"
                            : isMine
                              ? "bg-red-100 border-red-500 text-red-900 shadow-[0_0_18px_rgba(239,68,68,0.45)]"
                              : "opacity-60"
                          : "hover:bg-accent"
                      }`}
                    >
                      <span className="font-mono text-xs me-2 opacity-60">{String.fromCharCode(65 + i)}.</span>
                      {c}
                      {hasAnswered && isCorrect && (
                        <Check className="w-5 h-5 text-green-600 absolute top-1/2 -translate-y-1/2 end-3" />
                      )}
                      {hasAnswered && isMine && !isCorrect && (
                        <X className="w-5 h-5 text-red-600 absolute top-1/2 -translate-y-1/2 end-3" />
                      )}
                    </motion.button>
                  );
                })}
              </div>
            </motion.div>

            <AnimatePresence>
              {feedback === "correct" && (
                <motion.div
                  key={`fb-c-${qIdx}`}
                  initial={{ scale: 0.4, opacity: 0, y: 20 }}
                  animate={{ scale: 1, opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={{ type: "spring", stiffness: 280, damping: 18 }}
                  className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
                >
                  <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-emerald-500 to-green-600 text-white px-6 py-4 shadow-2xl">
                    <Sparkles className="w-7 h-7" />
                    <div>
                      <div className="text-lg font-extrabold leading-none">
                        {language === "ar" ? "إجابة صحيحة!" : "Correct!"}
                      </div>
                      <div className="text-sm opacity-90">+1 {language === "ar" ? "نقطة" : "point"}</div>
                    </div>
                  </div>
                </motion.div>
              )}
              {feedback === "wrong" && (
                <motion.div
                  key={`fb-w-${qIdx}`}
                  initial={{ scale: 0.6, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1, x: [0, -8, 8, -6, 6, 0] }}
                  exit={{ opacity: 0, scale: 0.85 }}
                  transition={{ duration: 0.5 }}
                  className="pointer-events-none fixed inset-0 z-50 flex items-center justify-center"
                >
                  <div className="flex items-center gap-3 rounded-2xl bg-gradient-to-br from-rose-500 to-red-600 text-white px-6 py-4 shadow-2xl">
                    <X className="w-7 h-7" />
                    <div className="text-lg font-extrabold">
                      {language === "ar" ? "خطأ!" : "Wrong!"}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
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