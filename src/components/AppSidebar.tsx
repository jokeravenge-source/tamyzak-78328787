import { useState } from "react";
import {
  Home, BookOpen, Palette, Video, ChevronLeft, ChevronRight,
} from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

export type SidebarKey = "basics" | "notes" | "canvas" | "videoNotes";

const AppSidebar = ({
  language, active, onSelect,
}: {
  language: AppLanguage;
  active: SidebarKey | null;
  onSelect: (k: SidebarKey) => void;
}) => {
  const [open, setOpen] = useState<boolean>(false);
  const isRTL = language === "ar";
  // English → menu on the right; Arabic → menu on the left.
  const side: "left" | "right" = isRTL ? "left" : "right";

  const items: { key: SidebarKey; icon: any; labelEn: string; labelAr: string }[] = [
    { key: "basics",     icon: Home,     labelEn: "Home",            labelAr: "الرئيسية" },
    { key: "notes",      icon: BookOpen, labelEn: "Notes",           labelAr: "ملاحظاتي" },
    { key: "canvas",     icon: Palette,  labelEn: "Canvas",          labelAr: "اللوحة" },
    { key: "videoNotes", icon: Video,    labelEn: "Video to Notes",  labelAr: "من الفيديو إلى ملاحظات" },
  ];

  return (
    <aside
      className={`fixed top-1/2 -translate-y-1/2 ${side === "left" ? "left-1 sm:left-2" : "right-1 sm:right-2"} z-40 flex flex-col rounded-2xl border border-border bg-card/90 backdrop-blur-md shadow-lg transition-[width] duration-200 ${
        open ? "w-40 sm:w-44" : "w-11 sm:w-12"
      }`}
      dir="ltr"
    >
      <button
        onClick={() => setOpen(v => !v)}
        className={`${side === "left" ? "self-end" : "self-start"} m-1 w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground`}
        aria-label={open ? (isRTL ? "طي" : "Collapse") : (isRTL ? "فتح" : "Expand")}
      >
        {open
          ? (side === "left" ? <ChevronLeft className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />)
          : (side === "left" ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />)}
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