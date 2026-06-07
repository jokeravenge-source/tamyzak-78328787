import { Home, UserCog, Trophy, Crown } from "lucide-react";
import { motion, LayoutGroup } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";

type TabKey = "basics" | "leaderboard" | "account" | "premium" | "more";

const labels = {
  en: { basics: "Home", leaderboard: "Leaders", account: "Account", premium: "Premium", library: "Library", donate: "Donate" },
  ar: { basics: "الرئيسية", leaderboard: "المتصدرون", account: "الحساب", premium: "بريميوم", library: "مكتبة", donate: "تبرع" },
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
  const tabs: { key: Exclude<TabKey, "more">; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "basics", label: L.basics, Icon: Home },
    { key: "leaderboard", label: L.leaderboard, Icon: Trophy },
    { key: "premium", label: L.premium, Icon: Crown },
    { key: "account", label: L.account, Icon: UserCog },
  ];
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div
      className="fixed left-0 right-0 z-[100] flex justify-center pointer-events-none px-3"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + 0.75rem)` }}
    >
      <motion.nav
        aria-label="Primary"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease }}
        className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-card/85 backdrop-blur-xl shadow-[0_18px_50px_-12px_hsl(var(--primary)/0.25)] p-1.5"
        dir="ltr"
      >
        <LayoutGroup id="curved-nav">
          <div className="flex items-stretch gap-1">
            {tabs.map((t) => {
              const isActive = active === t.key;
              const Icon = t.Icon;
              return (
                <motion.button
                  key={t.key}
                  type="button"
                  whileTap={{ scale: 0.92 }}
                  onClick={() => onSelect(t.key as MainMenuChoice)}
                  aria-current={isActive ? "page" : undefined}
                  className={`relative flex-1 h-12 inline-flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold select-none transition-colors ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="tabbar-active"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-[hsl(213_94%_68%)] shadow-[0_6px_20px_hsl(var(--primary)/0.4)]"
                    />
                  )}
                  <motion.span
                    animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="relative z-10"
                  >
                    <Icon className="w-4 h-4" />
                  </motion.span>
                  <span className="relative z-10 tracking-wide">{t.label}</span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </motion.nav>
    </div>
  );
};

export default CurvedNavBar;