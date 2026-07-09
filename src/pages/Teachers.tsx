import { ArrowLeft, GraduationCap } from "lucide-react";
import { motion } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import ahmedAsset from "@/assets/teachers/ahmed-nadawi.jpg.asset.json";

const t = {
  en: {
    title: "Our Teachers",
    desc: "Meet the instructors behind Tamayzak.",
    back: "Back",
    role: "Instructor",
  },
  ar: {
    title: "مدرسينا",
    desc: "تعرّف على المدرسين المميّزين في تميّزك.",
    back: "رجوع",
    role: "مدرّس",
  },
} as const;

const teachers = [
  {
    id: "ahmed-nadawi",
    nameAr: "احمد النداوي",
    nameEn: "Ahmed Al-Nadawi",
    photo: ahmedAsset.url,
  },
];

const Teachers = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const L = t[language];
  const isRTL = language === "ar";

  return (
    <main className="min-h-screen px-4 py-10 md:py-14 pb-32" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {L.back}
        </button>

        <header className="mb-10 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-4">
            <GraduationCap className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {L.title}
            </span>
          </div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text leading-tight mb-3">
            {L.title}
          </h1>
          <p className="text-muted-foreground max-w-lg mx-auto">{L.desc}</p>
        </header>

        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {teachers.map((teacher, i) => (
            <motion.article
              key={teacher.id}
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur shadow-lg hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300"
            >
              <div className="aspect-square w-full overflow-hidden bg-background">
                <img
                  src={teacher.photo}
                  alt={isRTL ? teacher.nameAr : teacher.nameEn}
                  loading="lazy"
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                />
              </div>
              <div className="p-5">
                <p className="text-[11px] uppercase tracking-[0.25em] text-primary mb-1">
                  {L.role}
                </p>
                <h3 className="text-xl font-bold text-foreground">
                  {isRTL ? teacher.nameAr : teacher.nameEn}
                </h3>
              </div>
              <div
                className="absolute bottom-0 inset-x-0 h-[2px] w-0 group-hover:w-full transition-all duration-700"
                style={{ background: "var(--gradient-primary)" }}
              />
            </motion.article>
          ))}
        </section>
      </div>
    </main>
  );
};

export default Teachers;