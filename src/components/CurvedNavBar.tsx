import { Sparkles, MoreHorizontal, UserCog } from "lucide-react";
import { motion } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";

type TabKey = "basics" | "more" | "account";

const labels = {
  en: { basics: "Basics", more: "More", account: "Account" },
  ar: { basics: "الأساسيات", more: "المزيد", account: "الحساب" },
} as const;

const CurvedNavBar = ({
  language,
  active,
  onSelect,
}: {
  language: AppLanguage;
  active?: TabKey | null;
  onSelect: (c: MainMenuChoice) => void;
}) => {
  const L = labels[language];

  const go = (tab: TabKey) => {
    onSelect(tab as MainMenuChoice);
  };

  // Bar geometry — wider, properly curved, centered
  const W = 420;
  const H = 88;
  // Tab x positions inside the bar (px)
  const positions: Record<TabKey, number> = {
    basics: 70,
    more: W / 2,
    account: W - 70,
  };
  const indicatorPct = ((active ? positions[active] : positions.basics) / W) * 100;
  const spring = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.6 };
  const slide = { type: "spring" as const, stiffness: 260, damping: 30, mass: 0.5, restDelta: 0.001 };

  return (
    <motion.nav
      aria-label="Quick navigation"
      initial={{ y: 120, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 220, damping: 24, delay: 0.08 }}
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 pointer-events-none w-[min(420px,calc(100vw-2rem))]"
      dir="ltr"
    >
      <div className="relative pointer-events-auto" style={{ height: H }}>
        <svg
          width="100%"
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          preserveAspectRatio="none"
          className="absolute inset-0 drop-shadow-[0_12px_40px_hsl(var(--primary)/0.45)]"
        >
          <defs>
            <linearGradient id="curvedBg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.96" />
              <stop offset="50%" stopColor="hsl(var(--secondary))" stopOpacity="0.98" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.96" />
            </linearGradient>
            <linearGradient id="curvedStroke" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--primary) / 0.15)" />
              <stop offset="50%" stopColor="hsl(var(--primary) / 0.7)" />
              <stop offset="100%" stopColor="hsl(var(--primary) / 0.15)" />
            </linearGradient>
          </defs>
          {/*
            Curved bar with a smooth dip in the middle for the FAB.
            W=420, H=88. Top edge: rounded-rect that curves inward at center (x=170..250).
          */}
          <path
            d={`
              M 24 16
              L 168 16
              C 184 16, 188 28, 196 40
              C 204 56, 216 56, 224 40
              C 232 28, 236 16, 252 16
              L 396 16
              Q 412 16 412 32
              L 412 ${H - 16}
              Q 412 ${H} 396 ${H}
              L 24 ${H}
              Q 8 ${H} 8 ${H - 16}
              L 8 32
              Q 8 16 24 16
              Z
            `}
            fill="url(#curvedBg)"
            stroke="url(#curvedStroke)"
            strokeWidth="1.2"
          />
        </svg>

        {/* Sliding glow halo behind active tab */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: `${indicatorPct}%`, opacity: active ? 1 : 0, scale: active ? 1 : 0.6 }}
          transition={slide}
          style={{ top: H / 2, left: 0, willChange: "transform" }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-14 h-14 rounded-full bg-primary/15 blur-md"
        />
        {/* Top sliding indicator pill */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: `${indicatorPct}%`, opacity: active ? 1 : 0 }}
          transition={slide}
          style={{ left: 0, willChange: "transform" }}
          className="absolute top-1.5 -translate-x-1/2 w-10 h-1 rounded-full bg-primary shadow-[0_0_14px_hsl(var(--primary))]"
        />

        {/* Center floating button → More (sits in the curve dip) */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.08, rotate: 90 }}
          animate={{
            y: active === "more" ? -10 : -4,
            rotate: active === "more" ? 90 : 0,
          }}
          transition={spring}
          onClick={() => go("more")}
          aria-label={L.more}
          className="absolute left-1/2 -translate-x-1/2 w-16 h-16 rounded-full flex items-center justify-center shadow-[0_10px_30px_hsl(var(--primary)/0.6)] bg-gradient-to-br from-primary to-accent text-primary-foreground ring-4 ring-background/40"
          style={{ top: -22 }}
        >
          <MoreHorizontal className="w-7 h-7" />
        </motion.button>

        {/* Left tab → Basics */}
        <Tab
          x={positions.basics}
          y={H / 2 + 6}
          label={L.basics}
          isActive={active === "basics"}
          Icon={Sparkles}
          onClick={() => go("basics")}
          spring={spring}
        />

        {/* Right tab → Account */}
        <Tab
          x={positions.account}
          y={H / 2 + 6}
          label={L.account}
          isActive={active === "account"}
          Icon={UserCog}
          onClick={() => go("account")}
          spring={spring}
        />
      </div>
    </motion.nav>
  );
};

const Tab = ({
  x,
  y,
  label,
  isActive,
  Icon,
  onClick,
  spring,
}: {
  x: number;
  y: number;
  label: string;
  isActive: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  spring: object;
}) => (
  <motion.button
    whileTap={{ scale: 0.88 }}
    whileHover={{ scale: 1.06 }}
    transition={spring}
    onClick={onClick}
    style={{ left: `${(x / 420) * 100}%`, top: y }}
    className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-3 py-1 select-none ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    } transition-colors`}
  >
    <motion.span
      animate={{ scale: isActive ? 1.25 : 1, y: isActive ? -4 : 0 }}
      transition={spring}
    >
      <Icon className="w-5 h-5" />
    </motion.span>
    <motion.span
      animate={{ opacity: isActive ? 1 : 0.75, y: isActive ? -2 : 0 }}
      transition={{ duration: 0.25 }}
      className="text-[10px] font-semibold tracking-wide"
    >
      {label}
    </motion.span>
  </motion.button>
);

export default CurvedNavBar;