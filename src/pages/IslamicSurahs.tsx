import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Play, Pause, SkipBack, Volume2 } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import audioAsset from "@/assets/surah-al-imran-90-94.mp3.asset.json";

type Line = { t: number; ar: string };

// Replace these timestamps and text to re-sync with a different recitation.
const LINES: Line[] = [
  { t: 0,    ar: "إِنَّ الَّذِينَ كَفَرُوا بَعْدَ إِيمَانِهِمْ ثُمَّ ازْدَادُوا كُفْرًا" },
  { t: 10,   ar: "لَّن تُقْبَلَ تَوْبَتُهُمْ وَأُولَٰئِكَ هُمُ الضَّالُّونَ" },
  { t: 21,   ar: "إِنَّ الَّذِينَ كَفَرُوا وَمَاتُوا وَهُمْ كُفَّارٌ" },
  { t: 31,   ar: "فَلَن يُقْبَلَ مِنْ أَحَدِهِم مِّلْءُ الْأَرْضِ ذَهَبًا وَلَوِ افْتَدَىٰ بِهِ" },
  { t: 44,   ar: "أُولَٰئِكَ لَهُمْ عَذَابٌ أَلِيمٌ وَمَا لَهُم مِّن نَّاصِرِينَ" },
  { t: 59,   ar: "لَن تَنَالُوا الْبِرَّ حَتَّىٰ تُنفِقُوا مِمَّا تُحِبُّونَ" },
  { t: 71,   ar: "وَمَا تُنفِقُوا مِن شَيْءٍ فَإِنَّ اللَّهَ بِهِ عَلِيمٌ" },
  { t: 84,   ar: "كُلُّ الطَّعَامِ كَانَ حِلًّا لِّبَنِي إِسْرَائِيلَ" },
  { t: 94,   ar: "إِلَّا مَا حَرَّمَ إِسْرَائِيلُ عَلَىٰ نَفْسِهِ مِن قَبْلِ أَن تُنَزَّلَ التَّوْرَاةُ" },
  { t: 109,  ar: "قُلْ فَأْتُوا بِالتَّوْرَاةِ فَاتْلُوهَا إِن كُنتُمْ صَادِقِينَ" },
  { t: 124,  ar: "فَمَنِ افْتَرَىٰ عَلَى اللَّهِ الْكَذِبَ مِن بَعْدِ ذَٰلِكَ" },
  { t: 134,  ar: "فَأُولَٰئِكَ هُمُ الظَّالِمُونَ" },
  { t: 141,  ar: "قُلْ صَدَقَ اللَّهُ ۗ فَاتَّبِعُوا مِلَّةَ إِبْرَاهِيمَ حَنِيفًا" },
  { t: 154,  ar: "وَمَا كَانَ مِنَ الْمُشْرِكِينَ" },
];

const AUDIO_URL = audioAsset.url;

const fmt = (s: number) => {
  if (!isFinite(s)) return "0:00";
  const m = Math.floor(s / 60);
  const r = Math.floor(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
};

const IslamicSurahs = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const lineRefs = useRef<Array<HTMLLIElement | null>>([]);
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);

  const activeIdx = (() => {
    let i = -1;
    for (let k = 0; k < LINES.length; k++) {
      if (time >= LINES[k].t) i = k;
      else break;
    }
    return i;
  })();

  useEffect(() => {
    if (activeIdx < 0) return;
    const el = lineRefs.current[activeIdx];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIdx]);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) a.play();
    else a.pause();
  };

  const restart = () => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = 0;
    a.play();
  };

  const seek = (val: number) => {
    const a = audioRef.current;
    if (!a) return;
    a.currentTime = val;
    setTime(val);
  };

  const jumpToLine = (t: number) => seek(t);

  const dir = "rtl";
  const title = language === "ar" ? "سور إسلامية" : "Islamic Surahs";
  const subtitle = language === "ar"
    ? "سورة آل عمران · الآيات 90 - 94"
    : "Surah Al-Imran · Verses 90 – 94";

  return (
    <main className="min-h-screen px-4 py-10 md:py-16 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        {language === "ar" ? <ArrowRight className="w-4 h-4" /> : <ArrowLeft className="w-4 h-4" />}
        <span className="hidden sm:inline">{language === "ar" ? "رجوع" : "Back"}</span>
      </button>

      <div className="max-w-3xl mx-auto relative z-10">
        <header className="text-center mb-8 animate-fade-up">
          <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">{title}</p>
          <h1 className="text-3xl md:text-5xl font-bold gradient-text" style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}>
            {subtitle}
          </h1>
        </header>

        <div className="rounded-3xl border border-border bg-card/85 backdrop-blur-xl shadow-[0_24px_60px_-20px_hsl(var(--primary)/0.35)] overflow-hidden">
          {/* Player */}
          <div className="p-6 md:p-8 border-b border-border" dir="ltr">
            <audio
              ref={audioRef}
              src={AUDIO_URL}
              preload="metadata"
              onPlay={() => setPlaying(true)}
              onPause={() => setPlaying(false)}
              onTimeUpdate={(e) => setTime(e.currentTarget.currentTime)}
              onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
              onEnded={() => setPlaying(false)}
            />

            <div className="flex items-center gap-4">
              <button
                onClick={restart}
                aria-label="Restart"
                className="w-11 h-11 rounded-full border border-border bg-secondary/50 flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                onClick={toggle}
                aria-label={playing ? "Pause" : "Play"}
                className="w-14 h-14 rounded-full bg-primary text-primary-foreground shadow-[0_10px_30px_-8px_hsl(var(--primary)/0.6)] flex items-center justify-center hover:scale-105 active:scale-95 transition"
              >
                {playing ? <Pause className="w-6 h-6" /> : <Play className="w-6 h-6 translate-x-0.5" />}
              </button>

              <div className="flex-1 flex items-center gap-3">
                <span className="text-xs font-mono text-muted-foreground w-10 text-right">{fmt(time)}</span>
                <input
                  type="range"
                  min={0}
                  max={duration || 0}
                  step={0.01}
                  value={time}
                  onChange={(e) => seek(parseFloat(e.target.value))}
                  className="flex-1 h-1.5 rounded-full appearance-none bg-secondary accent-primary cursor-pointer"
                  style={{
                    background: `linear-gradient(to right, hsl(var(--primary)) 0%, hsl(var(--primary)) ${(time / (duration || 1)) * 100}%, hsl(var(--secondary)) ${(time / (duration || 1)) * 100}%, hsl(var(--secondary)) 100%)`,
                  }}
                />
                <span className="text-xs font-mono text-muted-foreground w-10">{fmt(duration)}</span>
              </div>

              <div className="hidden sm:flex items-center gap-2 w-32">
                <Volume2 className="w-4 h-4 text-muted-foreground" />
                <input
                  type="range"
                  min={0}
                  max={1}
                  step={0.01}
                  value={volume}
                  onChange={(e) => {
                    const v = parseFloat(e.target.value);
                    setVolume(v);
                    if (audioRef.current) audioRef.current.volume = v;
                  }}
                  className="flex-1 h-1 accent-primary cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Lyrics */}
          <div className="relative">
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-card to-transparent z-10"
            />
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-card to-transparent z-10"
            />
            <ol
              dir="rtl"
              className="h-[26rem] overflow-y-auto px-6 md:px-10 py-12 space-y-5 scroll-smooth"
              style={{ fontFamily: "'Amiri', 'Scheherazade New', serif" }}
            >
              {LINES.map((line, i) => {
                const isActive = i === activeIdx;
                const isPast = i < activeIdx;
                return (
                  <li
                    key={i}
                    ref={(el) => { lineRefs.current[i] = el; }}
                    onClick={() => jumpToLine(line.t)}
                    className={`text-center cursor-pointer transition-all duration-500 leading-loose select-none ${
                      isActive
                        ? "text-primary font-bold text-2xl md:text-3xl scale-[1.04]"
                        : isPast
                          ? "text-muted-foreground/50 text-lg md:text-xl"
                          : "text-foreground/70 text-lg md:text-xl hover:text-foreground"
                    }`}
                  >
                    {line.ar}
                  </li>
                );
              })}
            </ol>
          </div>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {language === "ar" ? "اضغط على أي آية للانتقال إليها مباشرة" : "Tap any verse to jump to it"}
        </p>
      </div>
    </main>
  );
};

export default IslamicSurahs;