import { useEffect, useState } from "react";
import confetti from "canvas-confetti";

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

/* Notion-style minimal 2D tree.
   progress 0..1 controls trunk height and number of leaf clusters revealed. */
function TreeSVG({ progress }: { progress: number }) {
  // Anchor at bottom center (x=150, y=300). Trunk grows upward.
  const trunkBaseY = 300;
  const trunkMaxH = 170;
  const trunkH = 30 + progress * trunkMaxH; // min 30 (sapling)
  const trunkTopY = trunkBaseY - trunkH;
  const trunkW = 8 + progress * 8;

  // Branches/leaves clusters appear progressively
  const clusters = [
    { cx: 150, cy: trunkTopY - 10, r: 28, threshold: 0.05 },
    { cx: 122, cy: trunkTopY + 12, r: 24, threshold: 0.20 },
    { cx: 178, cy: trunkTopY + 12, r: 24, threshold: 0.35 },
    { cx: 138, cy: trunkTopY - 32, r: 22, threshold: 0.50 },
    { cx: 168, cy: trunkTopY - 30, r: 22, threshold: 0.65 },
    { cx: 100, cy: trunkTopY - 6, r: 18, threshold: 0.80 },
    { cx: 200, cy: trunkTopY - 6, r: 18, threshold: 0.90 },
    { cx: 150, cy: trunkTopY - 56, r: 20, threshold: 1.0 },
  ];

  const leafFill = "hsl(var(--primary) / 0.15)";
  const leafStroke = "hsl(var(--primary))";

  return (
    <svg viewBox="0 0 300 320" className="w-full h-full">
      <defs>
        <filter id="leafGlow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      {/* Ground line — Notion divider style */}
      <line x1="20" y1="300" x2="280" y2="300" stroke="hsl(var(--border))" strokeWidth="1" />
      {/* Small pot/soil dots */}
      <circle cx="140" cy="305" r="1.5" fill="hsl(var(--muted-foreground))" />
      <circle cx="160" cy="307" r="1.5" fill="hsl(var(--muted-foreground))" />
      <circle cx="150" cy="310" r="1.5" fill="hsl(var(--muted-foreground))" />

      {/* Trunk */}
      <rect
        x={150 - trunkW / 2}
        y={trunkTopY}
        width={trunkW}
        height={trunkH}
        rx={trunkW / 2}
        fill="hsl(var(--foreground) / 0.85)"
        style={{ transition: "all 700ms ease" }}
      />

      {/* Leaf clusters — smoothly grow in with a soft bloom when unlocked */}
      {clusters.map((c, i) => {
        const visible = progress >= c.threshold;
        // How "fresh" is this unlock (0 = just unlocked, 1 = settled long ago)
        const overshoot = visible
          ? Math.min(1, (progress - c.threshold) / 0.08)
          : 0;
        const scale = visible ? 1 + (1 - overshoot) * 0.18 : 0;
        return (
          <g
            key={i}
            style={{
              transformOrigin: `${c.cx}px ${c.cy}px`,
              transformBox: "fill-box",
              transform: `scale(${scale})`,
              opacity: visible ? 1 : 0,
              transition:
                "transform 900ms cubic-bezier(.34,1.56,.64,1), opacity 600ms ease-out",
              transitionDelay: `${i * 80}ms`,
              filter: visible && overshoot < 1 ? "url(#leafGlow)" : undefined,
            }}
          >
            <circle
              cx={c.cx}
              cy={c.cy}
              r={c.r}
              fill={leafFill}
              stroke={leafStroke}
              strokeWidth="1.5"
            />
            {/* tiny inner highlight pops as it unlocks */}
            <circle
              cx={c.cx - c.r * 0.3}
              cy={c.cy - c.r * 0.3}
              r={c.r * 0.18}
              fill="hsl(var(--primary) / 0.35)"
            />
          </g>
        );
      })}

      {/* Sparkles when fully grown */}
      {progress >= 1 &&
        [...Array(5)].map((_, i) => {
          const x = 60 + i * 45;
          const y = 70 + (i % 2) * 20;
          return (
            <g key={i} transform={`translate(${x},${y})`}>
              <g style={{ animation: `streakSparkle 2.4s ease-in-out ${i * 0.25}s infinite`, transformOrigin: "center" }}>
                <path
                  d="M0,-6 L1.5,-1.5 L6,0 L1.5,1.5 L0,6 L-1.5,1.5 L-6,0 L-1.5,-1.5 Z"
                  fill="hsl(var(--primary))"
                />
              </g>
            </g>
          );
        })}
      <style>{`
        @keyframes streakSparkle {
          0%, 100% { opacity: 0.4; transform: scale(0.8); }
          50%      { opacity: 1;   transform: scale(1.2); }
        }
      `}</style>
    </svg>
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
        <div className="h-64">
          <TreeSVG progress={progress} />
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
