import { Layers, BookOpenCheck, FileText, GraduationCap, ArrowRight, ArrowLeft, Sparkles, Lock } from "lucide-react";
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    badge: "Welcome",
    title: "Your Study Hub",
    description: "Pick what you want to do today. More tools are on the way.",
    soon: "Coming soon",
    items: {
      flashcards: { title: "Flashcards", subtitle: "Master concepts with smart cards" },
      quizzes: { title: "Quizzes", subtitle: "Test what you've learned" },
      pastPapers: { title: "Past Papers", subtitle: "Practice real exam questions" },
      summaries: { title: "Summaries", subtitle: "Quick chapter overviews" },
    },
  },
  ar: {
    badge: "أهلاً بك",
    title: "منصة الدراسة",
    description: "اختر ما تريد البدء به اليوم. المزيد من الأدوات قريباً.",
    soon: "قريباً",
    items: {
      flashcards: { title: "البطاقات التعليمية", subtitle: "أتقن المفاهيم ببطاقات ذكية" },
      quizzes: { title: "الاختبارات", subtitle: "اختبر ما تعلمته" },
      pastPapers: { title: "الأسئلة الوزارية", subtitle: "تدرّب على أسئلة حقيقية" },
      summaries: { title: "الملخصات", subtitle: "ملخصات سريعة للفصول" },
    },
  },
} as const;

export type MainMenuChoice = "flashcards";

const MainMenu = ({
  language,
  onChangeLanguage,
  onSelect,
}: {
  language: AppLanguage;
  onChangeLanguage: () => void;
  onSelect: (choice: MainMenuChoice) => void;
}) => {
  const text = copy[language];

  const items = [
    { key: "flashcards" as const, Icon: Layers, locked: false, ...text.items.flashcards },
    { key: "quizzes", Icon: BookOpenCheck, locked: true, ...text.items.quizzes },
    { key: "pastPapers", Icon: FileText, locked: true, ...text.items.pastPapers },
    { key: "summaries", Icon: GraduationCap, locked: true, ...text.items.summaries },
  ];

  const handleBack = () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    onChangeLanguage();
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={handleBack}
        aria-label={language === "ar" ? "تغيير اللغة" : "Change language"}
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

      <section className="max-w-5xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 gap-5 z-10 relative">
        {items.map((it, i) => {
          const Icon = it.Icon;
          const available = !it.locked;
          return (
            <button
              key={it.key}
              onClick={() => available && onSelect(it.key as MainMenuChoice)}
              disabled={it.locked}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`group relative text-left rounded-3xl p-6 h-44 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up
                ${available
                  ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                  : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"}`}
            >
              {available && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }}
                />
              )}

              <div className="relative z-10 flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${available ? "bg-primary/15" : "bg-muted/20"}`}>
                  <Icon className={`w-6 h-6 ${available ? "text-primary" : "text-muted-foreground/60"}`} />
                </div>
                {it.locked ? (
                  <Lock className="w-4 h-4 text-muted-foreground/60" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </div>

              <div className="relative z-10 mt-6">
                <h3 className={`text-2xl font-semibold mb-1 ${available ? "text-foreground" : "text-muted-foreground"}`}>
                  {it.title}
                </h3>
                <p className="text-sm text-muted-foreground">{it.locked ? text.soon : it.subtitle}</p>
              </div>

              {available && (
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700"
                  style={{ background: "var(--gradient-primary)" }}
                />
              )}
            </button>
          );
        })}
      </section>
    </main>
  );
};

export default MainMenu;