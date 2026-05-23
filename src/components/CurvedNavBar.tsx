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

  // Fixed pixel positions of the three tabs inside the 320px-wide bar
  const positions: Record<TabKey, number> = {
    basics: 36,
    more: 160,
    account: 284,
  };
  const indicatorX = active ? positions[active] : positions.basics;
  const spring = { type: "spring" as const, stiffness: 320, damping: 28, mass: 0.6 };

  return (
    <motion.nav
      aria-label="Quick navigation"
      initial={{ y: 100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 26, delay: 0.05 }}
      className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 pointer-events-none"
      dir="ltr"
    >
      <div className="relative pointer-events-auto">
        <svg width="320" height="80" viewBox="0 0 320 80" className="drop-shadow-[0_8px_30px_hsl(var(--primary)/0.35)]">
          <defs>
            <linearGradient id="curvedBg" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="hsl(var(--secondary))" stopOpacity="0.95" />
              <stop offset="100%" stopColor="hsl(var(--secondary))" stopOpacity="0.95" />
            </linearGradient>
          </defs>
          <path
            d="M0,40 Q0,15 25,15 L115,15 Q130,15 138,28 Q160,55 182,28 Q190,15 205,15 L295,15 Q320,15 320,40 L320,65 Q320,80 305,80 L15,80 Q0,80 0,65 Z"
            fill="url(#curvedBg)"
            stroke="hsl(var(--primary) / 0.4)"
            strokeWidth="1"
          />
        </svg>

        {/* Sliding active indicator (smoothly animates between tab positions) */}
        <motion.span
          aria-hidden
          initial={false}
          animate={{ x: indicatorX, opacity: active ? 1 : 0 }}
          transition={spring}
          className="absolute top-0 left-0 -translate-x-1/2 w-10 h-1 rounded-full bg-primary shadow-[0_0_12px_hsl(var(--primary))]"
        />

        {/* Center floating button → More */}
        <motion.button
          whileTap={{ scale: 0.88 }}
          whileHover={{ scale: 1.06 }}
          animate={{ y: active === "more" ? -4 : 0 }}
          transition={spring}
          onClick={() => go("more")}
          aria-label={L.more}
          className="absolute left-1/2 -translate-x-1/2 -top-2 w-14 h-14 rounded-full flex items-center justify-center shadow-[var(--shadow-glow)] bg-primary text-primary-foreground"
        >
          <MoreHorizontal className="w-6 h-6" />
        </motion.button>

        {/* Left tab → Basics */}
        <Tab
          x={positions.basics}
          label={L.basics}
          isActive={active === "basics"}
          Icon={Sparkles}
          onClick={() => go("basics")}
          spring={spring}
        />

        {/* Right tab → Account */}
        <Tab
          x={positions.account}
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
  label,
  isActive,
  Icon,
  onClick,
  spring,
}: {
  x: number;
  label: string;
  isActive: boolean;
  Icon: React.ComponentType<{ className?: string }>;
  onClick: () => void;
  spring: object;
}) => (
  <motion.button
    whileTap={{ scale: 0.9 }}
    transition={spring}
    onClick={onClick}
    style={{ left: x }}
    className={`absolute top-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-2 select-none ${
      isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
    } transition-colors`}
  >
    <motion.span
      animate={{ scale: isActive ? 1.25 : 1, y: isActive ? -2 : 0 }}
      transition={spring}
    >
      <Icon className="w-5 h-5" />
    </motion.span>
    <motion.span
      animate={{ opacity: isActive ? 1 : 0.75 }}
      transition={{ duration: 0.2 }}
      className="text-[10px] font-medium tracking-wide"
    >
      {label}
    </motion.span>
  </motion.button>
);

export default CurvedNavBar;