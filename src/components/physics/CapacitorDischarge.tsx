import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip as ReTooltip,
} from "recharts";
import { RotateCcw, Zap, Info } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    heading: "Discharging a Capacitor",
    sub: "Flip switch K to position (2) to close the discharge loop. Watch the electrons flow, the galvanometer kick left, and the lamp flash then fade.",
    switchLabel: "Switch K",
    pos1: "Position 1 · Charge",
    pos2: "Position 2 · Discharge",
    reset: "Recharge & Reset",
    current: "Discharge current",
    voltage: "Capacitor voltage",
    resistance: "Loop resistance R",
    initialV: "Initial ΔV₀",
    chartTitle: "Discharge current  I(t) = (ΔV₀ / R) · e^(−t / RC)",
    time: "time (s)",
    steps: [
      "1 · At K→1 the battery charges C: plate A gains +Q, plate B gains −Q.",
      "2 · Flip K→2. The capacitor becomes the source; ΔV across C = ΔV₀.",
      "3 · Electrons rush from plate B through G and lamp L₂ to neutralize plate A.",
      "4 · Current spikes to I₀ = ΔV₀ / R, then decays exponentially with τ = RC.",
      "5 · The lamp glows brightest at t=0 and fades; G swings left then returns to zero.",
    ],
    tips: {
      battery: "Battery — provides ΔV₀ while K is at position 1.",
      switch: "Two-way switch K — click to toggle charge / discharge loops.",
      capacitor: "Capacitor C — stores charge Q = C·ΔV.",
      galvano: "Galvanometer G — center-zero, deflects with current direction.",
      lamp: "Lamp L₂ — brightness ∝ power = I²R.",
    },
  },
  ar: {
    heading: "تفريغ المكثف",
    sub: "حرّك المفتاح K إلى الوضع (2) لإغلاق دائرة التفريغ. لاحظ سريان الإلكترونات، انحراف الكلفانومتر إلى اليسار، ووميض المصباح ثم انطفاءه.",
    switchLabel: "المفتاح K",
    pos1: "الوضع 1 · شحن",
    pos2: "الوضع 2 · تفريغ",
    reset: "إعادة الشحن والتشغيل",
    current: "تيار التفريغ",
    voltage: "جهد المكثف",
    resistance: "مقاومة الدائرة R",
    initialV: "الجهد الابتدائي ΔV₀",
    chartTitle: "تيار التفريغ  I(t) = (ΔV₀ / R) · e^(−t / RC)",
    time: "الزمن (ث)",
    steps: [
      "1 · عند K→1 يشحن العمود المكثفَ: اللوح A يكتسب +Q واللوح B يكتسب −Q.",
      "2 · حرّك K→2. يصبح المكثف مصدرًا للجهد وΔV = ΔV₀.",
      "3 · تندفع الإلكترونات من B عبر G والمصباح L₂ لتعادل شحنة A.",
      "4 · التيار يقفز إلى I₀ = ΔV₀ / R ثم يتناقص أسّياً بثابت زمن τ = RC.",
      "5 · يضيء المصباح بأقصى شدّة عند t=0 ثم يخفت، ويرجع مؤشر G إلى الصفر.",
    ],
    tips: {
      battery: "العمود — يزوّد ΔV₀ عندما K في الوضع 1.",
      switch: "مفتاح ثنائي K — انقر لتبديل دائرتي الشحن والتفريغ.",
      capacitor: "المكثف C — يخزّن الشحنة Q = C·ΔV.",
      galvano: "كلفانومتر G — صفري الوسط، ينحرف حسب اتجاه التيار.",
      lamp: "المصباح L₂ — سطوعه يتناسب مع I²R.",
    },
  },
} as const;

type Mode = "charged" | "discharging";

const CapacitorDischarge = ({ language }: { language: AppLanguage }) => {
  const isRTL = language === "ar";
  const t = copy[language];

  const [mode, setMode] = useState<Mode>("charged");
  const [R, setR] = useState(4); // ohms
  const [V0, setV0] = useState(9); // volts
  const C = 0.25; // farads (visual)
  const tau = R * C;
  const I0 = V0 / R;

  const [t0, setT0] = useState<number | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>();

  // animation loop while discharging
  useEffect(() => {
    if (mode !== "discharging" || t0 === null) return;
    const step = () => {
      const now = performance.now();
      setElapsed((now - t0) / 1000);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [mode, t0]);

  const I = mode === "discharging" ? I0 * Math.exp(-elapsed / tau) : 0;
  const V = mode === "discharging" ? V0 * Math.exp(-elapsed / tau) : V0;
  const brightness =
    mode === "discharging"
      ? Math.min(1, (I * I * R) / (I0 * I0 * R)) // normalized power
      : 0;

  // Galvanometer needle: -60° full left, 0° center. Sharp kick then decay.
  const needleAngle =
    mode === "discharging" ? -60 * (I / I0) : 0;

  // Chart data: build once when config changes
  const chartData = useMemo(() => {
    const points = 80;
    const tMax = 5 * tau;
    return Array.from({ length: points + 1 }, (_, i) => {
      const tt = (i / points) * tMax;
      return { t: +tt.toFixed(3), I: +(I0 * Math.exp(-tt / tau)).toFixed(4) };
    });
  }, [I0, tau]);

  const toggleSwitch = () => {
    if (mode === "charged") {
      setMode("discharging");
      setElapsed(0);
      setT0(performance.now());
    } else {
      // back to charged
      setMode("charged");
      setT0(null);
      setElapsed(0);
    }
  };

  const reset = () => {
    setMode("charged");
    setT0(null);
    setElapsed(0);
  };

  // 5 electrons circulating on the discharge loop while active
  const electronDelays = [0, 0.2, 0.4, 0.6, 0.8];
  const loopDuration = Math.max(0.6, 1.4 + elapsed * 0.15); // slows as current dies

  return (
    <TooltipProvider delayDuration={150}>
      <div dir={isRTL ? "rtl" : "ltr"} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
        {/* Left: Circuit + Chart */}
        <div className="space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-slate-950 to-slate-900 p-4">
            <CircuitSVG
              mode={mode}
              needleAngle={needleAngle}
              brightness={brightness}
              onToggle={toggleSwitch}
              electronDelays={electronDelays}
              loopDuration={loopDuration}
              tips={t.tips}
            />
            {/* readouts */}
            <div className="absolute top-3 left-3 rounded-xl bg-black/60 backdrop-blur border border-white/10 px-3 py-2 text-xs text-white space-y-0.5">
              <div className="flex items-center gap-2">
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span className="uppercase tracking-widest text-white/60">
                  {t.current}
                </span>
              </div>
              <div className="font-mono text-base font-semibold text-amber-300">
                {I.toFixed(3)} A
              </div>
              <div className="text-white/70">
                ΔV: <span className="font-mono">{V.toFixed(2)} V</span>
              </div>
              <div className="text-white/50">τ = RC = {tau.toFixed(2)} s</div>
            </div>
          </div>

          {/* Chart */}
          <div className="rounded-2xl border border-border bg-card p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              {t.chartTitle}
            </p>
            <div className="h-52">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                  <XAxis
                    dataKey="t"
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: t.time, position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <YAxis
                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                    label={{ value: "I (A)", angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  />
                  <ReTooltip
                    contentStyle={{
                      background: "hsl(var(--popover))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: 8,
                      fontSize: 12,
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="I"
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    dot={false}
                    isAnimationActive={false}
                  />
                  {mode === "discharging" && (
                    <ReferenceLine
                      x={+Math.min(elapsed, 5 * tau).toFixed(3)}
                      stroke="#f59e0b"
                      strokeDasharray="3 3"
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

        {/* Right: Controls + Steps */}
        <aside className="space-y-4">
          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {t.switchLabel}
              </p>
              <button
                onClick={reset}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border bg-secondary/50 text-xs font-semibold hover:border-primary/40 transition-colors"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                {t.reset}
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2 mb-4">
              <button
                onClick={() => mode !== "charged" && toggleSwitch()}
                className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                  mode === "charged"
                    ? "bg-primary/15 border-primary text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {t.pos1}
              </button>
              <button
                onClick={() => mode !== "discharging" && toggleSwitch()}
                className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                  mode === "discharging"
                    ? "bg-amber-500/15 border-amber-500 text-amber-500"
                    : "border-border text-muted-foreground hover:border-amber-500/40"
                }`}
              >
                {t.pos2}
              </button>
            </div>

            <MiniSlider
              label={t.initialV}
              value={V0}
              min={1}
              max={20}
              step={0.5}
              suffix=" V"
              onChange={(v) => {
                setV0(v);
                reset();
              }}
            />
            <MiniSlider
              label={t.resistance}
              value={R}
              min={1}
              max={20}
              step={0.5}
              suffix=" Ω"
              onChange={(v) => {
                setR(v);
                reset();
              }}
            />
          </div>

          <div className="rounded-2xl border border-border bg-card p-4">
            <div className="flex items-center gap-2 mb-3">
              <Info className="w-4 h-4 text-primary" />
              <p className="text-xs uppercase tracking-widest text-muted-foreground">
                {isRTL ? "خطوات التفريغ" : "Discharge steps"}
              </p>
            </div>
            <ol className="space-y-2 text-xs text-foreground/85 leading-relaxed">
              {t.steps.map((s, i) => (
                <li
                  key={i}
                  className="rounded-md bg-secondary/40 border border-border/60 px-2.5 py-2"
                >
                  {s}
                </li>
              ))}
            </ol>
          </div>
        </aside>
      </div>
    </TooltipProvider>
  );
};

// ---------- Circuit SVG ----------

const CircuitSVG = ({
  mode,
  needleAngle,
  brightness,
  onToggle,
  electronDelays,
  loopDuration,
  tips,
}: {
  mode: Mode;
  needleAngle: number;
  brightness: number;
  onToggle: () => void;
  electronDelays: number[];
  loopDuration: number;
  tips: { battery: string; switch: string; capacitor: string; galvano: string; lamp: string };
}) => {
  // Discharge loop path: start at plate B (top-right of capacitor) → up → right → down through G & L2 → left back to plate A
  // Path coords chosen to match schematic below.
  const dischargePath =
    "M 430 130 L 430 70 L 700 70 L 700 260 L 430 260 L 430 200";

  return (
    <svg viewBox="0 0 780 340" className="w-full h-[360px] md:h-[420px]">
      <defs>
        <radialGradient id="lampGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#fde68a" stopOpacity="1" />
          <stop offset="60%" stopColor="#f59e0b" stopOpacity="0.6" />
          <stop offset="100%" stopColor="#f59e0b" stopOpacity="0" />
        </radialGradient>
        <linearGradient id="wire" x1="0" x2="1">
          <stop offset="0" stopColor="#94a3b8" />
          <stop offset="1" stopColor="#cbd5e1" />
        </linearGradient>
      </defs>

      {/* ---- CHARGE loop (left): battery -> K pos1 -> capacitor ---- */}
      {/* wire battery top -> switch pivot */}
      <path d="M 90 90 L 90 60 L 250 60" stroke="url(#wire)" strokeWidth="3" fill="none" />
      {/* switch pivot to plate A top (position 1) - highlighted when charged */}
      <path
        d="M 250 60 L 400 60 L 400 130"
        stroke={mode === "charged" ? "#fbbf24" : "#475569"}
        strokeWidth="3"
        fill="none"
        opacity={mode === "charged" ? 1 : 0.35}
      />
      {/* wire battery bottom -> plate B bottom */}
      <path
        d="M 90 220 L 90 280 L 400 280 L 400 200"
        stroke={mode === "charged" ? "#fbbf24" : "#475569"}
        strokeWidth="3"
        fill="none"
        opacity={mode === "charged" ? 1 : 0.35}
      />

      {/* Battery */}
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help">
            <rect x="60" y="90" width="60" height="130" rx="8" fill="#1e293b" stroke="#334155" />
            {/* cell plates */}
            <line x1="70" y1="120" x2="110" y2="120" stroke="#f59e0b" strokeWidth="4" />
            <line x1="80" y1="135" x2="100" y2="135" stroke="#f59e0b" strokeWidth="2" />
            <line x1="70" y1="160" x2="110" y2="160" stroke="#f59e0b" strokeWidth="4" />
            <line x1="80" y1="175" x2="100" y2="175" stroke="#f59e0b" strokeWidth="2" />
            <text x="90" y="245" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="600">
              Battery
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent side="right">{tips.battery}</TooltipContent>
      </Tooltip>

      {/* ---- Switch K (two-way) ---- */}
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-pointer" onClick={onToggle}>
            {/* pivot */}
            <circle cx="250" cy="60" r="5" fill="#e2e8f0" />
            {/* contact 1 (charge) */}
            <circle cx="290" cy="60" r="5" fill={mode === "charged" ? "#fbbf24" : "#475569"} />
            {/* contact 2 (discharge) - lower toward capacitor top */}
            <circle cx="290" cy="90" r="5" fill={mode === "discharging" ? "#f59e0b" : "#475569"} />
            {/* lever */}
            <motion.line
              x1="250"
              y1="60"
              stroke="#fbbf24"
              strokeWidth="4"
              strokeLinecap="round"
              animate={{
                x2: mode === "charged" ? 290 : 290,
                y2: mode === "charged" ? 60 : 90,
              }}
              transition={{ type: "spring", stiffness: 260, damping: 18 }}
            />
            <text x="250" y="40" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">
              K
            </text>
            <text x="298" y="55" fill="#64748b" fontSize="10">
              (1)
            </text>
            <text x="298" y="105" fill="#64748b" fontSize="10">
              (2)
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent side="top">{tips.switch}</TooltipContent>
      </Tooltip>

      {/* ---- Capacitor C in center ---- */}
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help">
            {/* plate A (top / left) */}
            <line x1="360" y1="130" x2="470" y2="130" stroke="#fbbf24" strokeWidth="5" />
            {/* plate B (bottom / right) */}
            <line x1="360" y1="200" x2="470" y2="200" stroke="#cbd5e1" strokeWidth="5" />
            {/* labels */}
            <text x="480" y="135" fill="#fbbf24" fontSize="12" fontWeight="700">
              A (+)
            </text>
            <text x="480" y="205" fill="#cbd5e1" fontSize="12" fontWeight="700">
              B (−)
            </text>
            <text x="345" y="170" textAnchor="end" fill="#e2e8f0" fontSize="14" fontWeight="700">
              C
            </text>
            {/* + and − markers */}
            <AnimatePresence>
              {[0, 1, 2, 3].map((i) => (
                <motion.text
                  key={`p-${i}`}
                  x={375 + i * 25}
                  y={124}
                  fill="#fbbf24"
                  fontSize="14"
                  fontWeight="700"
                  animate={{
                    opacity:
                      mode === "charged"
                        ? 1
                        : Math.max(0, 1 - (i + 1) * 0.05 * Math.min(20, needleAngle === 0 ? 20 : Math.abs(needleAngle) / 3)),
                  }}
                >
                  +
                </motion.text>
              ))}
              {[0, 1, 2, 3].map((i) => (
                <motion.text
                  key={`n-${i}`}
                  x={375 + i * 25}
                  y={215}
                  fill="#38bdf8"
                  fontSize="14"
                  fontWeight="700"
                  animate={{
                    opacity:
                      mode === "charged"
                        ? 1
                        : Math.max(0, 1 - (i + 1) * 0.05 * Math.min(20, needleAngle === 0 ? 20 : Math.abs(needleAngle) / 3)),
                  }}
                >
                  −
                </motion.text>
              ))}
            </AnimatePresence>
          </g>
        </TooltipTrigger>
        <TooltipContent side="bottom">{tips.capacitor}</TooltipContent>
      </Tooltip>

      {/* ---- Discharge loop wire (right side) ---- */}
      <path
        d={dischargePath}
        stroke={mode === "discharging" ? "#f59e0b" : "#475569"}
        strokeWidth="3"
        fill="none"
        opacity={mode === "discharging" ? 1 : 0.35}
      />

      {/* Electrons animating along the discharge path */}
      {mode === "discharging" &&
        electronDelays.map((d, i) => (
          <g key={i}>
            <circle r="5" fill="#38bdf8">
              <animateMotion
                dur={`${loopDuration}s`}
                repeatCount="indefinite"
                begin={`${d}s`}
                path={dischargePath}
              />
            </circle>
          </g>
        ))}

      {/* ---- Galvanometer G on top segment of discharge loop ---- */}
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help" transform="translate(565, 70)">
            <circle r="28" fill="#0f172a" stroke="#334155" strokeWidth="2" />
            <circle r="24" fill="#f8fafc" />
            {/* scale marks */}
            {[-60, -30, 0, 30, 60].map((a) => (
              <line
                key={a}
                x1="0"
                y1="-20"
                x2="0"
                y2={a === 0 ? "-14" : "-16"}
                stroke="#0f172a"
                strokeWidth={a === 0 ? 2 : 1}
                transform={`rotate(${a})`}
              />
            ))}
            {/* needle */}
            <motion.line
              x1="0"
              y1="0"
              x2="0"
              y2="-18"
              stroke="#ef4444"
              strokeWidth="2.5"
              strokeLinecap="round"
              animate={{ rotate: needleAngle }}
              transition={{ type: "spring", stiffness: 180, damping: 14 }}
            />
            <circle r="3" fill="#1e293b" />
            <text y="14" textAnchor="middle" fill="#0f172a" fontSize="10" fontWeight="700">
              G
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent side="top">{tips.galvano}</TooltipContent>
      </Tooltip>

      {/* ---- Lamp L2 on right side of discharge loop ---- */}
      <Tooltip>
        <TooltipTrigger asChild>
          <g className="cursor-help" transform="translate(700, 165)">
            {/* glow */}
            <motion.circle
              r="42"
              fill="url(#lampGlow)"
              animate={{ opacity: brightness }}
              transition={{ duration: 0.15 }}
            />
            <circle r="18" fill="#1e293b" stroke="#334155" strokeWidth="2" />
            <motion.circle
              r="14"
              animate={{
                fill:
                  brightness > 0.02
                    ? `rgba(253, 224, 71, ${0.35 + brightness * 0.65})`
                    : "#334155",
              }}
              transition={{ duration: 0.1 }}
            />
            {/* filament */}
            <path
              d="M -6 -2 Q -3 4 0 -2 T 6 -2"
              stroke="#f59e0b"
              strokeWidth="1.5"
              fill="none"
              opacity={0.6 + brightness * 0.4}
            />
            <text y="38" textAnchor="middle" fill="#e2e8f0" fontSize="12" fontWeight="700">
              L₂
            </text>
          </g>
        </TooltipTrigger>
        <TooltipContent side="left">{tips.lamp}</TooltipContent>
      </Tooltip>

      {/* Mode banner */}
      <text x="390" y="322" textAnchor="middle" fill="#94a3b8" fontSize="12">
        {mode === "charged" ? "K = 1  ·  charging loop active" : "K = 2  ·  discharge loop active"}
      </text>
    </svg>
  );
};

// ---------- MiniSlider ----------

const MiniSlider = ({
  label,
  value,
  min,
  max,
  step,
  onChange,
  suffix,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
  suffix?: string;
}) => (
  <label className="block mb-3 last:mb-0">
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="font-mono text-foreground">
        {value.toFixed(step < 1 ? 1 : 0)}
        {suffix ?? ""}
      </span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(parseFloat(e.target.value))}
      className="w-full accent-primary"
    />
  </label>
);

export default CapacitorDischarge;