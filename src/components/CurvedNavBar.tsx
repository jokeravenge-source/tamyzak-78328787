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

  return (
    <nav
      aria-label="Quick navigation"
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

        {/* Center floating button → More */}
        <motion.button
          whileTap={{ scale: 0.9 }}
          whileHover={{ scale: 1.08 }}
          onClick={() => go("more")}
          aria-label={L.more}
          className={`absolute left-1/2 -translate-x-1/2 -top-2 w-14 h-14 rounded-full flex items-center justify-center shadow-[var(--shadow-glow)] ${
            active === "more" ? "bg-primary text-primary-foreground ring-4 ring-primary/30" : "bg-primary text-primary-foreground"
          }`}
        >
          <MoreHorizontal className="w-6 h-6" />
        </motion.button>

        {/* Left tab → Basics */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => go("basics")}
          className={`absolute left-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-2 transition-colors ${
            active === "basics" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <motion.span animate={{ scale: active === "basics" ? 1.2 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
            <Sparkles className="w-5 h-5" />
          </motion.span>
          <span className="text-[10px] font-medium tracking-wide">{L.basics}</span>
          {active === "basics" && (
            <motion.span layoutId="navIndicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </motion.button>

        {/* Right tab → Account */}
        <motion.button
          whileTap={{ scale: 0.92 }}
          onClick={() => go("account")}
          className={`absolute right-6 top-1/2 -translate-y-1/2 flex flex-col items-center gap-0.5 px-2 transition-colors ${
            active === "account" ? "text-primary" : "text-muted-foreground hover:text-foreground"
          }`}
        >
          <motion.span animate={{ scale: active === "account" ? 1.2 : 1 }} transition={{ type: "spring", stiffness: 300, damping: 16 }}>
            <UserCog className="w-5 h-5" />
          </motion.span>
          <span className="text-[10px] font-medium tracking-wide">{L.account}</span>
          {active === "account" && (
            <motion.span layoutId="navIndicator" className="absolute -bottom-1 w-1.5 h-1.5 rounded-full bg-primary" />
          )}
        </motion.button>
      </div>
    </nav>
  );
};

export default CurvedNavBar;