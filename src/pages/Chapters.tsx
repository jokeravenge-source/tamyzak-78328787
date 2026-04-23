import { useNavigate } from "react-router-dom";
import { Lock, ArrowLeft, ArrowRight, Sparkles } from "lucide-react";
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from "@/components/LanguageGate";

const chapters = [
  { n: 1, title: "Capacitors", arTitle: "المتسعات", subtitle: "", locked: false },
  { n: 2, title: "Electromagnetic Induction", arTitle: "الحث الكهرومغناطيسي", subtitle: "", locked: false },
  { n: 3, title: "Alternating Current", arTitle: "التيار المتناوب", subtitle: "", locked: false },
  { n: 4, title: "Electromagnetic Waves", arTitle: "الموجات الكهرومغناطيسية", subtitle: "", locked: false },
  { n: 5, title: "Physical Optics", arTitle: "البصريات الفيزيائية", subtitle: "", locked: false },
  { n: 6, title: "Modern Physics", arTitle: "الفيزياء الحديثة", subtitle: "", locked: false },
  { n: 7, title: "Solid State Electronics", arTitle: "إلكترونيات الحالة الصلبة", subtitle: "", locked: false },
  { n: 8, title: "Atomic Spectra and Laser", arTitle: "الأطياف الذرية والليزر", subtitle: "", locked: false },
];

const copy = {
  en: {
    badge: "HYDAAR DIWAAN",
    title: "Choose a Chapter",
    description: "Eight chapters of physics, distilled into beautiful flashcards. Start with what you need.",
  },
  ar: {
    badge: "حيدر ديوان",
    title: "اختر الفصل",
    description: "ثمانية فصول في الفيزياء، مختصرة في بطاقات تعليمية جميلة. ابدأ بما تحتاجه.",
  },
};

const Chapters = ({ language, onChangeLanguage }: { language: AppLanguage; onChangeLanguage: () => void }) => {
  const navigate = useNavigate();
  const text = copy[language];

  const handleChangeLanguage = () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    onChangeLanguage();
  };

  const handleClick = (chapter: typeof chapters[number]) => {
    if (!chapter.locked) navigate(`/flashcards/${chapter.n}`);
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-float" style={{ animationDelay: "4s" }} />

      <button
        onClick={handleChangeLanguage}
        aria-label={language === "ar" ? "تغيير اللغة" : "Change language"}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 hover:-translate-x-0.5 transition-all duration-300 animate-fade-up"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{text.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">
          {text.title}
        </h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">
          {text.description}
        </p>
      </header>

      <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 z-10 relative">
        {chapters.map((c, i) => {
          const isAvailable = !c.locked;
          return (
            <button
              key={c.n}
              onClick={() => handleClick(c)}
              disabled={c.locked}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`group relative text-left rounded-3xl p-6 h-56 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up
                ${isAvailable
                  ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                  : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"}`}
            >
              {/* Gradient sheen for available */}
              {isAvailable && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }}
                />
              )}

              {/* Number */}
              <div className="relative z-10 flex items-start justify-between">
                <span
                  className={`text-6xl font-bold font-mono leading-none ${
                    isAvailable ? "gradient-text" : "text-muted-foreground/40"
                  }`}
                >
                  {String(c.n).padStart(2, "0")}
                </span>
                {c.locked ? (
                  <Lock className="w-4 h-4 text-muted-foreground/60" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </div>

              {/* Title */}
              <div className="relative z-10 absolute bottom-6 left-6 right-6">
                <h3 className={`text-lg font-semibold mb-1 ${language === "ar" ? "text-center" : ""} ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                  {language === "ar" ? c.arTitle : c.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{c.subtitle}</p>
              </div>

              {/* Bottom border accent */}
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

      <footer className="text-center mt-16 text-xs text-muted-foreground tracking-widest z-10 relative">
        {"\n"}
      </footer>
    </main>
  );
};

export default Chapters;
