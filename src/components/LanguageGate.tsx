import { Languages, ArrowRight, Sparkles } from "lucide-react";

export type AppLanguage = "ar" | "en";

export const LANGUAGE_STORAGE_KEY = "app_language_v1";

const options: Array<{
  code: AppLanguage;
  title: string;
  subtitle: string;
  label: string;
}> = [
  { code: "ar", title: "العربية", subtitle: "واجهة عربية للبطاقات والفصول", label: "Arabic" },
  { code: "en", title: "English", subtitle: "English interface for chapters and flashcards", label: "English" },
];

export const LanguageGate = ({ onSelect }: { onSelect: (language: AppLanguage) => void }) => {
  const chooseLanguage = (language: AppLanguage) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
    onSelect(language);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-8 md:p-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-background/40 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Choose Language</span>
        </div>

        <h1 className="text-3xl md:text-5xl font-bold gradient-text leading-tight mb-3">
          اختر اللغة / Choose your language
        </h1>
        <p className="text-muted-foreground mb-8">
          Select the language you want to use before entering the flashcards.
        </p>

        <div className="grid gap-4 sm:grid-cols-2">
          {options.map((option) => (
            <button
              key={option.code}
              onClick={() => chooseLanguage(option.code)}
              className="group min-h-44 text-left rounded-3xl p-6 border border-primary/40 bg-background/40 hover:-translate-y-1 hover:border-primary hover:bg-background/60 transition-all duration-300"
              dir={option.code === "ar" ? "rtl" : "ltr"}
            >
              <div className="flex items-start justify-between gap-4 mb-8">
                <div className="w-11 h-11 rounded-full bg-primary/15 flex items-center justify-center">
                  <Languages className="w-5 h-5 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">{option.title}</h2>
              <p className="text-sm text-muted-foreground">{option.subtitle}</p>
            </button>
          ))}
        </div>
      </section>
    </main>
  );
};