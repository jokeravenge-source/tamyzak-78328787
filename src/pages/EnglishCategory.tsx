import { ArrowLeft, ArrowRight, BookOpen, FileText, Sparkles, Type } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

export const ENGLISH_CATEGORY_STORAGE_KEY = "app_english_category_v1";
export type EnglishCategory = "grammar" | "literature" | "paragraphs";

const items: Array<{ code: EnglishCategory; en: string; ar: string; Icon: React.ComponentType<{ className?: string }> }> = [
  { code: "grammar", en: "Grammar", ar: "القواعد", Icon: Type },
  { code: "literature", en: "Literature", ar: "الأدب", Icon: BookOpen },
  { code: "paragraphs", en: "Paragraphs", ar: "الفقرات", Icon: FileText },
];

const copy = {
  en: { badge: "English", title: "Choose a Section", description: "Pick which part of English you want to study." },
  ar: { badge: "الإنجليزية", title: "اختر القسم", description: "اختر الجزء الذي تريد دراسته من اللغة الإنجليزية." },
};

const EnglishCategory = ({
  language,
  onBack,
  onSelect,
}: {
  language: AppLanguage;
  onBack: () => void;
  onSelect: (c: EnglishCategory) => void;
}) => {
  const text = copy[language];
  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onBack}
        aria-label="Back"
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{text.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">{text.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{text.description}</p>
      </header>

      <section className="max-w-5xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative">
        {items.map((s, i) => {
          const Icon = s.Icon;
          return (
            <button
              key={s.code}
              onClick={() => onSelect(s.code)}
              style={{ animationDelay: `${i * 70}ms` }}
              className="group relative text-left rounded-3xl p-6 h-44 border border-primary/40 bg-secondary/40 backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="relative z-10 mt-6">
                <h3 className="text-2xl font-semibold text-foreground">{language === "ar" ? s.ar : s.en}</h3>
              </div>
              <div className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700" style={{ background: "var(--gradient-primary)" }} />
            </button>
          );
        })}
      </section>
    </main>
  );
};

export default EnglishCategory;