import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { RotateCcw, Power, Info, Zap, Beaker } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

// ---------- copy ----------
const copy = {
  en: {
    heading: "Daniell Cell",
    sub: "Zinc dissolves at the anode, copper deposits at the cathode, and the salt bridge keeps both half-cells electrically neutral. Close the switch and watch the electrons flow.",
    switchLabel: "Circuit switch",
    on: "Closed",
    off: "Open",
    reset: "Reset",
    emf: "EMF",
    zincConc: "[Zn²⁺]",
    copperConc: "[Cu²⁺]",
    voltage: "Cell voltage",
    zincMass: "Zn electrode",
    copperMass: "Cu electrode",
    anode: "ANODE  (−)",
    cathode: "CATHODE  (+)",
    saltBridge: "Salt bridge (KCl)",
    steps: [
      "1 · Zn is more active than Cu, so it loses electrons more easily.",
      "2 · Anode (Zn): Zn → Zn²⁺ + 2e⁻ — zinc atoms dissolve into solution.",
      "3 · Electrons travel through the external wire from Zn → Cu.",
      "4 · Cathode (Cu): Cu²⁺ + 2e⁻ → Cu — copper plates onto the electrode.",
      "5 · The salt bridge lets ions flow to keep both beakers neutral.",
      "6 · E°cell = E°(Cu²⁺/Cu) − E°(Zn²⁺/Zn) = +0.34 − (−0.76) = 1.10 V.",
    ],
    tips: {
      zn: "Zinc electrode — the anode. Oxidation happens here.",
      cu: "Copper electrode — the cathode. Reduction happens here.",
      znso4: "ZnSO₄ solution — receives Zn²⁺ ions as the electrode dissolves.",
      cuso4: "CuSO₄ solution — Cu²⁺ ions are consumed as they plate the electrode.",
      bridge: "Salt bridge — K⁺ migrates toward Cu side, Cl⁻ toward Zn side.",
      voltmeter: "Voltmeter — reads the cell EMF via the Nernst equation.",
    },
    nernst: "Nernst:  E = 1.10 − (0.0592 / 2) · log([Zn²⁺] / [Cu²⁺])",
  },
  ar: {
    heading: "خلية دانييل",
    sub: "الخارصين يذوب في المصعد، والنحاس يترسّب على المهبط، والقنطرة الملحية تحافظ على التعادل الكهربائي. أغلق المفتاح ولاحظ سريان الإلكترونات.",
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
    saltBridge: "قنطرة ملحية (KCl)",
    steps: [
      "١ · الخارصين أنشط من النحاس فهو يفقد الإلكترونات أسهل.",
      "٢ · المصعد (Zn): Zn → Zn²⁺ + 2e⁻ — ذرات الخارصين تذوب في المحلول.",
      "٣ · تنتقل الإلكترونات في السلك الخارجي من Zn إلى Cu.",
      "٤ · المهبط (Cu): Cu²⁺ + 2e⁻ → Cu — يترسّب النحاس على القطب.",
      "٥ · تسمح القنطرة الملحية بمرور الأيونات للحفاظ على تعادل الكأسين.",
      "٦ · E°خلية = E°(Cu²⁺/Cu) − E°(Zn²⁺/Zn) = +0.34 − (−0.76) = 1.10 فولت.",
    ],
    tips: {
      zn: "قطب الخارصين — المصعد. تحدث فيه عملية الأكسدة.",
      cu: "قطب النحاس — المهبط. تحدث فيه عملية الاختزال.",
      znso4: "محلول ZnSO₄ — يستقبل أيونات Zn²⁺ عند ذوبان القطب.",
      cuso4: "محلول CuSO₄ — تُستهلك أيونات Cu²⁺ لتترسّب على القطب.",
      bridge: "قنطرة ملحية — K⁺ تتّجه نحو جهة النحاس وCl⁻ نحو جهة الخارصين.",
      voltmeter: "فولتمتر — يقيس القوة الدافعة الكهربائية للخلية.",
    },
    nernst: "معادلة نرنست:  E = 1.10 − (0.0592 / 2) · log([Zn²⁺] / [Cu²⁺])",
  },
} as const;

// ---------- component ----------
const DaniellCell = ({ language }: { language: AppLanguage }) => {
  const isRTL = language === "ar";
  const t = copy[language];

  const [closed, setClosed] = useState(false);
  const [znC, setZnC] = useState(1.0);  // mol/L
  const [cuC, setCuC] = useState(1.0);
  const [elapsed, setElapsed] = useState(0);
  const rafRef = useRef<number>();
  const startRef = useRef<number>(0);

  // EMF via Nernst
  const E0 = 1.10;
  const emf = E0 - (0.0592 / 2) * Math.log10(znC / cuC);

  // simulation clock (only advances while closed)
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

  // Electrode mass changes are proportional to elapsed × current-ish factor
  // Purely visual: scale by emf so higher emf → faster reaction
  const reactionExtent = Math.min(1, (elapsed * emf) / 40);
  const znHeight = 130 - reactionExtent * 40; // shrinks
  const cuHeight = 130 + reactionExtent * 40; // grows

  const reset = () => {
    setClosed(false);
    setElapsed(0);
  };

  // Speed of the electron flow depends on EMF
  const electronDur = Math.max(1.0, 3.0 - emf * 1.2);

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-4">
      {/* LEFT: Scene */}
      <div className="space-y-4">
        <div className="relative rounded-2xl overflow-hidden border border-border bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 h-[480px] md:h-[540px]">
          {/* readouts */}
          <div className="absolute top-3 left-3 z-20 rounded-xl bg-black/60 backdrop-blur border border-white/10 px-3 py-2 text-xs text-white space-y-0.5 pointer-events-none">
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-400" />
              <span className="uppercase tracking-widest text-white/60">{t.emf}</span>
            </div>
            <div className="font-mono text-lg font-semibold text-amber-300">
              {emf.toFixed(3)} V
            </div>
            <div className="text-white/60">E° = 1.10 V</div>
            <div className="text-white/50 text-[10px] mt-1 font-mono">
              log([Zn²⁺]/[Cu²⁺]) = {Math.log10(znC / cuC).toFixed(3)}
            </div>
          </div>

          <svg viewBox="0 0 800 500" className="absolute inset-0 w-full h-full">
            <defs>
              <linearGradient id="glassZn" x1="0" x2="1">
                <stop offset="0%" stopColor="#e2e8f0" stopOpacity="0.25" />
                <stop offset="50%" stopColor="#f8fafc" stopOpacity="0.55" />
                <stop offset="100%" stopColor="#cbd5e1" stopOpacity="0.25" />
              </linearGradient>
              <linearGradient id="znSol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#bae6fd" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#7dd3fc" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="cuSol" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#93c5fd" stopOpacity="0.7" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.9" />
              </linearGradient>
              <linearGradient id="znMetal" x1="0" x2="1">
                <stop offset="0%" stopColor="#94a3b8" />
                <stop offset="50%" stopColor="#e2e8f0" />
                <stop offset="100%" stopColor="#64748b" />
              </linearGradient>
              <linearGradient id="cuMetal" x1="0" x2="1">
                <stop offset="0%" stopColor="#b45309" />
                <stop offset="50%" stopColor="#fb923c" />
                <stop offset="100%" stopColor="#9a3412" />
              </linearGradient>
              <linearGradient id="bridge" x1="0" x2="1">
                <stop offset="0%" stopColor="#a3e635" stopOpacity="0.6" />
                <stop offset="50%" stopColor="#bef264" stopOpacity="0.8" />
                <stop offset="100%" stopColor="#a3e635" stopOpacity="0.6" />
              </linearGradient>
            </defs>

            {/* Table shadow under beakers */}
            <ellipse cx="200" cy="460" rx="130" ry="10" fill="#000" opacity="0.35" />
            <ellipse cx="600" cy="460" rx="130" ry="10" fill="#000" opacity="0.35" />

            {/* --- External wire (top loop with voltmeter and switch) --- */}
            {/* Wire from Zn electrode top → up → across → down to Cu electrode top */}
            <path
              d="M 200 90 L 200 50 L 360 50"
              fill="none"
              stroke={closed ? "#fbbf24" : "#475569"}
              strokeWidth="3.5"
            />
            <path
              d="M 440 50 L 600 50 L 600 90"
              fill="none"
              stroke={closed ? "#fbbf24" : "#475569"}
              strokeWidth="3.5"
            />

            {/* Voltmeter (circle) */}
            <g>
              <circle cx="400" cy="50" r="34" fill="#0f172a" stroke="#334155" strokeWidth="2" />
              <text x="400" y="45" textAnchor="middle" fill="#e2e8f0" fontSize="18" fontWeight="700">V</text>
              <text x="400" y="65" textAnchor="middle" fill="#fbbf24" fontSize="10" fontFamily="monospace">
                {emf.toFixed(2)}
              </text>
              {/* connectors */}
              <line x1="366" y1="50" x2="360" y2="50" stroke={closed ? "#fbbf24" : "#475569"} strokeWidth="3.5" />
              <line x1="434" y1="50" x2="440" y2="50" stroke={closed ? "#fbbf24" : "#475569"} strokeWidth="3.5" />
            </g>

            {/* --- Salt bridge (inverted U tube) --- */}
            <path
              d="M 260 220 Q 260 160 320 160 L 480 160 Q 540 160 540 220"
              fill="url(#bridge)"
              stroke="#365314"
              strokeWidth="2"
            />
            <path
              d="M 260 220 Q 260 165 320 165 L 480 165 Q 540 165 540 220"
              fill="none"
              stroke="#84cc16"
              strokeWidth="1"
              opacity="0.6"
            />
            {/* cotton plugs */}
            <rect x="252" y="215" width="16" height="18" rx="3" fill="#fef3c7" stroke="#a16207" />
            <rect x="532" y="215" width="16" height="18" rx="3" fill="#fef3c7" stroke="#a16207" />
            {/* label */}
            <text x="400" y="145" textAnchor="middle" fill="#a3e635" fontSize="11" fontWeight="600" letterSpacing="1">
              {t.saltBridge}
            </text>

            {/* K+ ions flowing right (toward Cu side) when closed */}
            {closed && [0, 0.4, 0.8].map((d, i) => (
              <g key={`kplus-${i}`}>
                <circle r="7" fill="#a3e635" stroke="#365314" strokeWidth="1">
                  <animateMotion
                    dur={`${electronDur * 1.2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path="M 300 170 L 500 170"
                  />
                </circle>
                <text fontSize="8" fill="#365314" fontWeight="700" textAnchor="middle" dy="3">
                  <animateMotion
                    dur={`${electronDur * 1.2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path="M 300 170 L 500 170"
                  />
                  K⁺
                </text>
              </g>
            ))}
            {/* Cl- ions flowing left (toward Zn side) */}
            {closed && [0.2, 0.6, 1.0].map((d, i) => (
              <g key={`cl-${i}`}>
                <circle r="7" fill="#fde68a" stroke="#a16207" strokeWidth="1">
                  <animateMotion
                    dur={`${electronDur * 1.2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path="M 500 185 L 300 185"
                  />
                </circle>
                <text fontSize="8" fill="#7c2d12" fontWeight="700" textAnchor="middle" dy="3">
                  <animateMotion
                    dur={`${electronDur * 1.2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path="M 500 185 L 300 185"
                  />
                  Cl⁻
                </text>
              </g>
            ))}

            {/* ============ LEFT BEAKER (Zn / ZnSO4) ============ */}
            {/* beaker outline */}
            <path
              d="M 100 210 L 100 440 Q 100 450 110 450 L 290 450 Q 300 450 300 440 L 300 210"
              fill="url(#glassZn)"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            {/* solution */}
            <path
              d="M 105 260 L 105 440 Q 105 445 112 445 L 288 445 Q 295 445 295 440 L 295 260 Z"
              fill="url(#znSol)"
            />
            {/* solution surface highlight */}
            <ellipse cx="200" cy="260" rx="95" ry="5" fill="#fff" opacity="0.35" />
            {/* label */}
            <text x="200" y="430" textAnchor="middle" fill="#0c4a6e" fontSize="14" fontWeight="700">
              ZnSO₄
            </text>

            {/* Zn electrode (shrinks with reaction) */}
            <motion.rect
              x="188"
              width="24"
              rx="2"
              fill="url(#znMetal)"
              stroke="#334155"
              strokeWidth="1"
              initial={false}
              animate={{ y: 90, height: 260 + (znHeight - 130) }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            {/* eroded texture on submerged part */}
            {closed && reactionExtent > 0.1 && (
              <>
                <line x1="188" y1={280} x2="212" y2={278} stroke="#0f172a" strokeWidth="0.5" opacity="0.4" />
                <line x1="188" y1={310} x2="212" y2={312} stroke="#0f172a" strokeWidth="0.5" opacity="0.4" />
                <line x1="188" y1={340} x2="212" y2={338} stroke="#0f172a" strokeWidth="0.5" opacity="0.4" />
              </>
            )}
            <text x="200" y="80" textAnchor="middle" fill="#e2e8f0" fontSize="13" fontWeight="700">Zn</text>
            <text x="200" y="475" textAnchor="middle" fill="#94a3b8" fontSize="10" letterSpacing="1.5">
              {t.anode}
            </text>

            {/* Zn²⁺ ions rising from electrode into solution */}
            {closed && [0, 0.5, 1.0, 1.5].map((d, i) => (
              <g key={`zn2-${i}`}>
                <circle r="8" fill="#38bdf8" stroke="#0c4a6e" strokeWidth="1">
                  <animateMotion
                    dur={`${electronDur * 2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path={`M 200 340 Q ${150 + i * 25} 380 ${130 + i * 30} 420`}
                  />
                </circle>
                <text fontSize="8" fill="#0c4a6e" fontWeight="700" textAnchor="middle" dy="3">
                  <animateMotion
                    dur={`${electronDur * 2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path={`M 200 340 Q ${150 + i * 25} 380 ${130 + i * 30} 420`}
                  />
                  Zn²⁺
                </text>
              </g>
            ))}

            {/* Half-reaction label */}
            <text x="200" y="500" textAnchor="middle" fill="#7dd3fc" fontSize="11" fontFamily="monospace">
              Zn → Zn²⁺ + 2e⁻
            </text>

            {/* ============ RIGHT BEAKER (Cu / CuSO4) ============ */}
            <path
              d="M 500 210 L 500 440 Q 500 450 510 450 L 690 450 Q 700 450 700 440 L 700 210"
              fill="url(#glassZn)"
              stroke="#94a3b8"
              strokeWidth="2"
            />
            <path
              d="M 505 260 L 505 440 Q 505 445 512 445 L 688 445 Q 695 445 695 440 L 695 260 Z"
              fill="url(#cuSol)"
            />
            <ellipse cx="600" cy="260" rx="95" ry="5" fill="#fff" opacity="0.3" />
            <text x="600" y="430" textAnchor="middle" fill="#0c4a6e" fontSize="14" fontWeight="700">
              CuSO₄
            </text>

            {/* Cu electrode (grows with reaction) */}
            <motion.rect
              x="588"
              width="24"
              rx="2"
              fill="url(#cuMetal)"
              stroke="#7c2d12"
              strokeWidth="1"
              initial={false}
              animate={{ y: 90, height: 260 + (cuHeight - 130) }}
              transition={{ duration: 0.6, ease: "easeInOut" }}
            />
            {/* deposition bumps on submerged part when reaction proceeds */}
            {closed && reactionExtent > 0.15 && (
              <>
                <circle cx="586" cy={295} r={1.5 + reactionExtent * 2} fill="#7c2d12" />
                <circle cx="614" cy={320} r={1.5 + reactionExtent * 2} fill="#7c2d12" />
                <circle cx="586" cy={355} r={1.5 + reactionExtent * 2} fill="#7c2d12" />
                <circle cx="614" cy={385} r={1.5 + reactionExtent * 2} fill="#7c2d12" />
              </>
            )}
            <text x="600" y="80" textAnchor="middle" fill="#fdba74" fontSize="13" fontWeight="700">Cu</text>
            <text x="600" y="475" textAnchor="middle" fill="#fdba74" fontSize="10" letterSpacing="1.5">
              {t.cathode}
            </text>

            {/* Cu²⁺ ions moving from solution to electrode */}
            {closed && [0, 0.5, 1.0, 1.5].map((d, i) => (
              <g key={`cu2-${i}`}>
                <circle r="8" fill="#3b82f6" stroke="#1e3a8a" strokeWidth="1">
                  <animateMotion
                    dur={`${electronDur * 2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path={`M ${640 + i * 15} 400 Q ${620 - i * 5} 360 600 340`}
                  />
                </circle>
                <text fontSize="8" fill="#e0e7ff" fontWeight="700" textAnchor="middle" dy="3">
                  <animateMotion
                    dur={`${electronDur * 2}s`}
                    begin={`${d}s`}
                    repeatCount="indefinite"
                    path={`M ${640 + i * 15} 400 Q ${620 - i * 5} 360 600 340`}
                  />
                  Cu²⁺
                </text>
              </g>
            ))}

            <text x="600" y="500" textAnchor="middle" fill="#93c5fd" fontSize="11" fontFamily="monospace">
              Cu²⁺ + 2e⁻ → Cu
            </text>

            {/* ============ Electron flow along the wire (only when closed) ============ */}
            {closed && [0, 0.25, 0.5, 0.75].map((d, i) => (
              <g key={`e-${i}`}>
                <circle r="6" fill="#22d3ee" stroke="#0891b2" strokeWidth="1">
                  <animateMotion
                    dur={`${electronDur}s`}
                    begin={`${d * electronDur}s`}
                    repeatCount="indefinite"
                    path="M 200 90 L 200 50 L 360 50"
                  />
                </circle>
                <text fontSize="8" fill="#083344" fontWeight="700" textAnchor="middle" dy="3">
                  <animateMotion
                    dur={`${electronDur}s`}
                    begin={`${d * electronDur}s`}
                    repeatCount="indefinite"
                    path="M 200 90 L 200 50 L 360 50"
                  />
                  e⁻
                </text>
              </g>
            ))}
            {closed && [0, 0.25, 0.5, 0.75].map((d, i) => (
              <g key={`e2-${i}`}>
                <circle r="6" fill="#22d3ee" stroke="#0891b2" strokeWidth="1">
                  <animateMotion
                    dur={`${electronDur}s`}
                    begin={`${d * electronDur}s`}
                    repeatCount="indefinite"
                    path="M 440 50 L 600 50 L 600 90"
                  />
                </circle>
                <text fontSize="8" fill="#083344" fontWeight="700" textAnchor="middle" dy="3">
                  <animateMotion
                    dur={`${electronDur}s`}
                    begin={`${d * electronDur}s`}
                    repeatCount="indefinite"
                    path="M 440 50 L 600 50 L 600 90"
                  />
                  e⁻
                </text>
              </g>
            ))}

            {/* Current direction arrow */}
            {closed && (
              <g>
                <path
                  d="M 490 26 L 470 26 M 470 26 L 476 22 M 470 26 L 476 30"
                  stroke="#fbbf24"
                  strokeWidth="2"
                  fill="none"
                />
                <text x="500" y="30" fill="#fbbf24" fontSize="10" fontFamily="monospace">I</text>
              </g>
            )}
          </svg>

          {/* Big open/closed indicator */}
          <div className="absolute bottom-3 right-3 z-20">
            <button
              onClick={() => setClosed((c) => !c)}
              className={`inline-flex items-center gap-2 h-10 px-4 rounded-xl border-2 text-sm font-semibold transition-all ${
                closed
                  ? "bg-amber-500/20 border-amber-500 text-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.4)]"
                  : "bg-black/50 border-white/20 text-white/70 hover:border-white/40"
              }`}
            >
              <Power className="w-4 h-4" />
              {closed ? t.on : t.off}
            </button>
          </div>
        </div>
      </div>

      {/* RIGHT: controls */}
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
              onClick={() => setClosed(false)}
              className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                !closed
                  ? "bg-primary/15 border-primary text-primary"
                  : "border-border text-muted-foreground hover:border-primary/40"
              }`}
            >
              {t.off}
            </button>
            <button
              onClick={() => setClosed(true)}
              className={`h-10 rounded-lg text-xs font-semibold border transition-all ${
                closed
                  ? "bg-amber-500/15 border-amber-500 text-amber-500"
                  : "border-border text-muted-foreground hover:border-amber-500/40"
              }`}
            >
              {t.on}
            </button>
          </div>

          <MiniSlider
            label={t.zincConc}
            value={znC}
            min={0.01}
            max={2}
            step={0.01}
            suffix=" M"
            fmt={(v) => v.toFixed(2)}
            onChange={(v) => { setZnC(v); }}
          />
          <MiniSlider
            label={t.copperConc}
            value={cuC}
            min={0.01}
            max={2}
            step={0.01}
            suffix=" M"
            fmt={(v) => v.toFixed(2)}
            onChange={(v) => { setCuC(v); }}
          />

          <div className="mt-3 rounded-lg bg-secondary/40 border border-border/60 px-3 py-2 text-[11px] font-mono text-foreground/80">
            {t.nernst}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Info className="w-4 h-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {isRTL ? "آلية العمل" : "How it works"}
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

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Beaker className="w-4 h-4 text-primary" />
            <p className="text-xs uppercase tracking-widest text-muted-foreground">
              {isRTL ? "الحالة" : "State"}
            </p>
          </div>
          <div className="space-y-2 text-xs">
            <Row label={t.zincMass}   value={`${(reactionExtent * 100).toFixed(0)}% ${isRTL ? "مذاب" : "dissolved"}`} color="text-sky-300" />
            <Row label={t.copperMass} value={`+${(reactionExtent * 100).toFixed(0)}% ${isRTL ? "مترسّب" : "plated"}`} color="text-orange-300" />
            <Row label={t.voltage}    value={`${emf.toFixed(3)} V`} color="text-amber-300" />
          </div>
        </div>
      </aside>
    </div>
  );
};

const Row = ({ label, value, color }: { label: string; value: string; color: string }) => (
  <div className="flex items-center justify-between border-b border-border/40 pb-1.5 last:border-0">
    <span className="text-muted-foreground">{label}</span>
    <span className={`font-mono font-semibold ${color}`}>{value}</span>
  </div>
);

const MiniSlider = ({
  label, value, min, max, step, suffix, onChange, fmt,
}: {
  label: string; value: number; min: number; max: number; step: number; suffix?: string;
  onChange: (v: number) => void; fmt?: (v: number) => string;
}) => (
  <label className="block mb-3">
    <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
      <span>{label}</span>
      <span className="font-mono text-foreground">
        {fmt ? fmt(value) : value}
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

export default DaniellCell;