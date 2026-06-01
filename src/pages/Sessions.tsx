import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Pause, Square, Trophy, Timer, Target, Music, SkipForward, Volume2, VolumeX, Info, BookOpen, Languages, Globe, Sigma, Atom, FlaskConical, Leaf, Moon, Coffee, Settings } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import track1 from "@/assets/music/track1.mp3";
import track2 from "@/assets/music/track2.mp3";
import track3 from "@/assets/music/track3.mp3";
import track4 from "@/assets/music/track4.mp3";
import track5 from "@/assets/music/track5.mp3";
import track6 from "@/assets/music/track6.mp3";
import quranTrack from "@/assets/music/quran.mp3";
import StudyRoom from "@/components/StudyRoom";

const MUSIC_TRACKS = [track1, track2, track3, track4, track5, track6];
const QURAN_TRACKS = [quranTrack];
const MAX_SECONDS = 48 * 3600;
const PERSIST_KEY = "study_session_state_v1";
const POMODORO_KEY = "pomodoro_settings_v1";
const DEFAULT_WORK_MIN = 45;
const DEFAULT_REST_MIN = 15;

// Play a multi-beep alarm via WebAudio (no asset needed).
const playAlarm = () => {
  try {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return;
    const ctx = new AC();
    const now = ctx.currentTime;
    const beeps = 6;
    for (let i = 0; i < beeps; i++) {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = 880;
      const t0 = now + i * 0.35;
      g.gain.setValueAtTime(0, t0);
      g.gain.linearRampToValueAtTime(0.5, t0 + 0.02);
      g.gain.linearRampToValueAtTime(0, t0 + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(t0);
      o.stop(t0 + 0.27);
    }
    setTimeout(() => ctx.close().catch(() => {}), beeps * 400 + 500);
  } catch {}
};

const SUBJECTS = [
  { code: "islamic", en: "Islamic", ar: "التربية الإسلامية", Icon: Moon },
  { code: "arabic", en: "Arabic", ar: "العربية", Icon: BookOpen },
  { code: "english", en: "English", ar: "الإنجليزية", Icon: Languages },
  { code: "french", en: "French", ar: "الفرنسية", Icon: Globe },
  { code: "math", en: "Math", ar: "الرياضيات", Icon: Sigma },
  { code: "physics", en: "Physics", ar: "الفيزياء", Icon: Atom },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء", Icon: FlaskConical },
  { code: "biology", en: "Biology", ar: "الأحياء", Icon: Leaf },
] as const;

const T = {
  en: {
    title: "Study Sessions", desc: "Pick a subject, set a mission, and earn points.",
    leaderboard: "Leaderboard", mission: "Mission for this session", missionPh: "e.g. Finish chapter 3 exercises",
    start: "Start", pause: "Pause", resume: "Resume", stop: "Stop & save",
    completed: "Mark mission completed", points: "pts", hours: "hours", minutes: "min", noOne: "No scores yet.",
    switchRoom: "Switch room",
    saved: "Session saved",
    pointsTitle: "How points work",
    pointsLine1: "You earn 1 point for every full hour you study.",
    pointsLine2: "Finish your mission and get +1 bonus point.",
    pointsLine3: "Points add up per subject on the leaderboard.",
    pomodoro: "Pomodoro (45 / 15)",
    pomodoroOn: "Pomodoro on",
    pomodoroOff: "Pomodoro off",
    workPhase: "Focus time",
    restPhase: "Break time",
    workDone: "Time for a 15-minute break!",
    restDone: "Break over — back to focus!",
  },
  ar: {
    title: "جلسات الدراسة", desc: "اختر مادة وحدد مهمتك واكسب النقاط.",
    leaderboard: "لوحة المتصدرين", mission: "مهمة هذه الجلسة", missionPh: "مثلاً: إنهاء تمارين الفصل 3",
    start: "ابدأ", pause: "إيقاف مؤقت", resume: "متابعة", stop: "إيقاف وحفظ",
    completed: "تم إنجاز المهمة", points: "نقطة", hours: "ساعة", minutes: "دقيقة", noOne: "لا توجد نتائج بعد.",
    switchRoom: "تغيير الغرفة",
    saved: "تم حفظ الجلسة",
    pointsTitle: "كيف تُحسب النقاط",
    pointsLine1: "تحصل على نقطة واحدة لكل ساعة دراسة كاملة.",
    pointsLine2: "إذا أنجزت مهمتك تحصل على نقطة إضافية (+1).",
    pointsLine3: "تتجمع النقاط لكل مادة على لوحة المتصدرين.",
    pomodoro: "بومودورو (45 / 15)",
    pomodoroOn: "بومودورو مفعّل",
    pomodoroOff: "بومودورو متوقف",
    workPhase: "وقت التركيز",
    restPhase: "وقت الراحة",
    workDone: "حان وقت الاستراحة 15 دقيقة!",
    restDone: "انتهت الاستراحة — عُد للتركيز!",
  },
} as const;

const fmt = (s: number) => {
  const h = Math.floor(s / 3600).toString().padStart(2, "0");
  const m = Math.floor((s % 3600) / 60).toString().padStart(2, "0");
  const sec = (s % 60).toString().padStart(2, "0");
  return `${h}:${m}:${sec}`;
};

const Sessions = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const L = T[language];
  const dir = language === "ar" ? "rtl" : "ltr";
  const [subject, setSubject] = useState<string | null>(null);
  const [mission, setMission] = useState("");
  const [seconds, setSeconds] = useState(0);
  const [running, setRunning] = useState(false);
  const [started, setStarted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [board, setBoard] = useState<{ name: string; points: number }[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [displayName, setDisplayName] = useState("");
  const [pomodoro, setPomodoro] = useState(false);
  const [pomodoroWorkMin, setPomodoroWorkMin] = useState(DEFAULT_WORK_MIN);
  const [pomodoroRestMin, setPomodoroRestMin] = useState(DEFAULT_REST_MIN);
  const [phase, setPhase] = useState<"work" | "rest">("work");
  const phaseStartRef = useRef(0);
  const lastPhaseSwitchRef = useRef(0);
  const intervalRef = useRef<number | null>(null);
  // Wall-clock timer refs: drift-proof across device sleep / background tabs.
  const resumeAtRef = useRef<number>(0);
  const accumulatedRef = useRef<number>(0);
  const [trackIdx, setTrackIdx] = useState(0);
  const [playlist, setPlaylist] = useState<"music" | "quran">("music");
  const [musicPlaying, setMusicPlaying] = useState(false);
  const TRACKS = playlist === "quran" ? QURAN_TRACKS : MUSIC_TRACKS;
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const savingRef = useRef(false);
  const heartbeatRef = useRef<number | null>(null);
  // Mirror the studying timer so presence writes can reflect accumulated seconds
  // (paused-aware), making the room timer match the user's own timer exactly.
  const secondsRef = useRef(0);
  useEffect(() => { secondsRef.current = seconds; }, [seconds]);
  const runningRef = useRef(false);
  useEffect(() => { runningRef.current = running; }, [running]);

  // Pomodoro phase switching: work min of studying triggers rest min rest, then back to work.
  useEffect(() => {
    if (!pomodoro || !started) return;
    if (phase === "work") {
      const workElapsed = seconds - phaseStartRef.current;
      if (workElapsed >= pomodoroWorkMin * 60 && lastPhaseSwitchRef.current !== seconds) {
        lastPhaseSwitchRef.current = seconds;
        setPhase("rest");
        phaseStartRef.current = Date.now();
        setRunning(false);
        toast.success(L.workDone);
        playAlarm();
      }
    }
  }, [seconds, pomodoro, started, phase, pomodoroWorkMin, L.workDone]);

  // Rest timer (separate, real-time)
  const [restRemaining, setRestRemaining] = useState(0);
  useEffect(() => {
    if (!pomodoro || phase !== "rest" || !started) return;
    const restSeconds = pomodoroRestMin * 60;
    setRestRemaining(restSeconds);
    const start = Date.now();
    const id = window.setInterval(() => {
      const left = restSeconds - Math.floor((Date.now() - start) / 1000);
      if (left <= 0) {
        window.clearInterval(id);
        setRestRemaining(0);
        setPhase("work");
        phaseStartRef.current = secondsRef.current;
        lastPhaseSwitchRef.current = -1;
        setRunning(true);
        toast.success(L.restDone);
        playAlarm();
      } else {
        setRestRemaining(left);
      }
    }, 500);
    return () => window.clearInterval(id);
  }, [phase, pomodoro, started, pomodoroRestMin, L.restDone]);

  // --- Live presence helpers ---
  const upsertPresence = async (subj: string, miss: string) => {
    if (!userId) return;
    const nowMs = Date.now();
    const startedIso = new Date(nowMs - secondsRef.current * 1000).toISOString();
    const nowIso = new Date(nowMs).toISOString();
    await supabase.from("active_sessions").upsert(
      {
        user_id: userId,
        subject: subj,
        mission: miss.slice(0, 200),
        last_seen_at: nowIso,
        started_at: startedIso,
        elapsed_seconds: secondsRef.current,
        is_running: runningRef.current,
      },
      { onConflict: "user_id" }
    );
  };
  const clearPresence = async () => {
    if (!userId) return;
    await supabase.from("active_sessions").delete().eq("user_id", userId);
  };

  // Push a single presence update (used by heartbeat, focus, and pause/resume).
  const pushPresence = async () => {
    if (!userId) return;
    const nowMs = Date.now();
    const startedIso = new Date(nowMs - secondsRef.current * 1000).toISOString();
    await supabase
      .from("active_sessions")
      .update({
        last_seen_at: new Date(nowMs).toISOString(),
        started_at: startedIso,
        elapsed_seconds: secondsRef.current,
        is_running: runningRef.current,
      })
      .eq("user_id", userId);
  };

  // Heartbeat while a subject is selected so the room keeps showing the user
  // (even while paused). Only fully clear presence when leaving the page.
  useEffect(() => {
    if (heartbeatRef.current) { window.clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    if (userId && subject) {
      upsertPresence(subject, mission);
      heartbeatRef.current = window.setInterval(() => {
        pushPresence();
      }, 10000);
      // Also refresh on tab focus (setInterval is throttled in background tabs).
      const onVis = () => {
        if (document.visibilityState === "visible" && userId) pushPresence();
      };
      document.addEventListener("visibilitychange", onVis);
      window.addEventListener("focus", onVis);
      return () => {
        document.removeEventListener("visibilitychange", onVis);
        window.removeEventListener("focus", onVis);
        if (heartbeatRef.current) { window.clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
      };
    }
    return () => {
      if (heartbeatRef.current) { window.clearInterval(heartbeatRef.current); heartbeatRef.current = null; }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, subject]);

  // Immediate sync whenever play/pause toggles so the room reflects it instantly.
  useEffect(() => {
    if (userId && subject) pushPresence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running]);

  // Remove presence when leaving the page/tab or unmounting Sessions
  useEffect(() => {
    const onUnload = () => { if (userId) { clearPresence(); } };
    window.addEventListener("beforeunload", onUnload);
    return () => {
      window.removeEventListener("beforeunload", onUnload);
      if (userId) { clearPresence(); }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  // Restore persisted session on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem(PERSIST_KEY);
      if (!raw) return;
      const s = JSON.parse(raw);
      if (!s?.subject) return;
      const base = s.accumulated ?? 0;
      const extra = s.running && s.startedAt ? Math.floor((Date.now() - s.startedAt) / 1000) : 0;
      let total = base + extra;
      if (total >= MAX_SECONDS) total = MAX_SECONDS;
      setSubject(s.subject);
      setMission(s.mission ?? "");
      setCompleted(!!s.completed);
      setStarted(true);
      setSeconds(total);
      setRunning(!!s.running && total < MAX_SECONDS);
      accumulatedRef.current = total;
      resumeAtRef.current = Date.now();
    } catch {}
  }, []);

  // Persist on relevant state changes
  useEffect(() => {
    if (!started || !subject) return;
    const payload = {
      subject, mission, completed, started: true,
      running,
      startedAt: running ? Date.now() : null,
      accumulated: seconds,
    };
    localStorage.setItem(PERSIST_KEY, JSON.stringify(payload));
  }, [started, subject, mission, completed, running, seconds]);

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      const u = data.user;
      if (!u) return;
      setUserId(u.id);
      const { data: prof } = await supabase.from("profiles").select("display_name").eq("user_id", u.id).maybeSingle();
      if (prof?.display_name) setDisplayName(prof.display_name);
      else {
        const fallback = u.email?.split("@")[0] ?? "Student";
        setDisplayName(fallback);
        await supabase.from("profiles").insert({ user_id: u.id, display_name: fallback });
      }
    });
  }, []);

  useEffect(() => {
    if (!subject) return;
    loadBoard(subject);
  }, [subject]);

  useEffect(() => {
    if (running) {
      resumeAtRef.current = Date.now();
      accumulatedRef.current = secondsRef.current;
      const tick = () => {
        const elapsed = accumulatedRef.current + Math.floor((Date.now() - resumeAtRef.current) / 1000);
        if (elapsed >= MAX_SECONDS) { setSeconds(MAX_SECONDS); setRunning(false); }
        else setSeconds(elapsed);
      };
      tick();
      intervalRef.current = window.setInterval(tick, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [running]);

  // Recompute elapsed when tab regains focus
  useEffect(() => {
    const onVis = () => {
      if (document.visibilityState !== "visible") return;
      if (runningRef.current) {
        const elapsed = accumulatedRef.current + Math.floor((Date.now() - resumeAtRef.current) / 1000);
        if (elapsed >= MAX_SECONDS) { setSeconds(MAX_SECONDS); setRunning(false); }
        else setSeconds(elapsed);
      }
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    window.addEventListener("pageshow", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
      window.removeEventListener("pageshow", onVis);
    };
  }, []);

  // Auto stop+save at max
  useEffect(() => {
    if (started && seconds >= MAX_SECONDS && running === false) {
      // fire once
      stopAndSave();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [seconds, started]);

  // Music volume sync
  useEffect(() => { if (audioRef.current) audioRef.current.volume = volume; }, [volume]);

  const loadBoard = async (subj: string) => {
    const { data } = await supabase.from("study_sessions").select("user_id,points").eq("subject", subj);
    if (!data) return;
    const map = new Map<string, number>();
    data.forEach((r: any) => map.set(r.user_id, (map.get(r.user_id) ?? 0) + (r.points ?? 0)));
    const ids = Array.from(map.keys());
    if (ids.length === 0) { setBoard([]); return; }
    const { data: profs } = await supabase.from("profiles").select("user_id,display_name").in("user_id", ids);
    const nameMap = new Map<string, string>();
    (profs ?? []).forEach((p: any) => nameMap.set(p.user_id, p.display_name));
    const rows = ids
      .map((id) => ({ name: nameMap.get(id) ?? "Student", points: map.get(id) ?? 0 }))
      .sort((a, b) => b.points - a.points)
      .slice(0, 20);
    setBoard(rows);
  };

  const startSession = () => {
    if (!mission.trim()) { toast.error(language === "ar" ? "أدخل مهمتك" : "Type a mission first"); return; }
    setStarted(true);
    setRunning(true);
    setPhase("work");
    phaseStartRef.current = 0;
    lastPhaseSwitchRef.current = -1;
  };

  const stopAndSave = async () => {
    if (!userId || !subject) return;
    if (savingRef.current) return;
    if (seconds <= 0) {
      setStarted(false); setRunning(false); setMission(""); setCompleted(false);
      localStorage.removeItem(PERSIST_KEY);
      return;
    }
    savingRef.current = true;
    setRunning(false);
    clearPresence();
    // 1 point per full studied hour.
    const points = Math.floor(seconds / 3600);
    const { data: inserted, error } = await supabase.from("study_sessions").insert({
      user_id: userId, subject, mission: mission.trim(), duration_seconds: seconds,
      mission_completed: completed, points,
    }).select("id").single();
    if (error) { savingRef.current = false; toast.error(error.message); return; }
    if (points > 0 && inserted?.id) {
      await supabase.from("user_points").insert({
        user_id: userId, source: "session", points, ref_id: inserted.id,
      });
    }
    toast.success(`${L.saved} (+${points} ${L.points})`);
    setStarted(false); setSeconds(0); setMission(""); setCompleted(false);
    localStorage.removeItem(PERSIST_KEY);
    setPhase("work");
    phaseStartRef.current = 0;
    lastPhaseSwitchRef.current = -1;
    loadBoard(subject);
    setTimeout(() => { savingRef.current = false; }, 500);
  };

  const toggleMusic = async () => {
    const a = audioRef.current;
    if (!a) return;
    if (musicPlaying) { a.pause(); setMusicPlaying(false); }
    else { try { await a.play(); setMusicPlaying(true); } catch {} }
  };
  const nextTrack = () => {
    setTrackIdx((i) => (i + 1) % TRACKS.length);
    setTimeout(() => { if (musicPlaying) audioRef.current?.play().catch(() => {}); }, 50);
  };

  const switchPlaylist = (p: "music" | "quran") => {
    if (p === playlist) return;
    setPlaylist(p);
    setTrackIdx(0);
    setTimeout(() => { if (musicPlaying) audioRef.current?.play().catch(() => {}); }, 50);
  };

  if (!subject) {
    return (
    <main className="relative min-h-screen px-4 py-10 md:py-16" dir={dir}>
      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <header className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">{L.title}</h1>
          <p className="text-muted-foreground">{L.desc}</p>
        </header>
        <div className="max-w-2xl mx-auto mb-8 rounded-2xl border border-primary/30 bg-primary/5 backdrop-blur p-5">
          <div className="flex items-center gap-2 mb-2 text-primary font-semibold">
            <Info className="w-4 h-4" />
            <span>{L.pointsTitle}</span>
          </div>
          <ul className="text-sm text-muted-foreground list-disc ps-5 space-y-1">
            <li>{L.pointsLine1}</li>
            <li>{L.pointsLine2}</li>
            <li>{L.pointsLine3}</li>
          </ul>
        </div>
        <div className="max-w-5xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-6">
          {SUBJECTS.map((s) => {
            const SIcon = s.Icon;
            return (
              <div key={s.code} className="rounded-2xl border border-primary/40 bg-secondary/40 backdrop-blur p-4 hover:border-primary transition-all">
                <button onClick={() => setSubject(s.code)} className="w-full flex items-center gap-3 mb-3 text-left">
                  <SIcon className="w-6 h-6 text-primary" />
                  <div className="font-semibold text-lg flex-1">{language === "ar" ? s.ar : s.en}</div>
                  <span className="text-xs text-primary underline">{language === "ar" ? "ادخل" : "Enter"}</span>
                </button>
                <StudyRoom language={language} subject={s.code} currentUserId={userId} />
              </div>
            );
          })}
        </div>
      </main>
    );
  }

  const subj = SUBJECTS.find((s) => s.code === subject)!;

  return (
    <main className="relative min-h-screen px-4 py-10 md:py-16" dir={dir}>
      <button onClick={async () => { if (started) { await stopAndSave(); } setSubject(null); }} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground cursor-pointer">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">{language === "ar" ? subj.ar : subj.en}</h1>
          <p className="text-muted-foreground mt-1">{displayName}</p>
        </header>

        <StudyRoom language={language} subject={subject} currentUserId={userId} />

        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-5">
          <label className="block">
            <span className="text-sm text-muted-foreground flex items-center gap-2 mb-2"><Target className="w-4 h-4" /> {L.mission}</span>
            <Input value={mission} onChange={(e) => setMission(e.target.value)} placeholder={L.missionPh} disabled={started} maxLength={200} />
          </label>

          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => !started && setPomodoro((v) => !v)}
              disabled={started}
              className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm transition-all ${pomodoro ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-secondary/40 text-muted-foreground"} ${started ? "opacity-60 cursor-not-allowed" : "hover:border-primary/60"}`}
            >
              <Coffee className="w-4 h-4" />
              <span>{L.pomodoro}</span>
              <span className="text-xs opacity-80">· {pomodoro ? L.pomodoroOn : L.pomodoroOff}</span>
            </button>
          </div>

          {started && pomodoro && (
            <div className={`text-center text-sm font-semibold ${phase === "rest" ? "text-primary" : "text-muted-foreground"}`}>
              {phase === "rest"
                ? `${L.restPhase} — ${fmt(restRemaining)}`
                : L.workPhase}
            </div>
          )}

          <div className="text-center py-6">
            <div className="text-6xl md:text-7xl font-mono font-bold gradient-text">{fmt(seconds)}</div>
          </div>

          {started && (
            <label className="flex items-center gap-2 justify-center text-sm">
              <input type="checkbox" checked={completed} onChange={(e) => setCompleted(e.target.checked)} />
              <span>{L.completed}</span>
            </label>
          )}

          <div className="flex justify-center gap-3">
            {!started ? (
              <Button size="lg" onClick={startSession} className="gap-2"><Play className="w-4 h-4" /> {L.start}</Button>
            ) : (
              <>
                {running ? (
                  <Button size="lg" variant="secondary" onClick={() => setRunning(false)} className="gap-2"><Pause className="w-4 h-4" /> {L.pause}</Button>
                ) : (
                  <Button size="lg" onClick={() => setRunning(true)} className="gap-2"><Play className="w-4 h-4" /> {L.resume}</Button>
                )}
                <Button size="lg" variant="destructive" onClick={stopAndSave} className="gap-2"><Square className="w-4 h-4" /> {L.stop}</Button>
              </>
            )}
          </div>

          {started && (
            <div className="flex justify-center">
              <button
                onClick={async () => { await stopAndSave(); setSubject(null); }}
                className="text-xs text-primary underline underline-offset-4 hover:text-primary/80"
              >
                {L.switchRoom}
              </button>
            </div>
          )}
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur p-4 flex items-center gap-3 flex-wrap">
          <Music className="w-5 h-5 text-primary" />
          <div className="flex rounded-full border border-white/10 overflow-hidden text-xs">
            <button onClick={() => switchPlaylist("music")} className={`px-3 py-1 ${playlist === "music" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}>{language === "ar" ? "موسيقى" : "Music"}</button>
            <button onClick={() => switchPlaylist("quran")} className={`px-3 py-1 ${playlist === "quran" ? "bg-primary text-primary-foreground" : "bg-transparent text-muted-foreground"}`}>{language === "ar" ? "قرآن" : "Quran"}</button>
          </div>
          <span className="text-sm font-medium">{language === "ar" ? `موسيقى ${trackIdx + 1}/${TRACKS.length}` : `Track ${trackIdx + 1}/${TRACKS.length}`}</span>
          <Button size="sm" variant="secondary" onClick={toggleMusic} className="gap-2">
            {musicPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
          </Button>
          <Button size="sm" variant="ghost" onClick={nextTrack} className="gap-2"><SkipForward className="w-4 h-4" /></Button>
          <div className="flex items-center gap-2 ml-auto">
            {volume === 0 ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            <input type="range" min={0} max={1} step={0.05} value={volume}
              onChange={(e) => setVolume(parseFloat(e.target.value))} className="w-28" />
          </div>
          <audio ref={audioRef} src={TRACKS[trackIdx]} loop preload="none" />
        </div>

        <section className="mt-10">
          <h2 className="text-xl font-semibold flex items-center gap-2 mb-4"><Trophy className="w-5 h-5 text-primary" /> {L.leaderboard}</h2>
          {board.length === 0 ? (
            <p className="text-muted-foreground text-sm">{L.noOne}</p>
          ) : (
            <ol className="rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur divide-y divide-white/10 overflow-hidden">
              {board.map((r, i) => (
                <li key={i} className="flex items-center justify-between px-4 py-3">
                  <div className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${i < 3 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{i + 1}</span>
                    <span>{r.name}</span>
                  </div>
                  <span className="font-semibold text-primary">{r.points} {L.points}</span>
                </li>
              ))}
            </ol>
          )}
        </section>
      </div>
    </main>
  );
};

export default Sessions;