import { useState } from "react";
import {
  Home, BookOpen, Palette, Target, ListChecks, FileText, User,
  MoreHorizontal, ChevronLeft, ChevronRight, Trophy, Newspaper,
} from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

export type SidebarKey =
  | "basics" | "notes" | "canvas" | "missions" | "todo"
  | "report" | "leaderboard" | "news" | "account" | "more";

const AppSidebar = ({
  language, active, onSelect,
}: {
  language: AppLanguage;
  active: SidebarKey | null;
  onSelect: (k: SidebarKey) => void;
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const isRTL = language === "ar";

  const items: { key: SidebarKey; icon: any; labelEn: string; labelAr: string }[] = [
    { key: "basics",      icon: Home,        labelEn: "Home",        labelAr: "الرئيسية" },
    { key: "notes",       icon: BookOpen,    labelEn: "Notes",       labelAr: "ملاحظاتي" },
    { key: "canvas",      icon: Palette,     labelEn: "Canvas",      labelAr: "اللوحة" },
    { key: "missions",    icon: Target,      labelEn: "Missions",    labelAr: "المهام" },
    { key: "todo",        icon: ListChecks,  labelEn: "To-do",       labelAr: "المهام اليومية" },
    { key: "report",      icon: FileText,    labelEn: "Report",      labelAr: "التقرير" },
    { key: "leaderboard", icon: Trophy,      labelEn: "Leaderboard", labelAr: "المتصدرين" },
    { key: "news",        icon: Newspaper,   labelEn: "News",        labelAr: "الأخبار" },
    { key: "account",     icon: User,        labelEn: "Account",     labelAr: "الحساب" },
    { key: "more",        icon: MoreHorizontal, labelEn: "More",     labelAr: "المزيد" },
  ];

  const sideClass = isRTL ? "right-2" : "left-2";

  return (
    <aside
      className={`fixed top-1/2 -translate-y-1/2 ${sideClass} z-40 hidden md:flex flex-col rounded-2xl border border-border bg-card/90 backdrop-blur-md shadow-lg transition-[width] duration-200 ${
        open ? "w-44" : "w-12"
      }`}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <button
        onClick={() => setOpen(v => !v)}
        className="self-end m-1 w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
        aria-label={open ? (isRTL ? "طي" : "Collapse") : (isRTL ? "فتح" : "Expand")}
      >
        {open
          ? (isRTL ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)
          : (isRTL ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)}
      </button>
      <nav className="flex flex-col gap-1 p-1.5 pt-0">
        {items.map(({ key, icon: Icon, labelEn, labelAr }) => {
          const label = isRTL ? labelAr : labelEn;
          const isActive = active === key;
          return (
            <button
              key={key}
              onClick={() => onSelect(key)}
              title={label}
              className={`h-9 rounded-lg flex items-center ${open ? "justify-start gap-2 px-2" : "justify-center"} transition-colors ${
                isActive ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80"
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              {open && <span className="text-xs truncate">{label}</span>}
            </button>
          );
        })}
      </nav>
    </aside>
  );
};

export default AppSidebar;