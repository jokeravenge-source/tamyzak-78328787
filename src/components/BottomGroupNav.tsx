import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import {
  Layers, Target, Users, Swords, ScrollText, Settings, BookOpen,
  NotebookPen, FileText, HelpCircle, Network, Headphones, Video, Youtube,
  Sparkles, GraduationCap, ListChecks, Trophy, Newspaper, Lightbulb,
  UserCog, Crown,
} from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";

type NavItem = {
  key: MainMenuChoice;
  labelEn: string;
  labelAr: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const NAV_GROUPS: { titleEn: string; titleAr: string; items: NavItem[] }[] = [
  {
    titleEn: "Subjects", titleAr: "المواد",
    items: [{ key: "subjectsHub", labelEn: "All Subjects", labelAr: "كل المواد", Icon: BookOpen }],
  },
  {
    titleEn: "Study", titleAr: "الأدوات",
    items: [
      { key: "notes", labelEn: "Notes", labelAr: "ملاحظاتي", Icon: NotebookPen },
      { key: "summaries", labelEn: "Summaries", labelAr: "الملخصات", Icon: FileText },
      { key: "mcq", labelEn: "MCQ Generator", labelAr: "مولّد الأسئلة", Icon: HelpCircle },
      { key: "mindmap", labelEn: "Mind Map", labelAr: "الخريطة الذهنية", Icon: Network },
      { key: "videoNotes", labelEn: "Video Notes", labelAr: "ملاحظات الفيديو", Icon: Headphones },
      { key: "textToVideo", labelEn: "Text → Video", labelAr: "نص إلى فيديو", Icon: Video },
      { key: "youtube", labelEn: "YouTube Player", labelAr: "مشغّل يوتيوب", Icon: Youtube },
      { key: "liveBattle", labelEn: "Live Battle", labelAr: "المعركة المباشرة", Icon: Swords },
      { key: "essay", labelEn: "Al-Musahhih", labelAr: "المُصحِّح", Icon: BookOpen },
    ],
  },
  {
    titleEn: "Progress", titleAr: "التقدم",
    items: [
      { key: "report", labelEn: "Daily Report", labelAr: "تقريري", Icon: Sparkles },
      { key: "sessions", labelEn: "Sessions", labelAr: "الجلسات", Icon: GraduationCap },
      { key: "missions", labelEn: "Missions", labelAr: "المهمات", Icon: Target },
      { key: "todo", labelEn: "To-Do List", labelAr: "قائمة المهام", Icon: ListChecks },
      { key: "leaderboard", labelEn: "Leaderboard", labelAr: "المتصدرون", Icon: Trophy },
    ],
  },
  {
    titleEn: "Community", titleAr: "المجتمع",
    items: [
      { key: "news", labelEn: "News", labelAr: "الأخبار", Icon: Newspaper },
      { key: "advices", labelEn: "Advices", labelAr: "النصائح", Icon: Lightbulb },
    ],
  },
  {
    titleEn: "Play", titleAr: "العب",
    items: [{ key: "liveBattle", labelEn: "Live Battle", labelAr: "المعركة المباشرة", Icon: Swords }],
  },
  {
    titleEn: "Account", titleAr: "الحساب",
    items: [
      { key: "account", labelEn: "Account Center", labelAr: "مركز الحساب", Icon: UserCog },
      { key: "premium", labelEn: "Premium", labelAr: "بريميوم", Icon: Crown },
    ],
  },
];

const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Subjects: BookOpen,
  Study: Layers,
  Progress: Target,
  Community: Users,
  Play: Swords,
  Account: Settings,
};

const BottomGroupNav = ({
  language, active, onSelect,
}: {
  language: AppLanguage;
  active: MainMenuChoice | null;
  onSelect: (k: MainMenuChoice) => void;
}) => {
  const isRTL = language === "ar";
  const initialGroup =
    NAV_GROUPS.find((g) => g.items.some((it) => it.key === active))?.titleEn ??
    NAV_GROUPS[0].titleEn;
  const [activeGroup, setActiveGroup] = useState<string>(initialGroup);
  useEffect(() => {
    const g = NAV_GROUPS.find((gr) => gr.items.some((it) => it.key === active));
    if (g) setActiveGroup(g.titleEn);
  }, [active]);

  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  useEffect(() => { setPortalRoot(document.body); }, []);

  const currentGroup = NAV_GROUPS.find((g) => g.titleEn === activeGroup) ?? NAV_GROUPS[0];

  const bar = (
    <div
      className="fixed left-0 right-0 z-[100] flex justify-center pointer-events-none px-3"
      style={{
        bottom: 0,
        paddingBottom: `calc(env(safe-area-inset-bottom, 0px) + 0.75rem)`,
        transform: "translateZ(0)",
        WebkitTransform: "translateZ(0)",
        willChange: "transform",
      }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <motion.nav
        initial={{ y: 80, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
        className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-card/85 backdrop-blur-xl shadow-[0_18px_50px_-12px_hsl(var(--primary)/0.25)] p-1.5"
        aria-label="Primary"
      >
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={activeGroup}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18 }}
            className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1.5 mb-1.5 border-b border-border/60"
          >
            <LayoutGroup id={`bgn-subitems-${activeGroup}`}>
              {currentGroup.items.map((it) => {
                const Icon = it.Icon;
                const isActive = active === it.key;
                return (
                  <motion.button
                    key={it.key}
                    whileTap={{ scale: 0.94 }}
                    onClick={() => onSelect(it.key)}
                    className={`relative shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                      isActive ? "text-primary" : "text-foreground/60 hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="bgn-sub-pill"
                        className="absolute inset-0 bg-primary/10 rounded-lg"
                        transition={{ type: "spring", stiffness: 520, damping: 36 }}
                      />
                    )}
                    <span className="relative z-10 inline-flex items-center gap-1.5">
                      <Icon className="w-3.5 h-3.5" />
                      {language === "ar" ? it.labelAr : it.labelEn}
                    </span>
                  </motion.button>
                );
              })}
            </LayoutGroup>
          </motion.div>
        </AnimatePresence>

        <LayoutGroup id="bgn-group-tabs">
          <div className="flex items-stretch gap-1">
            {NAV_GROUPS.map((g) => {
              const Icon = GROUP_ICONS[g.titleEn] ?? Layers;
              const isActive = activeGroup === g.titleEn;
              return (
                <motion.button
                  key={g.titleEn}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => setActiveGroup(g.titleEn)}
                  className={`relative flex-1 h-12 inline-flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors ${
                    isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {isActive && (
                    <motion.span
                      layoutId="bgn-group-pill"
                      className="absolute inset-0 rounded-xl bg-primary shadow-[0_6px_20px_hsl(var(--primary)/0.4)]"
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    />
                  )}
                  <motion.span
                    animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 22 }}
                    className="relative z-10"
                  >
                    <Icon className="w-4 h-4" />
                  </motion.span>
                  <span className="relative z-10 tracking-wide">
                    {language === "ar" ? g.titleAr : g.titleEn}
                  </span>
                </motion.button>
              );
            })}
          </div>
        </LayoutGroup>
      </motion.nav>
    </div>
  );

  return portalRoot ? createPortal(bar, portalRoot) : null;
};

export default BottomGroupNav;