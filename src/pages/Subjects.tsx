import { Lock, ArrowLeft, ArrowRight, Sparkles, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, RefreshCw, Moon } from "lucide-react";
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from "@/components/LanguageGate";

export const SUBJECT_STORAGE_KEY = "app_subject_v1";
export const PREVIOUS_SUBJECT_STORAGE_KEY = "app_previous_subject_v1";
const FOCUS_SUBJECT_PICKED_KEY = "app_focus_subject_picked_v1";

export type AppSubject = "physics" | "english" | "chemistry" | "biology" | "french" | "arabic" | "islamic" | "revision";

const subjectTelegramLinks: Record<AppSubject, string | null> = {
  physics: "https://t.me/sad6ths/17274",
  chemistry: "https://t.me/sad6ths/17140",
  biology: "https://t.me/sad6ths/14821",
  arabic: "https://t.me/sad6ths/16594",
  french: "https://t.me/sad6ths/14196",
  english: null,
  islamic: null,
  revision: "https://t.me/sad6ths/17466",
};

const subjects: Array<{
  code: AppSubject;
  en: string;
  ar: string;
  Icon: React.ComponentType<{ className?: string }>;
  locked: boolean;
}> = [
  { code: "physics", en: "Physics", ar: "الفيزياء", Icon: Atom, locked: false },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء", Icon: FlaskConical, locked: false },
  { code: "biology", en: "Biology", ar: "الأحياء", Icon: Leaf, locked: false },
  { code: "english", en: "English", ar: "الإنجليزية", Icon: BookOpen, locked: false },
  { code: "french", en: "French", ar: "الفرنسية", Icon: LangIcon, locked: false },
  { code: "arabic", en: "Arabic", ar: "العربية", Icon: BookOpen, locked: false },
  { code: "islamic", en: "Islamic", ar: "التربية الإسلامية", Icon: Moon, locked: false },
];

const revisionSubject = { code: "revision" as AppSubject, en: "Revision", ar: "المراجعة", Icon: RefreshCw, locked: false };

const copy = {
  en: {
    badge: "Choose Subject",
    title: "Pick a Subject",
    description: "Select the subject you want to study. More subjects coming soon.",
    soon: "Coming soon",
  },
  ar: {
    badge: "اختر المادة",
    title: "اختر المادة",
    description: "اختر المادة التي تريد دراستها. المزيد من المواد قريباً.",
    soon: "قريباً",
  },
};

const Subjects = ({
  language,
  onChangeLanguage,
  onSelectSubject,
  mode = "flashcards",
}: {
  language: AppLanguage;
  onChangeLanguage: () => void;
  onSelectSubject: (subject: AppSubject) => void;
  mode?: "flashcards" | "malazam";
}) => {
  const text = copy[language];
  // If the user has locked a focus subject, only show that one — hide all others everywhere.
  const focusPicked = typeof window !== "undefined" && localStorage.getItem(FOCUS_SUBJECT_PICKED_KEY) === "1";
  const focusSubject = typeof window !== "undefined" ? (localStorage.getItem(SUBJECT_STORAGE_KEY) as AppSubject | null) : null;
  const baseList = mode === "malazam" ? [...subjects, revisionSubject] : subjects;
  const displayedSubjects = focusPicked && focusSubject
    ? baseList.filter((s) => s.code === focusSubject)
    : baseList;

  const handleChangeLanguage = () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    localStorage.removeItem(SUBJECT_STORAGE_KEY);
    onChangeLanguage();
  };

  const handleClick = (s: typeof subjects[number]) => {
    if (s.locked) return;
    if (mode === "malazam") {
      const link = subjectTelegramLinks[s.code];
      if (link) window.open(link, "_blank", "noopener,noreferrer");
      return;
    }
    const previousSubject = localStorage.getItem(SUBJECT_STORAGE_KEY) as AppSubject | null;
    if (previousSubject && previousSubject !== s.code) {
      localStorage.setItem(PREVIOUS_SUBJECT_STORAGE_KEY, previousSubject);
    }
    localStorage.setItem(SUBJECT_STORAGE_KEY, s.code);
    onSelectSubject(s.code);
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={handleChangeLanguage}
        aria-label={language === "ar" ? "تغيير اللغة" : "Change language"}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300 animate-fade-up"
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

      <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative">
        {displayedSubjects.map((s, i) => {
          const Icon = s.Icon;
          const isAvailable = !s.locked;
          return (
            <button
              key={s.code}
              onClick={() => handleClick(s)}
              disabled={s.locked}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`group relative text-left rounded-3xl p-6 h-44 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up
                ${isAvailable
                  ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                  : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"}`}
            >
              {isAvailable && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }}
                />
              )}

              <div className="relative z-10 flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${isAvailable ? "bg-primary/15" : "bg-muted/20"}`}>
                  <Icon className={`w-6 h-6 ${isAvailable ? "text-primary" : "text-muted-foreground/60"}`} />
                </div>
                {s.locked ? (
                  <Lock className="w-4 h-4 text-muted-foreground/60" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </div>

              <div className="relative z-10 mt-6">
                <h3 className={`text-2xl font-semibold mb-1 ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                  {language === "ar" ? s.ar : s.en}
                </h3>
                {s.locked && <p className="text-xs text-muted-foreground">{text.soon}</p>}
              </div>

              {isAvailable && (
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

export default Subjects;
