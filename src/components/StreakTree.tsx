import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { DotLottieReact, type DotLottie } from "@lottiefiles/dotlottie-react";
import treeLottie from "@/assets/tree_growth.lottie?url";

const KEY = "streak_state_v1";
const FULL_DAYS = 20;

type StreakState = { days: number; lastDate: string; celebrated?: boolean };

const today = () => new Date().toISOString().slice(0, 10);
const yesterday = () => {
  const d = new Date(); d.setDate(d.getDate() - 1); return d.toISOString().slice(0, 10);
};

const FORCE_FULL_KEY = "streak_force_full_v1";

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
      // One-time override: force streak to 100%
      if (localStorage.getItem(FORCE_FULL_KEY) !== "1") {
        const next = { days: FULL_DAYS, lastDate: today(), celebrated: false };
        localStorage.setItem(KEY, JSON.stringify(next));
        localStorage.setItem(FORCE_FULL_KEY, "1");
        return next;
      }
      const t = today();
      if (prev.lastDate === t) return prev;
      let days = 1;
      if (prev.lastDate === yesterday()) days = prev.days + 1;
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
    const apply = () => {
      const total = dotLottie.totalFrames || 0;
      if (!total) return;
      const frame = Math.max(0, Math.min(total - 1, Math.round(total * progress)));
      try {
        dotLottie.pause();
        dotLottie.setFrame(frame);
      } catch {}
    };
    if (dotLottie.isLoaded) apply();
    else dotLottie.addEventListener("load", apply);
    return () => {
      try { dotLottie.removeEventListener("load", apply); } catch {}
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
        <div className="h-72 rounded-lg overflow-hidden flex items-center justify-center">
          <LottieTree progress={progress} />
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
