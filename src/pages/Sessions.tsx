import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Play, Pause, Square, Trophy, Timer, Target, Music, SkipForward, Volume2, VolumeX } from "lucide-react";
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

const TRACKS = [track1, track2, track3, track4, track5, track6];
const MAX_SECONDS = 48 * 3600;
const PERSIST_KEY = "study_session_state_v1";

const SUBJECTS = [
  { code: "islamic", en: "Islamic", ar: "التربية الإسلامية" },
  { code: "arabic", en: "Arabic", ar: "العربية" },
  { code: "english", en: "English", ar: "الإنجليزية" },
  { code: "french", en: "French", ar: "الفرنسية" },
  { code: "math", en: "Math", ar: "الرياضيات" },
  { code: "physics", en: "Physics", ar: "الفيزياء" },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء" },
  { code: "biology", en: "Biology", ar: "الأحياء" },
] as const;

const T = {
  en: {
    title: "Study Sessions", desc: "Pick a subject, set a mission, and earn points.",
    leaderboard: "Leaderboard", mission: "Mission for this session", missionPh: "e.g. Finish chapter 3 exercises",
    start: "Start", pause: "Pause", resume: "Resume", stop: "Stop & save",
    completed: "Mark mission completed", points: "pts", noOne: "No scores yet.",
    saved: "Session saved",
  },
  ar: {
    title: "جلسات الدراسة", desc: "اختر مادة وحدد مهمتك واكسب النقاط.",
    leaderboard: "لوحة المتصدرين", mission: "مهمة هذه الجلسة", missionPh: "مثلاً: إنهاء تمارين الفصل 3",
    start: "ابدأ", pause: "إيقاف مؤقت", resume: "متابعة", stop: "إيقاف وحفظ",
    completed: "تم إنجاز المهمة", points: "نقطة", noOne: "لا توجد نتائج بعد.",
    saved: "تم حفظ الجلسة",
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
  const intervalRef = useRef<number | null>(null);
  const [trackIdx, setTrackIdx] = useState(0);
  const [musicPlaying, setMusicPlaying] = useState(false);
  const [volume, setVolume] = useState(0.5);
  const audioRef = useRef<HTMLAudioElement | null>(null);

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
      intervalRef.current = window.setInterval(() => {
        setSeconds((s) => {
          const next = s + 1;
          if (next >= MAX_SECONDS) {
            setRunning(false);
            return MAX_SECONDS;
          }
          return next;
        });
      }, 1000);
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
      try {
        const raw = localStorage.getItem(PERSIST_KEY);
        if (!raw) return;
        const s = JSON.parse(raw);
        if (!s?.running || !s?.startedAt) return;
        const base = s.accumulated ?? 0;
        const extra = Math.floor((Date.now() - s.startedAt) / 1000);
        let total = base + extra;
        if (total >= MAX_SECONDS) { total = MAX_SECONDS; setRunning(false); }
        setSeconds(total);
      } catch {}
    };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", onVis);
    return () => {
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", onVis);
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
  };

  const stopAndSave = async () => {
    if (!userId || !subject) return;
    setRunning(false);
    const hours = seconds / 3600;
    const points = Math.floor(hours) + (completed ? 1 : 0);
    const { error } = await supabase.from("study_sessions").insert({
      user_id: userId, subject, mission: mission.trim(), duration_seconds: seconds,
      mission_completed: completed, points,
    });
    if (error) { toast.error(error.message); return; }
    toast.success(`${L.saved} (+${points} ${L.points})`);
    setStarted(false); setSeconds(0); setMission(""); setCompleted(false);
    localStorage.removeItem(PERSIST_KEY);
    loadBoard(subject);
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

  if (!subject) {
    return (
      <main className="min-h-screen px-4 py-10 md:py-16" dir={dir}>
        <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <header className="text-center max-w-2xl mx-auto mb-10">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">{L.title}</h1>
          <p className="text-muted-foreground">{L.desc}</p>
        </header>
        <div className="max-w-4xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-4">
          {SUBJECTS.map((s) => (
            <button key={s.code} onClick={() => setSubject(s.code)}
              className="rounded-2xl border border-primary/40 bg-secondary/40 backdrop-blur p-6 h-32 hover:-translate-y-1 hover:border-primary transition-all text-left">
              <Timer className="w-6 h-6 text-primary mb-3" />
              <div className="font-semibold text-lg">{language === "ar" ? s.ar : s.en}</div>
            </button>
          ))}
        </div>
      </main>
    );
  }

  const subj = SUBJECTS.find((s) => s.code === subject)!;

  return (
    <main className="min-h-screen px-4 py-10 md:py-16" dir={dir}>
      <button onClick={() => { if (running) return; setSubject(null); }} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground">
        <ArrowLeft className="w-5 h-5" />
      </button>
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-3xl md:text-4xl font-bold gradient-text">{language === "ar" ? subj.ar : subj.en}</h1>
          <p className="text-muted-foreground mt-1">{displayName}</p>
        </header>

        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8 space-y-5">
          <label className="block">
            <span className="text-sm text-muted-foreground flex items-center gap-2 mb-2"><Target className="w-4 h-4" /> {L.mission}</span>
            <Input value={mission} onChange={(e) => setMission(e.target.value)} placeholder={L.missionPh} disabled={started} maxLength={200} />
          </label>

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
        </div>

        <div className="mt-6 rounded-2xl border border-white/10 bg-secondary/30 backdrop-blur p-4 flex items-center gap-3 flex-wrap">
          <Music className="w-5 h-5 text-primary" />
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