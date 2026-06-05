import { Sparkles, MoreHorizontal, UserCog, Trophy, Heart, BookOpen } from "lucide-react";
import { motion } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";

type TabKey = "basics" | "more" | "leaderboard" | "account";

const labels = {
  en: { basics: "Basics", more: "More", leaderboard: "Leaders", account: "Account", donate: "Donate", library: "Library" },
  ar: { basics: "الأساسيات", more: "المزيد", leaderboard: "المتصدرون", account: "الحساب", donate: "تبرع", library: "مكتبة التميز" },
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
  const tabs: { key: TabKey; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "basics", label: L.basics, Icon: Sparkles },
    { key: "more", label: L.more, Icon: MoreHorizontal },
    { key: "leaderboard", label: L.leaderboard, Icon: Trophy },
    { key: "account", label: L.account, Icon: UserCog },
  ];
  const ease = [0.22, 1, 0.36, 1] as const;

  return (
    <div
      className="fixed bottom-5 md:bottom-8 left-0 right-0 z-[100] flex justify-center pointer-events-none"
      style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + 1.25rem)` }}
    >
      <motion.nav
        aria-label="Primary"
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease }}
        className="w-[min(520px,calc(100vw-1.5rem))] md:w-[620px] pointer-events-auto"
        dir="ltr"
      >
        <div className="relative flex items-stretch rounded-2xl border border-white/10 bg-secondary/80 backdrop-blur-xl shadow-[0_10px_40px_hsl(var(--primary)/0.25)] overflow-hidden p-1.5">
          {tabs.map((t) => {
            const isActive = active === t.key;
            const Icon = t.Icon;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => onSelect(t.key as MainMenuChoice)}
                aria-current={isActive ? "page" : undefined}
                className={`relative flex-1 h-12 md:h-14 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold select-none transition-colors ${
                  isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {isActive && (
                  <motion.span
                    layoutId="tabbar-active"
                    transition={{ type: "spring", stiffness: 380, damping: 32, mass: 0.6 }}
                    className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-accent shadow-[0_6px_20px_hsl(var(--primary)/0.45)]"
                  />
                )}
                <span className="relative inline-flex items-center gap-2">
                  <Icon className="w-4 h-4 md:w-5 md:h-5" />
                  <span className="text-xs md:text-sm tracking-wide">{t.label}</span>
                </span>
              </button>
            );
          })}
          <a
            href="https://t.me/DHSLibrary"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={language === "ar" ? "مكتبة التميز" : "Excellence Library"}
            className="relative flex-1 h-12 md:h-14 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold select-none text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="relative inline-flex items-center gap-2">
              <BookOpen className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm tracking-wide">{L.library}</span>
            </span>
          </a>
          <a
            href="https://t.me/ias404"
            target="_blank"
            rel="noopener noreferrer"
            aria-label={language === "ar" ? "تبرع عبر تيليجرام" : "Donate on Telegram"}
            className="relative flex-1 h-12 md:h-14 inline-flex items-center justify-center gap-2 rounded-xl text-sm font-semibold select-none text-muted-foreground hover:text-foreground transition-colors"
          >
            <span className="relative inline-flex items-center gap-2">
              <Heart className="w-4 h-4 md:w-5 md:h-5" />
              <span className="text-xs md:text-sm tracking-wide">{L.donate}</span>
            </span>
          </a>
        </div>
      </motion.nav>
    </div>
  );
};

export default CurvedNavBar;