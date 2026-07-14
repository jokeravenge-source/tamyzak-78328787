import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Power, Info, Zap, Beaker, Circle } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

// ---------- copy ----------
const copy = {
  en: {
    heading: "Daniell Cell",
    tagline: "Electrochemistry · Redox in Motion",
    sub: "Zinc dissolves at the anode, copper deposits at the cathode, and the salt bridge keeps both half-cells electrically neutral.",
    switchLabel: "Circuit switch",
    on: "CLOSED",
    off: "OPEN",
    reset: "Reset",
    emf: "EMF",
    zincConc: "[Zn²⁺]",
    copperConc: "[Cu²⁺]",
    voltage: "Cell voltage",
    zincMass: "Zn electrode",
    copperMass: "Cu electrode",
    anode: "ANODE  (−)",
    cathode: "CATHODE  (+)",
    saltBridge: "Salt bridge · KCl",
    scene: "SCENE 01",
    live: "LIVE SIMULATION",
    steps: [
      "01 · Zn is more active than Cu — it releases electrons more readily.",
      "02 · Anode (Zn): Zn → Zn²⁺ + 2e⁻",
      "03 · Electrons drift through the external wire from Zn → Cu.",
      "04 · Cathode (Cu): Cu²⁺ + 2e⁻ → Cu",
      "05 · Salt bridge (KCl) keeps both half-cells neutral.",
      "06 · E°cell = E°(Cu²⁺/Cu) − E°(Zn²⁺/Zn) = +0.34 − (−0.76) = 1.10 V.",
    ],
    nernst: "E = 1.10 − (0.0592/2) · log ( [Zn²⁺] / [Cu²⁺] )",
  },
  ar: {
    heading: "خلية دانييل",
    tagline: "الكيمياء الكهربائية · الأكسدة والاختزال",
    sub: "الخارصين يذوب في المصعد، والنحاس يترسّب على المهبط، والقنطرة الملحية تحافظ على التعادل الكهربائي.",
    switchLabel: "مفتاح الدائرة",
    on: "مغلقة",
    off: "مفتوحة",
    reset: "إعادة",
    emf: "القوة الدافعة",
    zincConc: "[Zn²⁺]",
    copperConc: "[Cu²⁺]",
    voltage: "جهد الخلية",
    zincMass: "قطب الخارصين",
    copperMass: "قطب النحاس",
    anode: "المصعد  (−)",
    cathode: "المهبط  (+)",
    saltBridge: "قنطرة ملحية · KCl",
    scene: "المشهد ٠١",
    live: "محاكاة مباشرة",
    steps: [
      "٠١ · الخارصين أنشط من النحاس فهو يفقد الإلكترونات أسهل.",
      "٠٢ · المصعد (Zn): Zn → Zn²⁺ + 2e⁻",
      "٠٣ · تنتقل الإلكترونات في السلك من Zn إلى Cu.",
      "٠٤ · المهبط (Cu): Cu²⁺ + 2e⁻ → Cu",
      "٠٥ · القنطرة الملحية تحافظ على تعادل الكأسين.",
      "٠٦ · E°خلية = +0.34 − (−0.76) = 1.10 فولت.",
    ],
    nernst: "E = 1.10 − (0.0592/2) · log ( [Zn²⁺] / [Cu²⁺] )",
  },
} as const;

// ---------- component ----------
const DaniellCell = ({ language }: { language: AppLanguage }) => {
  const isRTL = language === "ar";
  const t = copy[language];

  const [closed, setClosed] = useState(false);
  const [znC, setZnC] = useState(1.0);
  const [cuC, setCuC] = useState(1.0);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);

  const E0 = 1.10;
  const emf = E0 - (0.0592 / 2) * Math.log10(znC / cuC);

  useEffect(() => {
    if (!closed) return;
    startRef.current = performance.now() - elapsed * 1000;
    const step = () => {
      const e = (performance.now() - startRef.current) / 1000;
      setElapsed(e);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [closed]);

  const reactionExtent = Math.min(1, (elapsed * emf) / 40);
  const znDelta = reactionExtent * 40;
  const cuDelta = reactionExtent * 40;

  const reset = () => { setClosed(false); setElapsed(0); };

  const electronDur = Math.max(1.0, 3.0 - emf * 1.2);

  // Voltmeter needle: 0..2V → -60°..+60°
  const needleAngle = Math.max(-60, Math.min(60, (emf / 2) * 120 - 60));

  // fake HH:MM:SS timer running when closed
  const timeCode = useMemo(() => {
    const s = Math.floor(elapsed);
    const mm = String(Math.floor(s / 60)).padStart(2, "0");
    const ss = String(s % 60).padStart(2, "0");
    const cs = String(Math.floor((elapsed - s) * 100)).padStart(2, "0");
    return `${mm}:${ss}:${cs}`;
  }, [elapsed]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* ============ LEFT: cinematic stage ============ */}
      <div className="space-y-4">
        <div
          className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl"
          style={{
            background:
              "radial-gradient(ellipse at 30% 20%, #1a2a4a 0%, #0b1224 45%, #050912 100%)",
          }}
        >
          {/* Top chrome bar — like a video HUD */}
          <div className="absolute top-0 inset-x-0 z-30 flex items-center justify-between px-4 py-2.5 border-b border-white/5 bg-black/40 backdrop-blur-md">
            <div className="flex items-center gap-2.5">
              <div className="flex gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400/80" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/80" />
              </div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/50 font-semibold">
                {t.scene} — {t.heading}
              </span>
            </div>
            <div className="flex items-center gap-3">
              {closed && (
                <motion.div
                  className="flex items-center gap-1.5"
                  animate={{ opacity: [1, 0.3, 1] }}
                  transition={{ duration: 1.6, repeat: Infinity }}
                >
                  <Circle className="w-2 h-2 fill-red-500 text-red-500" />
                  <span className="text-[10px] tracking-[0.25em] text-red-400 font-bold">
                    REC
                  </span>
                </motion.div>
              )}
              <span className="text-[10px] font-mono text-white/60 tabular-nums">
                {timeCode}
              </span>
            </div>
          </div>

          {/* Faint dot grid overlay */}
          <div
            className="absolute inset-0 opacity-[0.08] pointer-events-none"
            style={{
              backgroundImage:
                "radial-gradient(circle, #ffffff 1px, transparent 1px)",
              backgroundSize: "22px 22px",
            }}
          />
          {/* soft vignette */}
          <div
            className="absolute inset-0 pointer-events-none"
            style={{
              background:
                "radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%)",
            }}
          />

          {/* Halo behind beakers */}
          <div className="absolute left-[10%] top-[35%] w-72 h-72 rounded-full bg-sky-500/15 blur-3xl pointer-events-none" />
          <div className="absolute right-[10%] top-[35%] w-72 h-72 rounded-full bg-blue-600/15 blur-3xl pointer-events-none" />
          <div className="absolute left-1/2 top-[8%] -translate-x-1/2 w-64 h-24 rounded-full bg-amber-400/15 blur-3xl pointer-events-none" />

          {/* Big EMF readout — top-left overlay */}
          <div className="absolute top-14 left-4 z-20 pointer-events-none">
            <div
              className="rounded-2xl px-4 py-3 border border-amber-400/30 backdrop-blur-md"
              style={{ background: "rgba(15,23,42,0.55)" }}
            >
              <div className="flex items-center gap-1.5 mb-0.5">
                <Zap className="w-3 h-3 text-amber-300" />
                <span className="text-[9px] uppercase tracking-[0.35em] text-amber-300/80 font-bold">
                  {t.emf}
                </span>
              </div>
              <div
                className="font-mono text-3xl font-black text-amber-300 leading-none tabular-nums"
                style={{ textShadow: "0 0 20px rgba(251,191,36,0.5)" }}
              >
                {emf.toFixed(3)}
              </div>
              <div className="text-[10px] text-white/50 font-mono mt-0.5">volts · E° = 1.10</div>
            </div>
          </div>

          {/* Live badge */}
          <div className="absolute top-14 right-4 z-20 pointer-events-none">
            <div className="rounded-full px-3 py-1.5 border border-white/10 backdrop-blur-md bg-black/40 flex items-center gap-2">
              <motion.span
                className="w-1.5 h-1.5 rounded-full bg-emerald-400"
                animate={{ opacity: [0.3, 1, 0.3] }}
                transition={{ duration: 1.4, repeat: Infinity }}
              />
              <span className="text-[9px] uppercase tracking-[0.3em] text-white/70 font-bold">
                {t.live}
              </span>
            </div>
          </div>

          {/* ============ Main SVG stage ============ */}
          <svg viewBox="0 0 800 540" className="relative w-full h-full block" style={{ minHeight: 520 }}>
            <defs>
              {/* glass */}
              <linearGradient id="glass" x1="0" x2="1">
                <stop offset="0%" stopColor="#ffffff" stopOpacity="0.08" />
                <stop offset="50%" stopColor="#ffffff" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#ffffff" stopOpacity="0.05" />
              </linearGradient>
              {/* solutions */}
              <linearGradient id="znSol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#7dd3fc" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#0369a1" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="cuSol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#1d4ed8" stopOpacity="0.95" />
              </linearGradient>
              {/* metals */}
              <linearGradient id="znMetal" x1="0" x2="1">
                <stop offset="0%" stopColor="#64748b" />
                <stop offset="50%" stopColor="#f1f5f9" />
                <stop offset="100%" stopColor="#475569" />
              </linearGradient>
              <linearGradient id="cuMetal" x1="0" x2="1">
                <stop offset="0%" stopColor="#7c2d12" />
                <stop offset="45%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#7c2d12" />
              </linearGradient>
              {/* wire (neon) */}
              <linearGradient id="wire" x1="0" x2="1">
                <stop offset="0%" stopColor="#f59e0b" />
                <stop offset="50%" stopColor="#fde68a" />
                <stop offset="100%" stopColor="#f59e0b" />
              </linearGradient>
              {/* salt bridge */}
              <linearGradient id="bridge" x1="0" x2="1">
                <stop offset="0%" stopColor="#84cc16" stopOpacity="0.7" />
                <stop offset="50%" stopColor="#bef264" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#84cc16" stopOpacity="0.7" />
              </linearGradient>
              {/* glow filters */}
              <filter id="soft" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <filter id="strong" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
              <radialGradient id="ionGlowBlue" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#38bdf8" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="ionGlowCu" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stopColor="#f97316" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#f97316" stopOpacity="0" />
              </radialGradient>
            </defs>

            {/* baseline / stage floor */}
            <line x1="80" y1="480" x2="720" y2="480" stroke="#ffffff" strokeOpacity="0.08" strokeWidth="1" strokeDasharray="4 6" />
            <ellipse cx="200" cy="480" rx="130" ry="8" fill="#000" opacity="0.5" />
            <ellipse cx="600" cy="480" rx="130" ry="8" fill="#000" opacity="0.5" />

            {/* ============ Analog voltmeter (center, top) ============ */}
            <g transform="translate(400,110)">
              {/* glow */}
              <circle r="62" fill="#fbbf24" opacity="0.08" filter="url(#strong)" />
              {/* housing */}
              <circle r="52" fill="#0f172a" stroke="#fbbf24" strokeOpacity="0.5" strokeWidth="1.5" />
              <circle r="48" fill="#1e293b" stroke="#334155" strokeWidth="1" />
              {/* dial ticks */}
              {Array.from({ length: 11 }).map((_, i) => {
                const a = (-60 + i * 12) * (Math.PI / 180);
                const r1 = i % 2 === 0 ? 34 : 38;
                const r2 = 42;
                return (
                  <line
                    key={i}
                    x1={Math.sin(a) * r1}
                    y1={-Math.cos(a) * r1}
                    x2={Math.sin(a) * r2}
                    y2={-Math.cos(a) * r2}
                    stroke={i % 2 === 0 ? "#fbbf24" : "#64748b"}
                    strokeWidth={i % 2 === 0 ? 1.6 : 0.8}
                  />
                );
              })}
              {/* dial labels */}
              <text x="-30" y="-24" fill="#94a3b8" fontSize="7" textAnchor="middle">0</text>
              <text x="0" y="-34" fill="#94a3b8" fontSize="7" textAnchor="middle">1</text>
              <text x="30" y="-24" fill="#94a3b8" fontSize="7" textAnchor="middle">2</text>
              {/* V symbol */}
              <text x="0" y="20" fill="#fbbf24" fontSize="14" fontWeight="900" textAnchor="middle" fontFamily="monospace">V</text>
              {/* needle */}
              <motion.line
                x1="0" y1="6" x2="0" y2="-38"
                stroke="#f97316"
                strokeWidth="2.5"
                strokeLinecap="round"
                filter="url(#soft)"
                initial={false}
                animate={{ rotate: needleAngle }}
                transition={{ type: "spring", stiffness: 60, damping: 12 }}
              />
              <circle r="4" fill="#0f172a" stroke="#f97316" strokeWidth="1.5" />
              {/* digital readout below */}
              <rect x="-28" y="30" width="56" height="18" rx="3" fill="#020617" stroke="#334155" />
              <text x="0" y="43" textAnchor="middle" fill="#fbbf24" fontSize="12" fontFamily="monospace" fontWeight="700">
                {emf.toFixed(2)}
              </text>
            </g>

            {/* ============ External wire ============ */}
            {/* left wire (Zn → voltmeter) */}
            <motion.path
              d="M 200 130 L 200 60 L 348 60 L 348 110"
              fill="none"
              stroke={closed ? "url(#wire)" : "#334155"}
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={{ opacity: closed ? 1 : 0.5 }}
              filter={closed ? "url(#soft)" : undefined}
            />
            {/* right wire (voltmeter → Cu) */}
            <motion.path
              d="M 452 110 L 452 60 L 600 60 L 600 130"
              fill="none"
              stroke={closed ? "url(#wire)" : "#334155"}
              strokeWidth="3.5"
              strokeLinecap="round"
              animate={{ opacity: closed ? 1 : 0.5 }}
              filter={closed ? "url(#soft)" : undefined}
            />

            {/* Current direction arrow — only when closed */}
            {closed && (
              <g transform="translate(500,42)">
                <motion.g
                  animate={{ opacity: [0.4, 1, 0.4] }}
                  transition={{ duration: 1.4, repeat: Infinity }}
                >
                  <path d="M -20 0 L 20 0 M 12 -6 L 20 0 L 12 6" stroke="#fbbf24" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                  <text x="30" y="4" fill="#fbbf24" fontSize="11" fontFamily="monospace" fontWeight="700">I</text>
                </motion.g>
              </g>
            )}

            {/* Electrons on wire */}
            {closed && [0, 0.25, 0.5, 0.75].map((d, i) => (
              <g key={`eL-${i}`}>
                <circle r="8" fill="url(#ionGlowBlue)" />
                <circle r="4.5" fill="#22d3ee" stroke="#0891b2" strokeWidth="1">
                  <animateMotion dur={`${electronDur}s`} begin={`${d * electronDur}s`} repeatCount="indefinite" path="M 200 130 L 200 60 L 348 60" />
                </circle>
                <text fontSize="6.5" fill="#083344" fontWeight="900" textAnchor="middle" dy="2.2">
                  <animateMotion dur={`${electronDur}s`} begin={`${d * electronDur}s`} repeatCount="indefinite" path="M 200 130 L 200 60 L 348 60" />
                  e⁻
                </text>
              </g>
            ))}
            {closed && [0, 0.25, 0.5, 0.75].map((d, i) => (
              <g key={`eR-${i}`}>
                <circle r="4.5" fill="#22d3ee" stroke="#0891b2" strokeWidth="1">
                  <animateMotion dur={`${electronDur}s`} begin={`${d * electronDur}s`} repeatCount="indefinite" path="M 452 60 L 600 60 L 600 130" />
                </circle>
                <text fontSize="6.5" fill="#083344" fontWeight="900" textAnchor="middle" dy="2.2">
                  <animateMotion dur={`${electronDur}s`} begin={`${d * electronDur}s`} repeatCount="indefinite" path="M 452 60 L 600 60 L 600 130" />
                  e⁻
                </text>
              </g>
            ))}

            {/* ============ Salt bridge ============ */}
            <g>
              <path
                d="M 260 250 Q 260 180 320 180 L 480 180 Q 540 180 540 250"
                fill="url(#bridge)"
                stroke="#4d7c0f"
                strokeWidth="1.5"
              />
              {/* inner highlight */}
              <path
                d="M 265 250 Q 265 185 320 185 L 480 185 Q 535 185 535 250"
                fill="none"
                stroke="#ecfccb"
                strokeWidth="0.8"
                opacity="0.5"
              />
              {/* cotton plugs */}
              <rect x="250" y="240" width="20" height="20" rx="4" fill="#fef3c7" stroke="#a16207" />
              <rect x="530" y="240" width="20" height="20" rx="4" fill="#fef3c7" stroke="#a16207" />
              {/* label pill */}
              <rect x="340" y="150" width="120" height="20" rx="10" fill="#365314" stroke="#84cc16" strokeWidth="1" />
              <text x="400" y="164" textAnchor="middle" fill="#ecfccb" fontSize="10" fontWeight="700" letterSpacing="1.5">
                {t.saltBridge}
              </text>
            </g>

            {/* K+ ions (bridge, → toward Cu) */}
            {closed && [0, 0.4, 0.8].map((d, i) => (
              <g key={`kp-${i}`}>
                <circle r="10" fill="#a3e635" stroke="#365314" strokeWidth="1.2" filter="url(#soft)">
                  <animateMotion dur={`${electronDur * 1.3}s`} begin={`${d}s`} repeatCount="indefinite" path="M 300 195 L 500 195" />
                </circle>
                <text fontSize="8" fill="#1a2e05" fontWeight="900" textAnchor="middle" dy="3">
                  <animateMotion dur={`${electronDur * 1.3}s`} begin={`${d}s`} repeatCount="indefinite" path="M 300 195 L 500 195" />
                  K⁺
                </text>
              </g>
            ))}
            {/* Cl- ions (bridge, → toward Zn) */}
            {closed && [0.2, 0.6, 1.0].map((d, i) => (
              <g key={`cl-${i}`}>
                <circle r="10" fill="#fde68a" stroke="#a16207" strokeWidth="1.2" filter="url(#soft)">
                  <animateMotion dur={`${electronDur * 1.3}s`} begin={`${d}s`} repeatCount="indefinite" path="M 500 215 L 300 215" />
                </circle>
                <text fontSize="8" fill="#7c2d12" fontWeight="900" textAnchor="middle" dy="3">
                  <animateMotion dur={`${electronDur * 1.3}s`} begin={`${d}s`} repeatCount="indefinite" path="M 500 215 L 300 215" />
                  Cl⁻
                </text>
              </g>
            ))}

            {/* ============ LEFT BEAKER — Zn ============ */}
            <g>
              {/* halo */}
              <ellipse cx="200" cy="360" rx="115" ry="130" fill="#0ea5e9" opacity="0.08" filter="url(#strong)" />
              {/* glass body */}
              <path
                d="M 100 230 L 100 450 Q 100 462 112 462 L 288 462 Q 300 462 300 450 L 300 230"
                fill="url(#glass)"
                stroke="#e2e8f0"
                strokeOpacity="0.35"
                strokeWidth="2"
              />
              {/* rim ellipse */}
              <ellipse cx="200" cy="230" rx="100" ry="8" fill="none" stroke="#e2e8f0" strokeOpacity="0.5" strokeWidth="1.5" />
              <ellipse cx="200" cy="230" rx="100" ry="8" fill="#0b1224" opacity="0.7" />
              {/* solution */}
              <path
                d="M 105 275 L 105 450 Q 105 458 113 458 L 287 458 Q 295 458 295 450 L 295 275 Z"
                fill="url(#znSol)"
              />
              {/* surface glare */}
              <ellipse cx="200" cy="275" rx="93" ry="5" fill="#fff" opacity="0.4" />
              {/* glass reflection */}
              <path d="M 115 260 L 115 435" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
              <path d="M 285 260 L 285 435" stroke="#fff" strokeOpacity="0.12" strokeWidth="1" />
              {/* label chip */}
              <rect x="160" y="420" width="80" height="20" rx="10" fill="#0f172a" stroke="#38bdf8" strokeOpacity="0.7" />
              <text x="200" y="434" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontWeight="800">
                ZnSO₄
              </text>
            </g>

            {/* Zn electrode — shrinks */}
            <motion.rect
              x="188"
              width="24"
              rx="3"
              fill="url(#znMetal)"
              stroke="#0f172a"
              strokeWidth="1"
              initial={false}
              animate={{ y: 130 + znDelta, height: 260 - znDelta }}
              transition={{ duration: 0.6 }}
            />
            {/* eroded pits when reacting */}
            {closed && reactionExtent > 0.15 && (
              <>
                <circle cx="188" cy={310} r={1 + reactionExtent * 2} fill="#0f172a" opacity="0.6" />
                <circle cx="212" cy={340} r={1 + reactionExtent * 2} fill="#0f172a" opacity="0.6" />
                <circle cx="188" cy={380} r={1 + reactionExtent * 2} fill="#0f172a" opacity="0.6" />
              </>
            )}
            {/* Zn label chip on top */}
            <g>
              <rect x="176" y="98" width="48" height="22" rx="6" fill="#020617" stroke="#38bdf8" strokeOpacity="0.7" />
              <text x="200" y="113" textAnchor="middle" fill="#7dd3fc" fontSize="13" fontWeight="900">Zn</text>
            </g>
            {/* Anode pill */}
            <g>
              <rect x="150" y="490" width="100" height="18" rx="9" fill="#7c2d12" stroke="#f97316" strokeOpacity="0.6" />
              <text x="200" y="503" textAnchor="middle" fill="#fed7aa" fontSize="9" fontWeight="900" letterSpacing="2">
                {t.anode}
              </text>
            </g>

            {/* Zn²⁺ ions rising */}
            {closed && [0, 0.4, 0.8, 1.2].map((d, i) => (
              <g key={`zn2-${i}`}>
                <circle r="12" fill="url(#ionGlowBlue)">
                  <animateMotion dur={`${electronDur * 2}s`} begin={`${d}s`} repeatCount="indefinite" path={`M 200 ${360 + znDelta} Q ${160 + i * 20} 400 ${130 + i * 30} 445`} />
                </circle>
                <circle r="9" fill="#0ea5e9" stroke="#075985" strokeWidth="1.2">
                  <animateMotion dur={`${electronDur * 2}s`} begin={`${d}s`} repeatCount="indefinite" path={`M 200 ${360 + znDelta} Q ${160 + i * 20} 400 ${130 + i * 30} 445`} />
                </circle>
                <text fontSize="7" fill="#e0f2fe" fontWeight="900" textAnchor="middle" dy="2.5">
                  <animateMotion dur={`${electronDur * 2}s`} begin={`${d}s`} repeatCount="indefinite" path={`M 200 ${360 + znDelta} Q ${160 + i * 20} 400 ${130 + i * 30} 445`} />
                  Zn²⁺
                </text>
              </g>
            ))}

            {/* Reaction equation caption L */}
            <g transform="translate(200,526)">
              <text textAnchor="middle" fill="#7dd3fc" fontSize="11" fontFamily="monospace" fontWeight="700">
                Zn → Zn²⁺ + 2e⁻
              </text>
            </g>

            {/* ============ RIGHT BEAKER — Cu ============ */}
            <g>
              <ellipse cx="600" cy="360" rx="115" ry="130" fill="#3b82f6" opacity="0.08" filter="url(#strong)" />
              <path
                d="M 500 230 L 500 450 Q 500 462 512 462 L 688 462 Q 700 462 700 450 L 700 230"
                fill="url(#glass)"
                stroke="#e2e8f0"
                strokeOpacity="0.35"
                strokeWidth="2"
              />
              <ellipse cx="600" cy="230" rx="100" ry="8" fill="none" stroke="#e2e8f0" strokeOpacity="0.5" strokeWidth="1.5" />
              <ellipse cx="600" cy="230" rx="100" ry="8" fill="#0b1224" opacity="0.7" />
              <path
                d="M 505 275 L 505 450 Q 505 458 513 458 L 687 458 Q 695 458 695 450 L 695 275 Z"
                fill="url(#cuSol)"
              />
              <ellipse cx="600" cy="275" rx="93" ry="5" fill="#fff" opacity="0.35" />
              <path d="M 515 260 L 515 435" stroke="#fff" strokeOpacity="0.25" strokeWidth="2" />
              <path d="M 685 260 L 685 435" stroke="#fff" strokeOpacity="0.12" strokeWidth="1" />
              <rect x="560" y="420" width="80" height="20" rx="10" fill="#0f172a" stroke="#60a5fa" strokeOpacity="0.7" />
              <text x="600" y="434" textAnchor="middle" fill="#bfdbfe" fontSize="11" fontWeight="800">
                CuSO₄
              </text>
            </g>

            {/* Cu electrode — grows */}
            <motion.rect
              x="588"
              width="24"
              rx="3"
              fill="url(#cuMetal)"
              stroke="#431407"
              strokeWidth="1"
              initial={false}
              animate={{ y: 130 - cuDelta, height: 260 + cuDelta }}
              transition={{ duration: 0.6 }}
            />
            {/* deposition bumps */}
            {closed && reactionExtent > 0.15 && (
              <>
                <circle cx="586" cy={310} r={1.5 + reactionExtent * 2.5} fill="#7c2d12" />
                <circle cx="614" cy={340} r={1.5 + reactionExtent * 2.5} fill="#7c2d12" />
                <circle cx="586" cy={370} r={1.5 + reactionExtent * 2.5} fill="#7c2d12" />
                <circle cx="614" cy={400} r={1.5 + reactionExtent * 2.5} fill="#7c2d12" />
              </>
            )}
            <g>
              <rect x="576" y="98" width="48" height="22" rx="6" fill="#020617" stroke="#fb923c" strokeOpacity="0.7" />
              <text x="600" y="113" textAnchor="middle" fill="#fdba74" fontSize="13" fontWeight="900">Cu</text>
            </g>
            <g>
              <rect x="550" y="490" width="100" height="18" rx="9" fill="#78350f" stroke="#fbbf24" strokeOpacity="0.6" />
              <text x="600" y="503" textAnchor="middle" fill="#fde68a" fontSize="9" fontWeight="900" letterSpacing="2">
                {t.cathode}
              </text>
            </g>

            {/* Cu²⁺ ions falling to electrode */}
            {closed && [0, 0.4, 0.8, 1.2].map((d, i) => (
              <g key={`cu2-${i}`}>
                <circle r="12" fill="url(#ionGlowCu)">
                  <animateMotion dur={`${electronDur * 2}s`} begin={`${d}s`} repeatCount="indefinite" path={`M ${650 + i * 15} 420 Q ${625 - i * 5} 380 600 ${350 - cuDelta}`} />
                </circle>
                <circle r="9" fill="#f97316" stroke="#7c2d12" strokeWidth="1.2">
                  <animateMotion dur={`${electronDur * 2}s`} begin={`${d}s`} repeatCount="indefinite" path={`M ${650 + i * 15} 420 Q ${625 - i * 5} 380 600 ${350 - cuDelta}`} />
                </circle>
                <text fontSize="7" fill="#fff7ed" fontWeight="900" textAnchor="middle" dy="2.5">
                  <animateMotion dur={`${electronDur * 2}s`} begin={`${d}s`} repeatCount="indefinite" path={`M ${650 + i * 15} 420 Q ${625 - i * 5} 380 600 ${350 - cuDelta}`} />
                  Cu²⁺
                </text>
              </g>
            ))}

            <g transform="translate(600,526)">
              <text textAnchor="middle" fill="#fdba74" fontSize="11" fontFamily="monospace" fontWeight="700">
                Cu²⁺ + 2e⁻ → Cu
              </text>
            </g>
          </svg>

          {/* Bottom equation ticker */}
          <div className="relative z-10 border-t border-white/10 bg-black/50 backdrop-blur-md px-4 py-2.5 flex items-center justify-between gap-4">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[9px] uppercase tracking-[0.35em] text-white/40 font-bold shrink-0">
                Nernst
              </span>
              <span className="font-mono text-[11px] md:text-xs text-amber-200/90 truncate">
                {t.nernst}
              </span>
            </div>
            <button
              onClick={() => setClosed((c) => !c)}
              className={`shrink-0 inline-flex items-center gap-2 h-9 px-4 rounded-xl border-2 text-xs font-black tracking-widest transition-all ${
                closed
                  ? "bg-amber-500/20 border-amber-400 text-amber-300"
                  : "bg-white/5 border-white/20 text-white/70 hover:border-white/50"
              }`}
              style={closed ? { boxShadow: "0 0 24px rgba(251,191,36,0.45)" } : undefined}
            >
              <Power className="w-3.5 h-3.5" />
              {closed ? t.on : t.off}
            </button>
          </div>
        </div>
      </div>

      {/* ============ RIGHT: side panel ============ */}
      <aside className="space-y-4">
        {/* header card */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <p className="text-[9px] uppercase tracking-[0.35em] text-primary/80 font-bold mb-1">
            {t.tagline}
          </p>
          <h3 className="text-lg font-black tracking-tight mb-1" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {t.heading}
          </h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{t.sub}</p>
        </div>

        {/* controls */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
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
              onClick={() => setClosed(false)}
              className={`h-10 rounded-lg text-[11px] font-black tracking-widest border-2 transition-all ${
                !closed
                  ? "bg-primary/15 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t.off}
            </button>
            <button
              onClick={() => setClosed(true)}
              className={`h-10 rounded-lg text-[11px] font-black tracking-widest border-2 transition-all ${
                closed
                  ? "bg-amber-500/15 border-amber-500 text-amber-500"
                  : "border-border text-muted-foreground hover:border-amber-500/40"
              }`}
            >
              {t.on}
            </button>
          </div>

          <MiniSlider label={t.zincConc}   value={znC} min={0.01} max={2} step={0.01} suffix=" M" fmt={(v) => v.toFixed(2)} onChange={(v) => setZnC(v)} />
          <MiniSlider label={t.copperConc} value={cuC} min={0.01} max={2} step={0.01} suffix=" M" fmt={(v) => v.toFixed(2)} onChange={(v) => setCuC(v)} />

          <div className="mt-3 grid grid-cols-2 gap-2">
            <StatChip label={t.emf} value={`${emf.toFixed(3)} V`} accent="amber" />
            <StatChip label={isRTL ? "التقدم" : "Progress"} value={`${(reactionExtent * 100).toFixed(0)}%`} accent="sky" />
          </div>
        </div>

        {/* steps */}
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-bold">
              {isRTL ? "آلية العمل" : "How it works"}
            </p>
          </div>
          <ol className="space-y-1.5 text-xs text-foreground/85 leading-relaxed">
            {t.steps.map((s, i) => (
              <li key={i} className="rounded-md bg-secondary/40 border border-border/60 px-2.5 py-2 font-mono text-[11px]">
                {s}
              </li>
            ))}
          </ol>
        </div>
      </aside>
    </div>
  );
};

// ---------- helpers ----------
const StatChip = ({ label, value, accent }: { label: string; value: string; accent: "amber" | "sky" }) => {
  const color = accent === "amber" ? "text-amber-400 border-amber-500/40" : "text-sky-400 border-sky-500/40";
  return (
    <div className={`rounded-lg border ${color} bg-secondary/30 px-3 py-2`}>
      <p className="text-[9px] uppercase tracking-[0.3em] text-muted-foreground font-bold">{label}</p>
      <p className={`font-mono text-sm font-black ${color.split(" ")[0]}`}>{value}</p>
    </div>
  );
};

const MiniSlider = ({
  label, value, min, max, step, suffix, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <label className="block mb-3">
    <div className="flex items-center justify-between text-[11px] text-muted-foreground mb-1">
      <span className="font-semibold tracking-wide">{label}</span>
      <span className="font-mono text-foreground font-bold">
        {fmt ? fmt(value) : value}{suffix ?? ""}
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

export default DaniellCell;