import { useState } from "react";
import { ArrowLeft, ArrowRight, Lock, Sparkles, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, ScrollText } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECTS_ORDER, getChaptersForSubject, type BankSubject } from "@/data/subjectChapters";

const subjectIcons: Record<BankSubject, React.ComponentType<{ className?: string }>> = {
  physics: Atom,
  chemistry: FlaskConical,
  biology: Leaf,
  english: BookOpen,
  french: LangIcon,
  arabic: BookOpen,
};

const copy = {
  en: {
    badge: "Ministerial Questions Bank",
    title: "Ministerial Questions Bank",
    description: "Browse past ministerial questions by subject and chapter.",
    chooseChapter: "Choose a Chapter",
    soon: "Questions coming soon",
    soonBody: "Ministerial questions for this chapter will appear here.",
  },
  ar: {
    badge: "بنك الوزاريات",
    title: "بنك الوزاريات",
    description: "تصفّح الأسئلة الوزارية السابقة حسب المادة والفصل.",
    chooseChapter: "اختر الفصل",
    soon: "الأسئلة قريباً",
    soonBody: "ستظهر الأسئلة الوزارية لهذا الفصل هنا.",
  },
} as const;

const MinisterialBank = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [subject, setSubject] = useState<BankSubject | null>(null);
  const [chapterN, setChapterN] = useState<number | null>(null);

  const back = () => {
    if (chapterN !== null) setChapterN(null);
    else if (subject) setSubject(null);
    else onBack();
  };

  const chapters = subject ? getChaptersForSubject(subject) : [];
  const subjectMeta = SUBJECTS_ORDER.find((s) => s.code === subject);

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={back}
        aria-label="Back"
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">
          {subject ? (language === "ar" ? subjectMeta?.ar : subjectMeta?.en) : t.title}
        </h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">
          {subject ? t.chooseChapter : t.description}
        </p>
      </header>

      {!subject ? (
        <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative">
          {SUBJECTS_ORDER.map((s, i) => {
            const Icon = subjectIcons[s.code];
            return (
              <button
                key={s.code}
                onClick={() => setSubject(s.code)}
                style={{ animationDelay: `${i * 70}ms` }}
                className="group relative text-left rounded-3xl p-6 h-44 border border-primary/40 bg-secondary/40 backdrop-blur overflow-hidden cursor-pointer shadow-lg hover:-translate-y-2 hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all duration-500 animate-fade-up"
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
              </button>
            );
          })}
        </section>
      ) : chapterN === null ? (
        <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 z-10 relative">
          {chapters.map((c, i) => {
            const isAvailable = !c.locked;
            return (
              <button
                key={c.n}
                onClick={() => isAvailable && setChapterN(c.n)}
                disabled={c.locked}
                style={{ animationDelay: `${i * 70}ms` }}
                className={`group relative text-left rounded-3xl p-6 h-56 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up ${
                  isAvailable
                    ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                    : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"
                }`}
              >
                {isAvailable && (
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
                )}
                <div className="relative z-10 flex items-start justify-between">
                  <span className={`text-6xl font-bold font-mono leading-none ${isAvailable ? "gradient-text" : "text-muted-foreground/40"}`}>
                    {String(c.n).padStart(2, "0")}
                  </span>
                  {c.locked ? (
                    <Lock className="w-4 h-4 text-muted-foreground/60" />
                  ) : (
                    <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                  )}
                </div>
                <div className="relative z-10 absolute bottom-6 left-6 right-6">
                  <h3 className={`text-lg font-semibold ${language === "ar" ? "text-center" : ""} ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                    {language === "ar" ? c.arTitle : c.title}
                  </h3>
                </div>
              </button>
            );
          })}
        </section>
      ) : (
        <section className="max-w-3xl mx-auto mt-14 md:mt-20 z-10 relative animate-fade-up">
          <div className="rounded-3xl p-10 border border-primary/40 bg-secondary/40 backdrop-blur text-center">
            <div className="w-16 h-16 rounded-2xl mx-auto mb-5 flex items-center justify-center bg-primary/15">
              <ScrollText className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold text-foreground mb-2">{t.soon}</h3>
            <p className="text-muted-foreground">{t.soonBody}</p>
          </div>
        </section>
      )}
    </main>
  );
};

export default MinisterialBank;