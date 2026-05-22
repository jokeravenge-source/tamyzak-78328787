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
  | "nord"
  | "zombie";

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

const THEMES: ThemeDef[] = [
  {
    id: "notion-light", name: "Notion Light", arName: "نوشن فاتح", mode: "light",
    swatch: ["#f7f6f3", "#ffffff", "#2383e2"],
    vars: base(
      "40 14% 97%", "30 8% 15%", "0 0% 100%", "30 8% 15%", "30 8% 15%", "0 0% 100%",
      "217 91% 55%", "0 0% 100%", "199 95% 60%",
      "40 10% 94%", "30 8% 20%", "40 10% 94%", "30 5% 45%",
      "30 8% 88%", "217 91% 55%",
      "linear-gradient(180deg, hsl(40 14% 97%), hsl(40 14% 97%))",
      "linear-gradient(135deg, hsl(0 0% 100%), hsl(40 14% 97%))",
      "linear-gradient(135deg, hsl(217 91% 55%), hsl(199 95% 60%))",
      "0 1px 3px hsl(30 8% 15% / 0.06), 0 12px 32px -8px hsl(30 8% 15% / 0.12)",
      "0 0 0 1px hsl(217 91% 55% / 0.25), 0 8px 24px -4px hsl(217 91% 55% / 0.25)",
    ),
  },
  {
    id: "notion-dark", name: "Notion Dark", arName: "نوشن داكن", mode: "dark",
    swatch: ["#1f1f1f", "#2a2a2a", "#5b9dff"],
    vars: base(
      "0 0% 12%", "0 0% 92%", "0 0% 15%", "0 0% 92%", "0 0% 95%", "0 0% 98%",
      "217 91% 62%", "0 0% 100%", "199 95% 65%",
      "0 0% 18%", "0 0% 92%", "0 0% 18%", "0 0% 60%",
      "0 0% 22%", "217 91% 62%",
      "linear-gradient(180deg, hsl(0 0% 12%), hsl(0 0% 10%))",
      "linear-gradient(135deg, hsl(0 0% 18%), hsl(0 0% 13%))",
      "linear-gradient(135deg, hsl(217 91% 28%), hsl(199 95% 22%))",
      "0 1px 3px hsl(0 0% 0% / 0.3), 0 20px 50px -10px hsl(0 0% 0% / 0.5)",
      "0 0 0 1px hsl(217 91% 62% / 0.4), 0 8px 32px -4px hsl(217 91% 62% / 0.45)",
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
    id: "slate", name: "Slate", arName: "إردوازي", mode: "dark",
    swatch: ["#1c2330", "#252e3f", "#3fb6ec"],
    vars: base(
      "215 28% 14%", "210 20% 92%", "215 25% 18%", "210 20% 92%", "210 20% 95%", "0 0% 100%",
      "199 89% 58%", "215 28% 10%", "188 95% 65%",
      "215 22% 22%", "210 20% 92%", "215 22% 22%", "215 15% 65%",
      "215 20% 26%", "199 89% 58%",
      "linear-gradient(180deg, hsl(215 28% 14%), hsl(215 32% 10%))",
      "linear-gradient(135deg, hsl(215 25% 20%), hsl(215 30% 14%))",
      "linear-gradient(135deg, hsl(199 70% 28%), hsl(188 75% 22%))",
      "0 1px 3px hsl(0 0% 0% / 0.4), 0 24px 60px -12px hsl(199 89% 30% / 0.4)",
      "0 0 0 1px hsl(199 89% 58% / 0.4), 0 8px 32px -4px hsl(199 89% 58% / 0.4)",
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
    id: "zombie", name: "Zombie", arName: "زومبي", mode: "dark",
    swatch: ["#1a1f10", "#3b4a1a", "#8bd11e"],
    vars: base(
      "80 30% 8%", "85 60% 70%", "75 25% 12%", "85 60% 70%", "85 80% 65%", "85 80% 65%",
      "82 80% 42%", "80 50% 5%", "60 90% 50%",
      "75 30% 16%", "85 60% 75%", "75 30% 16%", "70 20% 55%",
      "30 50% 25%", "0 80% 45%",
      "linear-gradient(180deg, hsl(80 30% 8%), hsl(30 40% 6%))",
      "linear-gradient(135deg, hsl(75 25% 14%), hsl(30 40% 10%))",
      "linear-gradient(135deg, hsl(82 80% 30%), hsl(0 80% 35%))",
      "0 0 0 1px hsl(0 80% 30% / 0.5), 0 20px 50px -10px hsl(0 80% 20% / 0.7)",
      "0 0 0 2px hsl(82 80% 42% / 0.6), 0 0 30px hsl(60 90% 40% / 0.6)",
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