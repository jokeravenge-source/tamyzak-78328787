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
  | "sepia"
  | "forest"
  | "rose"
  | "midnight"
  | "charcoal-ember"
  | "ocean-deep"
  | "noir-gold"
  | "nord"
  | "obsidian";

type ThemeDef = {
  id: ThemeId;
  name: string;
  arName: string;
  swatch: [string, string, string];
  mode: "light" | "dark";
  vars: Record<string, string>;
};

// Each theme defines the full set of HSL tokens and gradient strings.
const base = (
  background: string,
  foreground: string,
  card: string,
  cardFg: string,
  cardFrontFg: string,
  cardBackFg: string,
  primary: string,
  primaryFg: string,
  primaryGlow: string,
  secondary: string,
  secondaryFg: string,
  muted: string,
  mutedFg: string,
  border: string,
  ring: string,
  gradBg: string,
  gradCardFront: string,
  gradCardBack: string,
  shadowCard: string,
  shadowGlow: string,
): Record<string, string> => ({
  "--background": background,
  "--foreground": foreground,
  "--card": card,
  "--card-foreground": cardFg,
  "--card-front-fg": cardFrontFg,
  "--card-back-fg": cardBackFg,
  "--popover": card,
  "--popover-foreground": cardFg,
  "--primary": primary,
  "--primary-foreground": primaryFg,
  "--primary-glow": primaryGlow,
  "--secondary": secondary,
  "--secondary-foreground": secondaryFg,
  "--muted": muted,
  "--muted-foreground": mutedFg,
  "--accent": primary,
  "--accent-foreground": primaryFg,
  "--destructive": "0 72% 51%",
  "--destructive-foreground": "0 0% 100%",
  "--border": border,
  "--input": border,
  "--ring": ring,
  "--radius": "0.625rem",
  "--gradient-bg": gradBg,
  "--gradient-card-front": gradCardFront,
  "--gradient-card-back": gradCardBack,
  "--gradient-primary": `linear-gradient(135deg, hsl(${primary}), hsl(${primaryGlow}))`,
  "--shadow-card": shadowCard,
  "--shadow-glow": shadowGlow,
});

export const THEMES: ThemeDef[] = [
  {
    id: "notion-light", name: "Notion Light", arName: "نوشن فاتح", mode: "light",
    swatch: ["#fafbfc", "#ffffff", "#3b82f6"],
    vars: base(
      "210 20% 98%", "215 28% 17%", "0 0% 100%", "215 28% 17%", "215 28% 17%", "0 0% 100%",
      "217 91% 60%", "0 0% 100%", "213 94% 68%",
      "210 40% 96%", "215 25% 27%", "213 22% 93%", "215 16% 47%",
      "213 22% 93%", "217 91% 60%",
      "linear-gradient(180deg, hsl(210 20% 98%), hsl(210 20% 98%))",
      "linear-gradient(135deg, hsl(0 0% 100%), hsl(210 20% 98%))",
      "linear-gradient(135deg, hsl(217 91% 60%), hsl(213 94% 68%))",
      "0 1px 2px hsl(215 28% 17% / 0.04), 0 8px 24px -12px hsl(215 28% 17% / 0.12)",
      "0 0 0 1px hsl(217 91% 60% / 0.2), 0 8px 24px -8px hsl(217 91% 60% / 0.25)",
    ),
  },
  {
    id: "sepia", name: "Sepia", arName: "سيبيا", mode: "light",
    swatch: ["#efe6d3", "#faf3e0", "#b35a1c"],
    vars: base(
      "38 38% 94%", "25 30% 18%", "38 50% 97%", "25 30% 18%", "25 30% 18%", "38 50% 97%",
      "22 75% 42%", "38 50% 97%", "30 80% 55%",
      "36 25% 88%", "25 30% 22%", "36 25% 88%", "25 15% 42%",
      "32 20% 82%", "22 75% 42%",
      "linear-gradient(180deg, hsl(38 38% 94%), hsl(36 32% 91%))",
      "linear-gradient(135deg, hsl(38 50% 97%), hsl(36 35% 92%))",
      "linear-gradient(135deg, hsl(22 75% 42%), hsl(30 80% 55%))",
      "0 1px 3px hsl(25 30% 18% / 0.08), 0 12px 32px -8px hsl(25 30% 18% / 0.15)",
      "0 0 0 1px hsl(22 75% 42% / 0.3), 0 8px 24px -4px hsl(22 75% 42% / 0.3)",
    ),
  },
  {
    id: "forest", name: "Forest", arName: "غابة", mode: "light",
    swatch: ["#eaf3ee", "#ffffff", "#1e8a5a"],
    vars: base(
      "150 25% 96%", "155 30% 14%", "0 0% 100%", "155 30% 14%", "155 30% 14%", "0 0% 100%",
      "158 65% 32%", "0 0% 100%", "142 70% 45%",
      "150 20% 92%", "155 30% 18%", "150 20% 92%", "155 12% 42%",
      "150 18% 85%", "158 65% 32%",
      "linear-gradient(180deg, hsl(150 25% 96%), hsl(148 22% 93%))",
      "linear-gradient(135deg, hsl(0 0% 100%), hsl(150 25% 95%))",
      "linear-gradient(135deg, hsl(158 65% 32%), hsl(142 70% 45%))",
      "0 1px 3px hsl(155 30% 14% / 0.08), 0 12px 32px -8px hsl(158 65% 25% / 0.18)",
      "0 0 0 1px hsl(158 65% 32% / 0.3), 0 8px 24px -4px hsl(158 65% 32% / 0.3)",
    ),
  },
  {
    id: "rose", name: "Rose", arName: "وردي", mode: "light",
    swatch: ["#fbe9ee", "#ffffff", "#e1356f"],
    vars: base(
      "350 50% 97%", "340 25% 18%", "0 0% 100%", "340 25% 18%", "340 25% 18%", "0 0% 100%",
      "340 75% 52%", "0 0% 100%", "320 80% 65%",
      "350 40% 93%", "340 25% 22%", "350 40% 93%", "340 12% 45%",
      "350 30% 88%", "340 75% 52%",
      "linear-gradient(180deg, hsl(350 50% 97%), hsl(345 45% 94%))",
      "linear-gradient(135deg, hsl(0 0% 100%), hsl(350 50% 96%))",
      "linear-gradient(135deg, hsl(340 75% 52%), hsl(320 80% 65%))",
      "0 1px 3px hsl(340 25% 18% / 0.08), 0 12px 32px -8px hsl(340 75% 45% / 0.2)",
      "0 0 0 1px hsl(340 75% 52% / 0.3), 0 8px 24px -4px hsl(340 75% 52% / 0.3)",
    ),
  },
  // ───────────── Dark themes ─────────────
  {
    id: "midnight", name: "Midnight Indigo", arName: "إنديغو الليل", mode: "dark",
    swatch: ["#0a0a1a", "#1e1e5a", "#818cf8"],
    vars: base(
      "234 35% 8%", "230 25% 92%", "232 32% 12%", "230 25% 92%", "230 25% 95%", "234 35% 10%",
      "238 84% 67%", "234 35% 8%", "245 90% 75%",
      "232 28% 16%", "230 25% 92%", "232 28% 16%", "230 15% 62%",
      "232 24% 22%", "238 84% 67%",
      "linear-gradient(180deg, hsl(234 35% 8%), hsl(232 38% 6%))",
      "linear-gradient(135deg, hsl(232 32% 14%), hsl(232 35% 9%))",
      "linear-gradient(135deg, hsl(238 84% 50%), hsl(245 90% 60%))",
      "0 1px 3px hsl(232 35% 0% / 0.4), 0 24px 60px -12px hsl(238 84% 30% / 0.45)",
      "0 0 0 1px hsl(238 84% 67% / 0.4), 0 8px 32px -4px hsl(238 84% 67% / 0.45)",
    ),
  },
  {
    id: "charcoal-ember", name: "Charcoal Ember", arName: "فحم وجمر", mode: "dark",
    swatch: ["#1a1a1a", "#2d2d2d", "#e85d3a"],
    vars: base(
      "0 0% 10%", "20 15% 92%", "0 0% 14%", "20 15% 92%", "20 15% 95%", "0 0% 100%",
      "14 80% 56%", "0 0% 8%", "20 90% 62%",
      "0 0% 17%", "20 15% 92%", "0 0% 17%", "20 8% 62%",
      "0 0% 22%", "14 80% 56%",
      "linear-gradient(180deg, hsl(0 0% 10%), hsl(0 0% 7%))",
      "linear-gradient(135deg, hsl(0 0% 16%), hsl(0 0% 11%))",
      "linear-gradient(135deg, hsl(14 80% 42%), hsl(20 90% 48%))",
      "0 1px 3px hsl(0 0% 0% / 0.5), 0 24px 60px -12px hsl(14 80% 25% / 0.4)",
      "0 0 0 1px hsl(14 80% 56% / 0.4), 0 8px 32px -4px hsl(14 80% 56% / 0.45)",
    ),
  },
  {
    id: "ocean-deep", name: "Ocean Deep", arName: "أعماق المحيط", mode: "dark",
    swatch: ["#0c2340", "#1a4a6e", "#5cbdb9"],
    vars: base(
      "212 67% 8%", "195 30% 92%", "210 55% 12%", "195 30% 92%", "195 30% 95%", "210 67% 10%",
      "178 42% 55%", "212 67% 8%", "192 70% 62%",
      "210 45% 18%", "195 30% 92%", "210 45% 18%", "200 18% 65%",
      "210 38% 24%", "178 42% 55%",
      "linear-gradient(180deg, hsl(212 67% 8%), hsl(215 70% 6%))",
      "linear-gradient(135deg, hsl(210 55% 14%), hsl(212 60% 9%))",
      "linear-gradient(135deg, hsl(192 70% 32%), hsl(178 42% 38%))",
      "0 1px 3px hsl(212 67% 0% / 0.5), 0 24px 60px -12px hsl(192 70% 20% / 0.5)",
      "0 0 0 1px hsl(178 42% 55% / 0.4), 0 8px 32px -4px hsl(178 42% 55% / 0.45)",
    ),
  },
  {
    id: "noir-gold", name: "Noir & Gold", arName: "أسود وذهبي", mode: "dark",
    swatch: ["#0d0d0d", "#1a1a1a", "#c9a84c"],
    vars: base(
      "0 0% 6%", "45 25% 92%", "0 0% 10%", "45 25% 92%", "45 30% 95%", "0 0% 100%",
      "43 58% 54%", "0 0% 6%", "45 78% 65%",
      "0 0% 14%", "45 25% 92%", "0 0% 14%", "40 12% 62%",
      "0 0% 20%", "43 58% 54%",
      "linear-gradient(180deg, hsl(0 0% 6%), hsl(0 0% 4%))",
      "linear-gradient(135deg, hsl(0 0% 12%), hsl(0 0% 8%))",
      "linear-gradient(135deg, hsl(43 58% 42%), hsl(45 78% 52%))",
      "0 1px 3px hsl(0 0% 0% / 0.6), 0 24px 60px -12px hsl(43 58% 20% / 0.4)",
      "0 0 0 1px hsl(43 58% 54% / 0.4), 0 8px 32px -4px hsl(45 78% 50% / 0.4)",
    ),
  },
  {
    id: "nord", name: "Nord", arName: "نورد", mode: "dark",
    swatch: ["#2e3440", "#3b4252", "#88c0d0"],
    vars: base(
      "220 16% 22%", "218 27% 92%", "222 16% 26%", "218 27% 92%", "218 27% 94%", "0 0% 100%",
      "193 43% 67%", "220 16% 18%", "210 34% 63%",
      "220 16% 30%", "218 27% 92%", "220 16% 30%", "218 16% 70%",
      "220 14% 34%", "193 43% 67%",
      "linear-gradient(180deg, hsl(220 16% 22%), hsl(220 18% 18%))",
      "linear-gradient(135deg, hsl(222 16% 28%), hsl(220 18% 22%))",
      "linear-gradient(135deg, hsl(193 43% 40%), hsl(210 34% 38%))",
      "0 1px 3px hsl(0 0% 0% / 0.4), 0 24px 60px -12px hsl(220 18% 8% / 0.6)",
      "0 0 0 1px hsl(193 43% 67% / 0.4), 0 8px 32px -4px hsl(193 43% 67% / 0.4)",
    ),
  },
  {
    id: "obsidian", name: "Obsidian", arName: "أوبسيديان", mode: "dark",
    swatch: ["#0f172a", "#1e293b", "#60a5fa"],
    vars: base(
      "222 47% 8%", "210 30% 94%", "222 40% 12%", "210 30% 94%", "210 30% 96%", "222 47% 10%",
      "213 94% 68%", "222 47% 8%", "199 95% 72%",
      "222 32% 17%", "210 30% 94%", "222 32% 17%", "215 16% 65%",
      "222 28% 23%", "213 94% 68%",
      "linear-gradient(180deg, hsl(222 47% 8%), hsl(222 50% 6%))",
      "linear-gradient(135deg, hsl(222 40% 14%), hsl(222 45% 9%))",
      "linear-gradient(135deg, hsl(213 94% 50%), hsl(199 95% 55%))",
      "0 1px 3px hsl(222 47% 0% / 0.5), 0 24px 60px -12px hsl(213 94% 25% / 0.4)",
      "0 0 0 1px hsl(213 94% 68% / 0.4), 0 8px 32px -4px hsl(213 94% 68% / 0.45)",
    ),
  },
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
  const varDecls = Object.entries(def.vars)
    .map(([k, v]) => `  ${k}: ${v} !important;`)
    .join("\n");
  // Inject as a stylesheet targeting :root, html and body — wins over any
  // class-based rule and survives preview wrappers stripping classes.
  tag.textContent = `:root, html, body {\n  color-scheme: ${def.mode};\n${varDecls}\n}\nbody { background: var(--gradient-bg) !important; background-attachment: fixed !important; }\n`;
  // Also keep the tailwind `dark:` variant working by toggling .dark on both html and body.
  for (const el of [document.documentElement, document.body]) {
    if (!el) continue;
    if (def.mode === "dark") el.classList.add("dark");
    else el.classList.remove("dark");
  }
}

export function getInitialTheme(): ThemeId {
  if (typeof window === "undefined") return "notion-light";
  // One-time migration: the redesigned UI is locked to a light Cloud White palette,
  // so any previously stored dark theme is reset on load.
  const MIGRATION_FLAG = "app_theme_migration_v2_cloudwhite";
  if (!localStorage.getItem(MIGRATION_FLAG)) {
    localStorage.removeItem(THEME_STORAGE_KEY);
    localStorage.setItem(MIGRATION_FLAG, "1");
  }
  const stored = localStorage.getItem(THEME_STORAGE_KEY) as ThemeId | null;
  if (stored && THEMES.some((t) => t.id === stored)) return stored;
  return "notion-light";
}

export const ThemePicker = ({ language = "en", variant = "floating" }: { language?: "en" | "ar"; variant?: "floating" | "inline" }) => {
  const [theme, setTheme] = useState<ThemeId>(() => getInitialTheme());

  useEffect(() => {
    applyTheme(theme);
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const current = THEMES.find((t) => t.id === theme)!;
  const isDark = current.mode === "dark";

  const toggleLightDark = () => {
    setTheme(isDark ? "notion-light" : "obsidian");
  };

  const lightThemes = THEMES.filter((t) => t.mode === "light");
  const darkThemes = THEMES.filter((t) => t.mode === "dark");

  const renderThemeButton = (t: ThemeDef) => {
    const active = t.id === theme;
    return (
      <button
        key={t.id}
        onClick={() => setTheme(t.id)}
        className={`group relative flex flex-col gap-2 p-2.5 rounded-xl border text-left transition-all ${
          active
            ? "border-primary bg-primary/5 shadow-[0_0_0_1px_hsl(var(--primary))]"
            : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
        }`}
      >
        <div
          className="h-10 rounded-lg overflow-hidden flex"
          style={{ background: t.swatch[0] }}
        >
          <div className="flex-1" style={{ background: t.swatch[1] }} />
          <div className="w-1/3" style={{ background: t.swatch[2] }} />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-semibold truncate">
            {language === "ar" ? t.arName : t.name}
          </span>
          {active && <Check className="w-3.5 h-3.5 text-primary shrink-0" />}
        </div>
      </button>
    );
  };

  const themeGrid = (
    <div className="space-y-3">
      <div>
        <p className="px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1.5">
          <Sun className="w-3 h-3" /> {language === "ar" ? "فاتح" : "Light"}
        </p>
        <div className="grid grid-cols-2 gap-2">{lightThemes.map(renderThemeButton)}</div>
      </div>
      <div>
        <p className="px-1 mb-2 text-[10px] uppercase tracking-wider text-muted-foreground font-semibold inline-flex items-center gap-1.5">
          <Moon className="w-3 h-3" /> {language === "ar" ? "داكن" : "Dark"}
        </p>
        <div className="grid grid-cols-2 gap-2">{darkThemes.map(renderThemeButton)}</div>
      </div>
    </div>
  );

  if (variant === "inline") {
    return (
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            {language === "ar" ? "الوضع" : "Mode"}
          </span>
          <button
            onClick={toggleLightDark}
            aria-label={isDark ? "Switch to light" : "Switch to dark"}
            className="w-10 h-10 rounded-full border border-border bg-card text-foreground shadow-sm hover:bg-secondary transition-colors flex items-center justify-center"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
        <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">
          {language === "ar" ? "اختر الثيم" : "Choose theme"}
        </div>
        {themeGrid}
      </div>
    );
  }

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
          className="w-80 p-3 bg-popover text-popover-foreground border-border max-h-[70vh] overflow-y-auto"
        >
          <div className="px-2 py-1.5 text-xs uppercase tracking-wider text-muted-foreground">
            {language === "ar" ? "اختر الثيم" : "Choose theme"}
          </div>
          {themeGrid}
        </PopoverContent>
      </Popover>
    </div>
  );
};