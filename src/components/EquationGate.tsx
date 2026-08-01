import { useMemo, useState } from "react";
import { Calculator, ArrowRight, RefreshCw } from "lucide-react";
import { type AppLanguage } from "@/components/LanguageGate";

export const EQUATION_GATE_STORAGE_KEY = "app_equation_gate_v1";

/** Returns true when the visitor already solved the equation this session. */
export const isEquationSolved = () => {
  if (typeof window === "undefined") return true;
  try {
    return sessionStorage.getItem(EQUATION_GATE_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
};

type Puzzle = { a: number; b: number; c: number; answer: number; text: string };

const makePuzzle = (): Puzzle => {
  const a = Math.floor(Math.random() * 8) + 2; // 2..9
  const answer = Math.floor(Math.random() * 9) + 1; // 1..9
  const b = Math.floor(Math.random() * 15) + 1;
  const c = a * answer + b;
  return { a, b, c, answer, text: `${a}x + ${b} = ${c}` };
};

const copy = {
  en: {
    badge: "Quick check",
    title: "Solve to enter",
    desc: "Find the value of x to continue to the app.",
    placeholder: "x = ?",
    submit: "Enter",
    again: "New equation",
    wrong: "Not quite — try again.",
  },
  ar: {
    badge: "تحقّق سريع",
    title: "حل المعادلة للدخول",
    desc: "أوجد قيمة x للمتابعة إلى التطبيق.",
    placeholder: "x = ؟",
    submit: "دخول",
    again: "معادلة جديدة",
    wrong: "إجابة غير صحيحة — حاول مرة أخرى.",
  },
} as const;

const EquationGate = ({ language = "ar", onSolved }: { language?: AppLanguage; onSolved: () => void }) => {
  const t = copy[language] ?? copy.ar;
  const [seed, setSeed] = useState(0);
  const puzzle = useMemo(() => makePuzzle(), [seed]);
  const [value, setValue] = useState("");
  const [error, setError] = useState(false);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (Number(value.trim()) === puzzle.answer) {
      try {
        sessionStorage.setItem(EQUATION_GATE_STORAGE_KEY, "1");
      } catch { /* ignore */ }
      onSolved();
      return;
    }
    setError(true);
    setValue("");
  };

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-[26rem] h-[26rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[26rem] h-[26rem] rounded-full bg-accent/20 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-8 text-center shadow-lg">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/60 mb-6">
          <Calculator className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-3xl font-bold mb-2 text-foreground">{t.title}</h1>
        <p className="text-sm text-muted-foreground mb-8">{t.desc}</p>

        <div className="text-4xl font-bold gradient-text mb-8" dir="ltr">{puzzle.text}</div>

        <form onSubmit={submit} className="space-y-4">
          <input
            autoFocus
            inputMode="numeric"
            value={value}
            onChange={(e) => { setValue(e.target.value); setError(false); }}
            placeholder={t.placeholder}
            className="w-full h-12 rounded-xl bg-background/60 border border-white/10 px-4 text-center text-lg text-foreground outline-none focus:border-primary transition-colors"
          />
          {error && <p className="text-sm text-destructive">{t.wrong}</p>}
          <button
            type="submit"
            className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
          >
            {t.submit} <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <button
          onClick={() => { setSeed((s) => s + 1); setValue(""); setError(false); }}
          className="mt-5 inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> {t.again}
        </button>
      </section>
    </main>
  );
};

export default EquationGate;
