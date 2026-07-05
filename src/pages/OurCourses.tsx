import { motion } from "framer-motion";
import { Dna, FlaskConical, Box, Atom, BookOpen, Clock, Layers, ArrowLeft } from "lucide-react";
import { useEffect, useState } from "react";
import type { AppLanguage } from "@/components/LanguageGate";

type Course = {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  Icon: React.ComponentType<{ className?: string }>;
  lessons: number;
  hours: number;
  levelAr: string;
  levelEn: string;
  progress: number;
  /** HSL tuple for accent color */
  accent: string;
  /** Tailwind gradient classes for the cover mesh */
  cover: string;
  /** Decorative SVG background specific to the subject */
  Art: React.ComponentType<{ className?: string }>;
};

const GeneticsArt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 120" className={className} aria-hidden>
    <defs>
      <linearGradient id="dnaStroke" x1="0" x2="1">
        <stop offset="0%" stopColor="hsl(280 90% 70%)" />
        <stop offset="100%" stopColor="hsl(200 95% 65%)" />
      </linearGradient>
    </defs>
    {[...Array(8)].map((_, i) => {
      const x = 30 + i * 20;
      const y1 = 30 + Math.sin(i * 0.9) * 25;
      const y2 = 90 - Math.sin(i * 0.9) * 25;
      return <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke="url(#dnaStroke)" strokeWidth="2" opacity="0.7" />;
    })}
    <path d="M20,20 Q60,60 20,100" fill="none" stroke="url(#dnaStroke)" strokeWidth="3" />
    <path d="M20,20 Q60,60 20,100" fill="none" stroke="url(#dnaStroke)" strokeWidth="3" transform="translate(160,0) scale(-1,1)" />
    <path d="M20,20 Q100,-10 180,20" fill="none" stroke="hsl(280 90% 75% / 0.5)" strokeWidth="2" />
    <path d="M20,100 Q100,130 180,100" fill="none" stroke="hsl(200 95% 65% / 0.5)" strokeWidth="2" />
  </svg>
);

const OrganicArt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 120" className={className} aria-hidden>
    <g fill="none" stroke="hsl(150 70% 55%)" strokeWidth="2">
      {/* Benzene ring */}
      <polygon points="70,40 95,25 120,40 120,70 95,85 70,70" opacity="0.9" />
      <circle cx="95" cy="55" r="14" opacity="0.6" />
      {/* Substituent chain */}
      <line x1="120" y1="40" x2="145" y2="25" />
      <line x1="145" y1="25" x2="170" y2="40" />
      <line x1="170" y1="40" x2="170" y2="65" />
      <circle cx="170" cy="65" r="4" fill="hsl(150 80% 55%)" />
      <line x1="70" y1="70" x2="45" y2="85" />
      <circle cx="45" cy="85" r="4" fill="hsl(45 85% 60%)" />
      <text x="42" y="88" fontSize="8" fill="hsl(45 85% 60%)" stroke="none">OH</text>
    </g>
  </svg>
);

const GeometryArt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 120" className={className} aria-hidden>
    <g fill="none" stroke="hsl(30 95% 60%)" strokeWidth="1.8">
      {/* Cube */}
      <polygon points="60,35 110,35 110,85 60,85" />
      <polygon points="75,20 125,20 125,70 75,70" />
      <line x1="60" y1="35" x2="75" y2="20" />
      <line x1="110" y1="35" x2="125" y2="20" />
      <line x1="60" y1="85" x2="75" y2="70" />
      <line x1="110" y1="85" x2="125" y2="70" />
      {/* Pyramid */}
      <polygon points="145,80 185,80 165,40" opacity="0.9" />
      <line x1="145" y1="80" x2="165" y2="40" strokeDasharray="2 2" />
      {/* Axis */}
      <line x1="20" y1="100" x2="50" y2="100" stroke="hsl(30 95% 65% / 0.6)" />
      <line x1="30" y1="110" x2="30" y2="80" stroke="hsl(30 95% 65% / 0.6)" />
    </g>
  </svg>
);

const NuclearArt = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 200 120" className={className} aria-hidden>
    <g stroke="hsl(0 85% 65%)" fill="none" strokeWidth="1.8">
      <ellipse cx="100" cy="60" rx="70" ry="22" />
      <ellipse cx="100" cy="60" rx="70" ry="22" transform="rotate(60 100 60)" />
      <ellipse cx="100" cy="60" rx="70" ry="22" transform="rotate(-60 100 60)" />
    </g>
    <circle cx="100" cy="60" r="10" fill="hsl(0 85% 60%)" />
    <circle cx="100" cy="60" r="16" fill="hsl(0 85% 60% / 0.25)" />
    <circle cx="170" cy="60" r="4" fill="hsl(0 85% 70%)" />
    <circle cx="50" cy="30" r="3.5" fill="hsl(0 85% 70%)" />
    <circle cx="60" cy="95" r="3.5" fill="hsl(0 85% 70%)" />
  </svg>
);

const COURSES: Course[] = [
  {
    id: "genetics",
    titleAr: "علم الوراثة",
    titleEn: "Genetics",
    descAr: "من الحمض النووي إلى الطفرات، رحلة كاملة داخل الشيفرة الوراثية.",
    descEn: "From DNA to mutations — a full journey inside the genetic code.",
    Icon: Dna,
    lessons: 18,
    hours: 6,
    levelAr: "متقدم",
    levelEn: "Advanced",
    progress: 42,
    accent: "270 85% 62%",
    cover: "from-[hsl(270_90%_70%)] via-[hsl(240_85%_65%)] to-[hsl(200_90%_65%)]",
    Art: GeneticsArt,
  },
  {
    id: "organic",
    titleAr: "الكيمياء العضوية",
    titleEn: "Organic Chemistry",
    descAr: "الهيدروكربونات، المجاميع الوظيفية والتفاعلات خطوة بخطوة.",
    descEn: "Hydrocarbons, functional groups and reactions, step by step.",
    Icon: FlaskConical,
    lessons: 22,
    hours: 8,
    levelAr: "متوسط",
    levelEn: "Intermediate",
    progress: 65,
    accent: "150 75% 45%",
    cover: "from-[hsl(150_80%_55%)] via-[hsl(170_70%_50%)] to-[hsl(190_75%_55%)]",
    Art: OrganicArt,
  },
  {
    id: "space-geometry",
    titleAr: "الهندسة الفضائية",
    titleEn: "Space Geometry",
    descAr: "المستويات، المجسمات والمسافات في الفضاء ثلاثي الأبعاد.",
    descEn: "Planes, solids and distances in three-dimensional space.",
    Icon: Box,
    lessons: 14,
    hours: 5,
    levelAr: "متوسط",
    levelEn: "Intermediate",
    progress: 20,
    accent: "30 95% 55%",
    cover: "from-[hsl(30_95%_60%)] via-[hsl(20_90%_58%)] to-[hsl(350_85%_60%)]",
    Art: GeometryArt,
  },
  {
    id: "nuclear",
    titleAr: "الفيزياء النووية",
    titleEn: "Nuclear Physics",
    descAr: "النواة، الاضمحلال الإشعاعي، والانشطار والاندماج النووي.",
    descEn: "The nucleus, radioactive decay, fission and fusion.",
    Icon: Atom,
    lessons: 16,
    hours: 7,
    levelAr: "متقدم",
    levelEn: "Advanced",
    progress: 8,
    accent: "0 85% 62%",
    cover: "from-[hsl(0_85%_62%)] via-[hsl(340_80%_58%)] to-[hsl(300_75%_55%)]",
    Art: NuclearArt,
  },
];

const OurCourses = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";
  const [mounted, setMounted] = useState(false);
  useEffect(() => {
    const t = window.setTimeout(() => setMounted(true), 60);
    return () => window.clearTimeout(t);
  }, []);

  return (
    <main className="min-h-screen bg-background pb-32" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "رجوع" : "Back"}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            {isAr ? "دوراتنا" : "Our Courses"}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base">
            {isAr
              ? "دورات مركّزة لأهم المواضيع، مصممة لتوصلك للتفوق خطوة بخطوة."
              : "Focused courses on the most important topics — crafted to take you to excellence."}
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {COURSES.map((c, idx) => {
            const Icon = c.Icon;
            const Art = c.Art;
            return (
              <motion.article
                key={c.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col rounded-2xl bg-card overflow-hidden border border-border/60 transition-all duration-300"
                style={{
                  boxShadow: `0 12px 30px -12px hsl(${c.accent} / 0.35), 0 2px 6px -2px hsl(${c.accent} / 0.15)`,
                }}
              >
                {/* Accent top border */}
                <div
                  className="absolute inset-x-0 top-0 h-1"
                  style={{ background: `linear-gradient(90deg, hsl(${c.accent}), hsl(${c.accent} / 0.4))` }}
                />

                {/* Cover with mesh gradient + themed art */}
                <div className={`relative h-36 bg-gradient-to-br ${c.cover} overflow-hidden`}>
                  <div className="absolute inset-0 opacity-70">
                    <Art className="absolute inset-0 w-full h-full" />
                  </div>
                  <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
                  {/* Icon badge (glassmorphism on hover) */}
                  <div
                    className={`absolute ${isAr ? "left-3" : "right-3"} top-3 w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-md bg-white/25 border border-white/40 shadow-lg transition-all duration-300 group-hover:bg-white/40`}
                  >
                    <Icon className="w-5 h-5 text-white drop-shadow" />
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-4">
                  <h3 className="text-lg font-bold leading-tight text-foreground">
                    {isAr ? c.titleAr : c.titleEn}
                  </h3>
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-2 leading-relaxed">
                    {isAr ? c.descAr : c.descEn}
                  </p>

                  {/* Metadata pills */}
                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                      <BookOpen className="w-3 h-3" />
                      {c.lessons} {isAr ? "درس" : "lessons"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                      <Clock className="w-3 h-3" />
                      {c.hours} {isAr ? "ساعة" : "hrs"}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: `hsl(${c.accent} / 0.15)`,
                        color: `hsl(${c.accent})`,
                      }}
                    >
                      <Layers className="w-3 h-3" />
                      {isAr ? c.levelAr : c.levelEn}
                    </span>
                  </div>

                  {/* Progress */}
                  <div className="mt-4">
                    <div className="flex items-center justify-between text-[11px] font-semibold text-muted-foreground mb-1.5">
                      <span>{isAr ? "التقدم" : "Progress"}</span>
                      <span style={{ color: `hsl(${c.accent})` }}>{c.progress}%</span>
                    </div>
                    <div className="relative h-2 rounded-full bg-secondary overflow-hidden">
                      <div
                        className="absolute inset-y-0 left-0 rounded-full transition-[width] duration-[1200ms] ease-out"
                        style={{
                          width: mounted ? `${c.progress}%` : "0%",
                          background: `linear-gradient(90deg, hsl(${c.accent}), hsl(${c.accent} / 0.6))`,
                          boxShadow: `0 0 12px hsl(${c.accent} / 0.5)`,
                        }}
                      />
                    </div>
                  </div>

                  {/* CTA */}
                  <button
                    className="mt-5 w-full h-10 rounded-xl text-sm font-bold text-white transition-all duration-200 active:scale-95 hover:brightness-110"
                    style={{
                      background: `linear-gradient(135deg, hsl(${c.accent}), hsl(${c.accent} / 0.75))`,
                      boxShadow: `0 8px 20px -6px hsl(${c.accent} / 0.6)`,
                    }}
                  >
                    {c.progress > 0 ? (isAr ? "استمرار" : "Continue") : isAr ? "ابدأ الآن" : "Start now"}
                  </button>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </main>
  );
};

export default OurCourses;