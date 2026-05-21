import { useEffect, useState } from "react";
import { Check, Palette, Moon, Sun } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

export const THEME_STORAGE_KEY = "app_theme_v1";

export type ThemeId =
  | "notion-light"
  | "notion-dark"
  | "sepia"
  | "slate"
  | "forest"
  | "rose"
  | "nord";

type ThemeDef = {
  id: ThemeId;
  name: string;
  arName: string;
  swatch: [string, string, string];
  mode: "light" | "dark";
};

const THEMES: ThemeDef[] = [
  { id: "notion-light", name: "Notion Light", arName: "نوشن فاتح", swatch: ["#f7f6f3", "#ffffff", "#2383e2"], mode: "light" },
  { id: "notion-dark", name: "Notion Dark", arName: "نوشن داكن", swatch: ["#1f1f1f", "#2a2a2a", "#5b9dff"], mode: "dark" },
  { id: "sepia", name: "Sepia", arName: "سيبيا", swatch: ["#efe6d3", "#faf3e0", "#b35a1c"], mode: "light" },
  { id: "slate", name: "Slate", arName: "إردوازي", swatch: ["#1c2330", "#252e3f", "#3fb6ec"], mode: "dark" },
  { id: "forest", name: "Forest", arName: "غابة", swatch: ["#eaf3ee", "#ffffff", "#1e8a5a"], mode: "light" },
  { id: "rose", name: "Rose", arName: "وردي", swatch: ["#fbe9ee", "#ffffff", "#e1356f"], mode: "light" },
  { id: "nord", name: "Nord", arName: "نورد", swatch: ["#2e3440", "#3b4252", "#88c0d0"], mode: "dark" },
];

const STYLE_TAG_ID = "app-theme-vars";

function ensureStyleTag(): HTMLStyleElement {
  let tag = document.getElementById(STYLE_TAG_ID) as HTMLStyleElement | null;
  if (!tag) {
    tag = document.createElement("style");
    tag.id = STYLE_TAG_ID;
    document.head.appendChild(tag);
  }
  return tag;
}

export function applyTheme(id: ThemeId) {
  const def = THEMES.find((t) => t.id === id);
  if (!def) return;
  const tag = ensureStyleTag();
  // Re-declare the chosen theme as :root vars with !important to win over any base CSS.
  // We read the existing theme class CSS from index.css by name.
  tag.textContent = `:root, html, body { color-scheme: ${def.mode}; }
html.theme-active, body.theme-active { }
:root { --__theme: "${id}"; }
body { background: var(--gradient-bg) !important; }
html, body { background-color: hsl(var(--background)) !important; }
`;
  // Set the theme class on both <html> and <body>; some preview wrappers
  // may strip one but not both. Re-applied on every call.
  const allClasses = THEMES.map((t) => `theme-${t.id}`);
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue;
    el.classList.remove(...allClasses, "dark");
    el.classList.add(`theme-${id}`);
    if (def.mode === "dark") el.classList.add("dark");
  }
}

export function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "notion-light";
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (stored && THEMES.some((t) => t.id === stored)) return stored;
  const prefersDark = window.matchMedia?.("(prefers-color-scheme: dark)").matches;
  return prefersDark ? "notion-dark" : "notion-light";
}

export const ThemePicker = ({ language = "en" }: { language?: "en" | "ar" }) => {
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const current = THEMES.find((t) => t.id === theme)!;
  const isDark = current.mode === "dark";

  const toggleLightDark = () => {
    setTheme(isDark ? "notion-light" : "notion-dark");
  };

  return (
    <div className="fixed bottom-5 right-5 z-50 flex items-center gap-2" dir="ltr">
      <button
        onClick={toggleLightDark}
        aria-label={isDark ? "Switch to light" : "Switch to dark"}
        className="w-10 h-10 rounded-full border border-border bg-card text-foreground shadow-md hover:bg-secondary transition-colors flex items-center justify-center"
      >
        {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
      </button>

      <Popover>
        <PopoverTrigger asChild>
          <button
            aria-label="Change theme"
            className="h-10 px-3 rounded-full border border-border bg-card text-foreground shadow-md hover:bg-secondary transition-colors flex items-center gap-2 text-sm"
          >
            <Palette className="w-4 h-4" />
            <span className="hidden sm:inline">{language === "ar" ? "الثيم" : "Theme"}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          side="top"
          className="w-72 p-2 bg-popover text-popover-foreground border-border"
        >
          <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            {language === "ar" ? "اختر الثيم" : "Choose theme"}
          </div>
          <div className="grid gap-1">
            {THEMES.map((t) => {
              const active = t.id === theme;
              return (
                <button
                  key={t.id}
                  onClick={() => setTheme(t.id)}
                  className={`flex items-center justify-between gap-3 px-2 py-2 rounded-md text-left transition-colors ${
                    active ? "bg-secondary" : "hover:bg-secondary/60"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="flex -space-x-1.5">
                      {t.swatch.map((c, i) => (
                        <span
                          key={i}
                          className="w-4 h-4 rounded-full border border-border"
                          style={{ background: c }}
                        />
                      ))}
                    </div>
                    <span className="text-sm font-medium">
                      {language === "ar" ? t.arName : t.name}
                    </span>
                  </div>
                  {active && <Check className="w-4 h-4 text-primary" />}
                </button>
              );
            })}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};