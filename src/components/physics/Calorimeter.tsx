import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  LineChart, Line, XAxis, YAxis, ReferenceLine, ResponsiveContainer,
  Tooltip as ReTooltip, Legend,
} from "recharts";
import { RotateCcw, Play, Flame, Droplet, Info, MoveHorizontal } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

// ---------- copy ----------
const copy = {
  en: {
    heading: "Coffee-Cup Calorimeter",
    sub: "Drag the glowing metal sample and drop it into the water. Watch heat flow from the hot metal into the water until both reach the same temperature. Everything obeys q_lost = q_gained.",
    metal: "Metal sample",
    ms: "Sample mass mₛ",
    ts: "Sample temperature Tₛ",
    mw: "Water mass m_w",
    tw: "Water temperature T_w",
    drop: "Drop the sample",
    reset: "Reset",
    dragHint: "Drag me into the cup",
    equilibrium: "Equilibrium Tᶠ",
    heatTransferred: "Heat transferred |q|",
    chartTitle: "Temperature vs. time  T(t) → T_f",
    time: "time (s)",
    tempAxis: "T (°C)",
    sampleLine: "Sample",
    waterLine: "Water",
    steps: [
      "1 · Insulated cup blocks heat loss to the surroundings.",
      "2 · Hot metal (mₛ, cₛ, Tₛ) is dropped into cold water (m_w, c_w, T_w).",
      "3 · Heat flows from metal to water: q_metal = −q_water.",
      "4 · mₛ·cₛ·(T_f − Tₛ) = −m_w·c_w·(T_f − T_w).",
      "5 · Solve for T_f = (mₛ·cₛ·Tₛ + m_w·c_w·T_w) / (mₛ·cₛ + m_w·c_w).",
    ],
    tips: {
      cup: "Insulated cup — approximated as adiabatic: no heat leaves the system.",
      water: "Water — the calorimetric fluid. c = 4.186 J/g·°C.",
      thermometer: "Thermometer — reads the water temperature in real time.",
      stirrer: "Stirrer — keeps the water at uniform temperature.",
      sample: "Hot metal sample — the heat source.",
    },
  },
  ar: {
    heading: "المسعر الحراري",
    sub: "اسحب قطعة المعدن المتوهجة وأسقطها في الماء. لاحظ انتقال الحرارة من المعدن إلى الماء حتى يتساويا في درجة الحرارة. كل شيء يخضع للعلاقة q_مفقود = q_مكتسب.",
    metal: "قطعة المعدن",
    ms: "كتلة العينة mₛ",
    ts: "درجة حرارة العينة Tₛ",
    mw: "كتلة الماء m_w",
    tw: "درجة حرارة الماء T_w",
    drop: "أسقط العينة",
    reset: "إعادة",
    dragHint: "اسحبني إلى الكوب",
    equilibrium: "درجة الاتزان Tᶠ",
    heatTransferred: "كمية الحرارة المنتقلة |q|",
    chartTitle: "درجة الحرارة بدلالة الزمن  T(t) → T_f",
    time: "الزمن (ث)",
    tempAxis: "T (°م)",
    sampleLine: "المعدن",
    waterLine: "الماء",
    steps: [
      "١ · الكوب معزول يمنع تسرّب الحرارة إلى الوسط الخارجي.",
      "٢ · نُسقط المعدن الحار (mₛ, cₛ, Tₛ) في ماء بارد (m_w, c_w, T_w).",
      "٣ · تنتقل الحرارة من المعدن إلى الماء: q_معدن = −q_ماء.",
      "٤ · mₛ·cₛ·(T_f − Tₛ) = −m_w·c_w·(T_f − T_w).",
      "٥ · نحلّ فتكون T_f = (mₛ·cₛ·Tₛ + m_w·c_w·T_w) / (mₛ·cₛ + m_w·c_w).",
    ],
    tips: {
      cup: "كوب معزول — نعتبره أدياباتيك: لا حرارة تخرج إلى الخارج.",
      water: "الماء — سائل التعادل الحراري. c = 4.186 جول/غ·°م.",
      thermometer: "الترمومتر — يقيس درجة حرارة الماء لحظياً.",
      stirrer: "خلاّط — يحافظ على تجانس درجة حرارة الماء.",
      sample: "قطعة المعدن الحارّة — مصدر الحرارة.",
    },
  },
} as const;

// ---------- physics ----------
type MetalKey = "Cu" | "Al" | "Fe" | "Pb";
const METALS: Record<MetalKey, { name: { en: string; ar: string }; c: number; color: string }> = {
  Cu: { name: { en: "Copper", ar: "نحاس" },   c: 0.385, color: "#f59e42" },
  Al: { name: { en: "Aluminum", ar: "ألمنيوم" }, c: 0.897, color: "#d4d4d8" },
  Fe: { name: { en: "Iron", ar: "حديد" },     c: 0.449, color: "#94a3b8" },
  Pb: { name: { en: "Lead", ar: "رصاص" },     c: 0.128, color: "#64748b" },
};
const C_WATER = 4.186; // J/g·°C

// map temperature to a color between cold-blue and hot-red
const tempToColor = (T: number) => {
  // clamp 0..300
  const t = Math.max(0, Math.min(300, T));
  if (t < 60) {
    // 0..60 → blue → cyan
    const f = t / 60;
    const r = Math.round(50 + f * 60);
    const g = Math.round(140 + f * 80);
    const b = Math.round(230 - f * 40);
    return `rgb(${r},${g},${b})`;
  }
  // 60..300 → orange → red
  const f = Math.min(1, (t - 60) / 240);
  const r = 240;
  const g = Math.round(160 - f * 130);
  const b = Math.round(60 - f * 60);
  return `rgb(${r},${g},${b})`;
};

// ---------- component ----------
const Calorimeter = ({ language }: { language: AppLanguage }) => {
  const isRTL = language === "ar";
  const t = copy[language];

  const [metal, setMetal] = useState<MetalKey>("Cu");
  const [ms, setMs] = useState(50);      // g
  const [Ts0, setTs0] = useState(200);   // °C
  const [mw, setMw] = useState(200);     // g
  const [Tw0, setTw0] = useState(20);    // °C

  // simulation state
  const [running, setRunning] = useState(false);
  const [inCup, setInCup] = useState(false); // is sample submerged
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);

  const cs = METALS[metal].c;
  const Tf = useMemo(
    () => (ms * cs * Ts0 + mw * C_WATER * Tw0) / (ms * cs + mw * C_WATER),
    [ms, cs, Ts0, mw, Tw0]
  );
  const qMagnitude = mw * C_WATER * (Tf - Tw0); // J
  const tau = 2.5; // seconds — visual time constant

  const Ts = inCup ? Tf + (Ts0 - Tf) * Math.exp(-elapsed / tau) : Ts0;
  const Tw = inCup ? Tf + (Tw0 - Tf) * Math.exp(-elapsed / tau) : Tw0;

  // rAF loop
  useEffect(() => {
    if (!running) return;
    const step = () => {
      const e = (performance.now() - startRef.current) / 1000;
      setElapsed(e);
      if (e > 5 * tau) {
        setRunning(false);
        return;
      }
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [running, tau]);

  const startSim = () => {
    setInCup(true);
    setElapsed(0);
    startRef.current = performance.now();
    setRunning(true);
  };

  const reset = () => {
    setRunning(false);
    setInCup(false);
    setElapsed(0);
  };

  // draggable sample handling
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const cupRectRef = useRef<HTMLDivElement>(null);
  const handleDragEnd = (_e: unknown, info: { point: { x: number; y: number } }) => {
    const cup = cupRectRef.current?.getBoundingClientRect();
    if (!cup) return;
    if (
      info.point.x >= cup.left &&
      info.point.x <= cup.right &&
      info.point.y >= cup.top &&
      info.point.y <= cup.bottom
    ) {
      startSim();
    }
  };

  // chart data
  const chartData = useMemo(() => {
    const points = 60;
    const tMax = 5 * tau;
    return Array.from({ length: points + 1 }, (_, i) => {
      const tt = (i / points) * tMax;
      return {
        t: +tt.toFixed(2),
        sample: +(Tf + (Ts0 - Tf) * Math.exp(-tt / tau)).toFixed(2),
        water: +(Tf + (Tw0 - Tf) * Math.exp(-tt / tau)).toFixed(2),
      };
    });
  }, [Ts0, Tw0, Tf, tau]);

  // thermometer mercury level (map -10..300 → 0..1)
  const thermoFrac = Math.max(0, Math.min(1, (Tw + 10) / 210));

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* LEFT: Scene + Chart */}
      <div className="space-y-4">
        <div
          ref={dragConstraintsRef}
          className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 h-[440px] md:h-[500px]"
        >
          {/* readouts */}
          <div className="absolute top-3 left-3 z-20 rounded-xl bg-black/60 backdrop-blur border border-white/10 px-3 py-2 text-xs text-white space-y-0.5 pointer-events-none">
            <div className="flex items-center gap-2">
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span className="uppercase tracking-widest text-white/60">{t.equilibrium}</span>
            </div>
            <div className="font-mono text-base font-semibold text-amber-300">
              {Tf.toFixed(2)} °C
            </div>
            <div className="text-white/70 flex items-center gap-1">
              <Droplet className="w-3 h-3 text-sky-400" />
              T_w = <span className="font-mono">{Tw.toFixed(1)}</span> °C
            </div>
            <div className="text-white/70">
              T_s = <span className="font-mono">{Ts.toFixed(1)}</span> °C
            </div>
            <div className="text-white/50">|q| = {(qMagnitude / 1000).toFixed(2)} kJ</div>
          </div>

          {/* Heat particles rising when active */}
          <AnimatePresence>
            {inCup && elapsed < 5 * tau && (
              <>
                {[0, 1, 2, 3, 4].map((i) => (
                  <motion.div
                    key={`heat-${i}`}
                    className="absolute w-2 h-2 rounded-full bg-orange-400/70 blur-sm pointer-events-none"
                    style={{ left: `${44 + i * 3}%`, top: "58%" }}
                    initial={{ opacity: 0, y: 0, scale: 0.5 }}
                    animate={{ opacity: [0, 1, 0], y: -140, scale: [0.5, 1.4, 0.8] }}
                    transition={{
                      duration: 2.2,
                      delay: i * 0.35,
                      repeat: Infinity,
                      ease: "easeOut",
                    }}
                  />
                ))}
              </>
            )}
          </AnimatePresence>

          {/* SVG calorimeter scene */}
          <svg viewBox="0 0 780 500" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="cupWall" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#e2e8f0" />
                <stop offset="50%" stopColor="#f8fafc" />
                <stop offset="100%" stopColor="#cbd5e1" />
              </linearGradient>
              <linearGradient id="innerCup" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="waterGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={tempToColor(Tw)} stopOpacity="0.85" />
                <stop offset="100%" stopColor={tempToColor(Tw)} stopOpacity="1" />
              </linearGradient>
              <linearGradient id="mercury" x1="0" y1="1" x2="0" y2="0">
                <stop offset="0%" stopColor="#dc2626" />
                <stop offset="100%" stopColor="#f87171" />
              </linearGradient>
              <radialGradient id="glow" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#fbbf24" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* Table shadow */}
            <ellipse cx="390" cy="470" rx="260" ry="14" fill="#000" opacity="0.35" />

            {/* OUTER insulated cup (trapezoid) */}
            <path
              d="M 230 150 L 550 150 L 520 440 L 260 440 Z"
              fill="url(#cupWall)"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* insulation hatching */}
            {Array.from({ length: 14 }).map((_, i) => (
              <line
                key={i}
                x1={240 + i * 22}
                y1={160}
                x2={235 + i * 22}
                y2={435}
                stroke="#94a3b8"
                strokeWidth="0.6"
                opacity="0.4"
              />
            ))}

            {/* INNER cup */}
            <path
              d="M 260 170 L 520 170 L 495 425 L 285 425 Z"
              fill="url(#innerCup)"
              stroke="#64748b"
              strokeWidth="1.5"
            />

            {/* Water (fills lower ~70% of inner cup) */}
            <path
              d="M 271 245 L 509 245 L 495 425 L 285 425 Z"
              fill="url(#waterGrad)"
              stroke="#0ea5e9"
              strokeWidth="1"
              opacity="0.92"
            />
            {/* water surface highlight */}
            <ellipse cx="390" cy="245" rx="119" ry="8" fill="#fff" opacity="0.25" />

            {/* Submerged sample */}
            <AnimatePresence>
              {inCup && (
                <motion.g
                  initial={{ y: -60, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ duration: 0.6, ease: "easeIn" }}
                >
                  <circle cx="390" cy="360" r="34" fill="url(#glow)" opacity={Math.max(0, (Ts - Tw) / 200)} />
                  <rect
                    x="368"
                    y="340"
                    width="44"
                    height="44"
                    rx="6"
                    fill={tempToColor(Ts)}
                    stroke="#0f172a"
                    strokeWidth="1.5"
                  />
                  <text x="390" y="368" textAnchor="middle" fill="#0f172a" fontSize="13" fontWeight="700">
                    {metal}
                  </text>
                </motion.g>
              )}
            </AnimatePresence>

            {/* Stirrer */}
            <g>
              <line x1="330" y1="120" x2="330" y2="330" stroke="#cbd5e1" strokeWidth="3" />
              <motion.circle
                cx="330"
                cy="330"
                r="8"
                fill="#e2e8f0"
                stroke="#64748b"
                animate={running ? { cx: [320, 340, 320] } : {}}
                transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }}
              />
              <circle cx="330" cy="118" r="10" fill="#475569" stroke="#0f172a" />
            </g>

            {/* Thermometer */}
            <g>
              {/* tube */}
              <rect x="440" y="70" width="16" height="270" rx="8" fill="#f8fafc" stroke="#64748b" strokeWidth="1.5" />
              {/* scale ticks */}
              {Array.from({ length: 11 }).map((_, i) => (
                <line
                  key={i}
                  x1={456}
                  y1={80 + i * 26}
                  x2={464}
                  y2={80 + i * 26}
                  stroke="#334155"
                  strokeWidth={i % 2 === 0 ? 1.4 : 0.8}
                />
              ))}
              {/* mercury column — grows upward with Tw */}
              <motion.rect
                x="446"
                y={330 - thermoFrac * 250}
                width="4"
                height={thermoFrac * 250}
                fill="url(#mercury)"
                initial={false}
                animate={{
                  y: 330 - thermoFrac * 250,
                  height: thermoFrac * 250,
                }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              />
              {/* bulb (in water) */}
              <circle cx="448" cy="335" r="12" fill="#dc2626" stroke="#7f1d1d" strokeWidth="1.5" />
              <text x="475" y="76" fill="#e2e8f0" fontSize="11">°C</text>
              <text x="475" y={334} fill="#f87171" fontSize="12" fontWeight="700">
                {Tw.toFixed(1)}
              </text>
            </g>

            {/* Lid */}
            <rect x="220" y="140" width="340" height="14" rx="4" fill="#475569" stroke="#1e293b" />
            <circle cx="330" cy="147" r="4" fill="#1e293b" />
            <circle cx="448" cy="147" r="4" fill="#1e293b" />

            {/* label */}
            <text x="390" y="465" textAnchor="middle" fill="#94a3b8" fontSize="11" letterSpacing="2">
              INSULATED CALORIMETER
            </text>
          </svg>

          {/* Cup drop-zone (invisible hit area for drag detection) */}
          <div
            ref={cupRectRef}
            className="absolute pointer-events-none"
            style={{ left: "30%", top: "35%", width: "40%", height: "45%" }}
          />

          {/* Draggable hot sample overlay (hidden once dropped in) */}
          {!inCup && (
            <motion.div
              drag
              dragConstraints={dragConstraintsRef}
              dragElastic={0.15}
              dragMomentum={false}
              onDragEnd={handleDragEnd}
              whileDrag={{ scale: 1.12, cursor: "grabbing" }}
              whileHover={{ scale: 1.05 }}
              className="absolute z-10 select-none touch-none"
              style={{ left: "8%", top: "58%", cursor: "grab" }}
            >
              <div className="relative">
                {/* pulsing glow */}
                <motion.div
                  className="absolute inset-0 rounded-lg blur-2xl"
                  style={{ background: tempToColor(Ts0) }}
                  animate={{ opacity: [0.5, 0.95, 0.5], scale: [1, 1.25, 1] }}
                  transition={{ duration: 1.8, repeat: Infinity }}
                />
                <div
                  className="relative w-14 h-14 rounded-lg flex items-center justify-center shadow-2xl border-2 border-black/40"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, ${tempToColor(Ts0)}, ${METALS[metal].color})`,
                    boxShadow: `0 0 24px ${tempToColor(Ts0)}`,
                  }}
                >
                  <span className="font-bold text-black/80 text-sm">{metal}</span>
                </div>
                <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] uppercase tracking-widest text-orange-300 font-semibold flex items-center gap-1">
                  <MoveHorizontal className="w-3 h-3" /> {t.dragHint}
                </div>
                <div className="absolute -bottom-5 left-1/2 -translate-x-1/2 whitespace-nowrap text-[10px] font-mono text-orange-200">
                  {Ts0.toFixed(0)}°C
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Chart */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
            {t.chartTitle}
          </p>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 6, right: 12, left: 0, bottom: 6 }}>
                <XAxis
                  dataKey="t"
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: t.time, position: "insideBottom", offset: -2, fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <YAxis
                  tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                  label={{ value: t.tempAxis, angle: -90, position: "insideLeft", fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                />
                <ReTooltip
                  contentStyle={{
                    background: "hsl(var(--popover))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <ReferenceLine y={Tf} stroke="#f59e0b" strokeDasharray="4 4" label={{ value: `T_f=${Tf.toFixed(1)}`, fontSize: 10, fill: "#f59e0b" }} />
                <Line type="monotone" dataKey="sample" name={t.sampleLine} stroke="#ef4444" strokeWidth={2} dot={false} isAnimationActive={false} />
                <Line type="monotone" dataKey="water"  name={t.waterLine}  stroke="#38bdf8" strokeWidth={2} dot={false} isAnimationActive={false} />
                {inCup && (
                  <ReferenceLine
                    x={+Math.min(elapsed, 5 * tau).toFixed(2)}
                    stroke="#a3a3a3"
                    strokeDasharray="3 3"
                  />
                )}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* RIGHT: Controls */}
      <aside className="space-y-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {t.metal}
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
            {(Object.keys(METALS) as MetalKey[]).map((k) => (
              <button
                key={k}
                onClick={() => { setMetal(k); reset(); }}
                className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                  metal === k
                    ? "bg-primary/15 border-primary text-primary"
                    : "border-border text-muted-foreground hover:border-primary/40"
                }`}
              >
                {METALS[k].name[language]} · c={METALS[k].c}
              </button>
            ))}
          </div>

          <MiniSlider label={t.ms} value={ms}  min={10}  max={200} step={5}   suffix=" g"  onChange={(v) => { setMs(v); reset(); }} />
          <MiniSlider label={t.ts} value={Ts0} min={40}  max={300} step={5}   suffix=" °C" onChange={(v) => { setTs0(v); reset(); }} />
          <MiniSlider label={t.mw} value={mw}  min={50}  max={500} step={10}  suffix=" g"  onChange={(v) => { setMw(v); reset(); }} />
          <MiniSlider label={t.tw} value={Tw0} min={0}   max={40}  step={1}   suffix=" °C" onChange={(v) => { setTw0(v); reset(); }} />

          <button
            onClick={() => (inCup ? reset() : startSim())}
            className="mt-3 w-full h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
          >
            {inCup ? <><RotateCcw className="w-4 h-4" /> {t.reset}</> : <><Play className="w-4 h-4" /> {t.drop}</>}
          </button>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {isRTL ? "المبدأ" : "Principle"}
            </p>
          </div>
          <ol className="space-y-2 text-xs text-foreground/85 leading-relaxed">
            {t.steps.map((s, i) => (
              <li key={i} className="rounded-md bg-secondary/40 border border-border/60 px-2.5 py-2">
                {s}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
};

// ---------- slider ----------
const MiniSlider = ({
  label, value, min, max, step, suffix, onChange,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string;
  onChange: (v: number) => void;
}) => (
  <label className="block mb-3">
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="font-mono text-foreground">
        {value}
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

export default Calorimeter;