import { useEffect, useRef, useState } from "react";
import confetti from "canvas-confetti";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import treeLottie from "@/assets/tree_growth.lottie?url";

const KEY = "streak_state_v1";
const FULL_DAYS = 20;

type StreakState = { days: number; lastDate: string; celebrated?: boolean };

// Use LOCAL date (not UTC) so the streak doesn't appear to reset at UTC midnight
// for users in other timezones.
const fmt = (d: Date) => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};
const today = () => fmt(new Date());
const yesterday = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return fmt(d);
};
const daysBetween = (a: string, b: string) => {
  const da = new Date(a + "T00:00:00");
  const db = new Date(b + "T00:00:00");
  return Math.round((db.getTime() - da.getTime()) / 86400000);
};

function useStreak() {
  const [state, setState] = useState<StreakState>(() => {
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) return JSON.parse(raw);
    } catch {}
    return { days: 0, lastDate: "", celebrated: false };
  });

  useEffect(() => {
    setState((prev) => {
      const t = today();
      if (prev.lastDate === t) return prev;
      let days: number;
      if (!prev.lastDate) {
        days = 1;
      } else {
        const diff = daysBetween(prev.lastDate, t);
        if (diff <= 0) {
          // Clock skew / timezone change — keep existing streak, just refresh date.
          days = Math.max(prev.days, 1);
        } else if (diff === 1) {
          days = prev.days + 1;
        } else {
          // Missed one or more days — streak broken.
          days = 1;
        }
      }
      const next = { days, lastDate: t, celebrated: prev.celebrated && days >= FULL_DAYS };
      localStorage.setItem(KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  const markCelebrated = () => {
    setState((p) => {
      const n = { ...p, celebrated: true };
      localStorage.setItem(KEY, JSON.stringify(n));
      return n;
    });
  };

  return { state, markCelebrated };
}

/* ----- Lottie tree growth ----- */
function LottieTree({ progress }: { progress: number }) {
  const [dotLottie, setDotLottie] = useState<DotLottie | null>(null);

  useEffect(() => {
    if (!dotLottie) return;
    let raf = 0;
    let cancelled = false;
    let currentFrame = 0;

    const run = () => {
      const total = dotLottie.totalFrames || 0;
      if (!total) return;
      const target = Math.max(0, Math.min(total - 1, Math.round(total * progress)));
      const startFrame = currentFrame;
      const growMs = 1600; // smooth grow-in tween
      const t0 = performance.now();

      try { dotLottie.pause(); } catch {}

      const tick = (now: number) => {
        if (cancelled) return;
        const elapsed = now - t0;
        const k = Math.min(1, elapsed / growMs);
        // easeOutCubic
        const eased = 1 - Math.pow(1 - k, 3);
        let f = startFrame + (target - startFrame) * eased;

        if (k >= 1) {
          // After growth: gentle apple sway by oscillating ±1.5 frames around target
          const sway = Math.sin((now - t0) / 600) * 1.5;
          f = target + sway;
        }

        const clamped = Math.max(0, Math.min(total - 1, f));
        try { dotLottie.setFrame(clamped); } catch {}
        currentFrame = clamped;
        raf = requestAnimationFrame(tick);
      };
      raf = requestAnimationFrame(tick);
    };

    if (dotLottie.isLoaded) run();
    else dotLottie.addEventListener("load", run);

    return () => {
      cancelled = true;
      if (raf) cancelAnimationFrame(raf);
      try { dotLottie.removeEventListener("load", run); } catch {}
    };
  }, [dotLottie, progress]);

  return (
    <DotLottieReact
      src={treeLottie}
      autoplay={false}
      loop={false}
      dotLottieRefCallback={setDotLottie}
      style={{ width: "100%", height: "100%" }}
    />
  );
}

const StreakTree = ({ language = "en" }: { language?: "en" | "ar" }) => {
  const { state, markCelebrated } = useStreak();
  const progress = Math.min(state.days / FULL_DAYS, 1);
  const pct = Math.round(progress * 100);

  const treeBoxRef = useRef<HTMLDivElement | null>(null);
  const prevAppleCountRef = useRef<number>(-1);
  const [popKey, setPopKey] = useState(0);

  // Sparkle + pop when a new apple appears (roughly one per streak day).
  useEffect(() => {
    const appleCount = state.days; // 1 apple per day, up to FULL_DAYS
    const prev = prevAppleCountRef.current;
    if (prev === -1) {
      prevAppleCountRef.current = appleCount;
      return;
    }
    if (appleCount > prev) {
      const bursts = appleCount - prev;
      const box = treeBoxRef.current?.getBoundingClientRect();
      for (let i = 0; i < bursts; i++) {
        setTimeout(() => {
          // Pop the tree slightly
          setPopKey((k) => k + 1);
          // Sparkle burst near a random spot in the canopy
          if (box) {
            const x = (box.left + box.width * (0.25 + Math.random() * 0.5)) / window.innerWidth;
            const y = (box.top + box.height * (0.2 + Math.random() * 0.4)) / window.innerHeight;
            confetti({
              particleCount: 18,
              spread: 60,
              startVelocity: 22,
              scalar: 0.7,
              ticks: 80,
              gravity: 0.6,
              origin: { x, y },
              colors: ["#FFD700", "#FFFFFF", "#FFE680", "#FFB347"],
              shapes: ["star", "circle"],
            });
          }
        }, i * 220);
      }
    }
    prevAppleCountRef.current = appleCount;
  }, [state.days]);

  useEffect(() => {
    if (state.days >= FULL_DAYS && !state.celebrated) {
      const end = Date.now() + 4000;
      const burst = () => {
        confetti({ particleCount: 80, spread: 80, origin: { y: 0.7 } });
        confetti({ particleCount: 60, spread: 100, angle: 60, origin: { x: 0, y: 0.8 } });
        confetti({ particleCount: 60, spread: 100, angle: 120, origin: { x: 1, y: 0.8 } });
        if (Date.now() < end) setTimeout(burst, 700);
      };
      burst();
      markCelebrated();
    }
  }, [state.days, state.celebrated, markCelebrated]);

  const T = language === "ar"
    ? { days: state.days === 1 ? "يوم" : "يوماً", label: "سلسلة المثابرة", full: "اكتملت الشجرة! 🎉" }
    : { days: state.days === 1 ? "day" : "days", label: "Your streak", full: "Tree fully grown! 🎉" };

  return (
    <section dir={language === "ar" ? "rtl" : "ltr"} className="w-full mt-12 mb-6">
      <div className="mx-auto max-w-md rounded-xl border border-border bg-card p-6">
        <div ref={treeBoxRef} className="relative h-72 rounded-lg overflow-hidden flex items-center justify-center">
          <div key={popKey} className="w-full h-full animate-apple-pop">
            <LottieTree progress={progress} />
          </div>
        </div>
        <div className="mt-4 text-center">
          <p className="text-xs uppercase tracking-wider text-muted-foreground">{T.label}</p>
          <p className="text-3xl font-semibold text-foreground mt-1">
            {state.days} <span className="text-base font-normal text-muted-foreground">{T.days}</span>
          </p>
          <div className="mt-4 h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <div
              className="h-full bg-foreground transition-all duration-700"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-2">
            {progress >= 1 ? T.full : `${pct}% · ${FULL_DAYS - state.days} ${language === "ar" ? "يوم متبقي" : "days to go"}`}
          </p>
        </div>
      </div>
    </section>
  );
};

export default StreakTree;
