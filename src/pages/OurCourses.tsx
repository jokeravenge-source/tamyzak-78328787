import { motion } from "framer-motion";
import { Dna, FlaskConical, Box, Atom, FileText, ScanLine, Upload, Sparkles, ArrowLeft, Lock } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import geneticsImg from "@/assets/course-genetics.jpg";
import organicImg from "@/assets/course-organic.jpg";
import geometryImg from "@/assets/course-geometry.jpg";
import nuclearImg from "@/assets/course-nuclear.jpg";

type Course = {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  Icon: React.ComponentType<{ className?: string }>;
  exams: number;
  levelAr: string;
  levelEn: string;
  accent: string;
  cover: string;
};

const COURSES: Course[] = [
  {
    id: "genetics",
    titleAr: "علم الوراثة",
    titleEn: "Genetics",
    descAr: "امتحانات مركّزة على الحمض النووي، الطفرات وقوانين الوراثة.",
    descEn: "Focused exams on DNA, mutations and laws of inheritance.",
    Icon: Dna,
    exams: 8,
    levelAr: "متقدم",
    levelEn: "Advanced",
    accent: "270 85% 62%",
    cover: geneticsImg,
  },
  {
    id: "organic",
    titleAr: "الكيمياء العضوية",
    titleEn: "Organic Chemistry",
    descAr: "امتحانات على الهيدروكربونات، المجاميع الوظيفية والتفاعلات.",
    descEn: "Exams on hydrocarbons, functional groups and reactions.",
    Icon: FlaskConical,
    exams: 10,
    levelAr: "متوسط",
    levelEn: "Intermediate",
    accent: "150 75% 45%",
    cover: organicImg,
  },
  {
    id: "space-geometry",
    titleAr: "الهندسة الفضائية",
    titleEn: "Space Geometry",
    descAr: "امتحانات في المستويات، المجسمات والمسافات ثلاثية الأبعاد.",
    descEn: "Exams on planes, solids and 3D distances.",
    Icon: Box,
    exams: 6,
    levelAr: "متوسط",
    levelEn: "Intermediate",
    accent: "30 95% 55%",
    cover: geometryImg,
  },
  {
    id: "nuclear",
    titleAr: "الفيزياء النووية",
    titleEn: "Nuclear Physics",
    descAr: "امتحانات على النواة، الاضمحلال الإشعاعي، الانشطار والاندماج.",
    descEn: "Exams on the nucleus, radioactive decay, fission and fusion.",
    Icon: Atom,
    exams: 7,
    levelAr: "متقدم",
    levelEn: "Advanced",
    accent: "0 85% 62%",
    cover: nuclearImg,
  },
];

const OurCourses = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";

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
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-2xl">
            {isAr
              ? "دورات مبنية على الامتحانات. حلّ الامتحان على ورقة، صوّرها وارفعها، ونقوم بتصحيحها تلقائياً بتقنية التعرف الضوئي على الحروف (OCR)."
              : "Exam-based courses. Solve on paper, upload a photo of your answers, and we grade them automatically using OCR."}
          </p>

          {/* How it works ribbon */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { Icon: FileText, ar: "اختر الامتحان", en: "Pick an exam" },
              { Icon: Upload, ar: "ارفع ورقتك", en: "Upload your paper" },
              { Icon: ScanLine, ar: "تصحيح فوري بالـ OCR", en: "Instant OCR grading" },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/60"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{isAr ? s.ar : s.en}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {COURSES.map((c, idx) => {
            const Icon = c.Icon;
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
                <div
                  className="absolute inset-x-0 top-0 h-1 z-10"
                  style={{ background: `linear-gradient(90deg, hsl(${c.accent}), hsl(${c.accent} / 0.4))` }}
                />

                {/* Cover: photo + dark scrim + coming-soon badge */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={c.cover}
                    alt={isAr ? c.titleAr : c.titleEn}
                    loading="lazy"
                    width={1024}
                    height={768}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div
                    className="absolute inset-0 mix-blend-overlay opacity-40"
                    style={{ background: `linear-gradient(135deg, hsl(${c.accent} / 0.6), transparent 60%)` }}
                  />

                  {/* Icon badge */}
                  <div
                    className={`absolute ${isAr ? "left-3" : "right-3"} top-3 w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/40 shadow-lg transition-all duration-300 group-hover:bg-white/35`}
                  >
                    <Icon className="w-5 h-5 text-white drop-shadow" />
                  </div>

                  {/* Coming soon pill */}
                  <div className={`absolute ${isAr ? "right-3" : "left-3"} top-3`}>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/95 text-foreground shadow-md">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {isAr ? "قريباً" : "Coming soon"}
                    </span>
                  </div>

                  {/* Title on cover */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow-lg">
                      {isAr ? c.titleAr : c.titleEn}
                    </h3>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
                    {isAr ? c.descAr : c.descEn}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                      <FileText className="w-3 h-3" />
                      {c.exams} {isAr ? "امتحان" : "exams"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                      <ScanLine className="w-3 h-3" />
                      {isAr ? "تصحيح OCR" : "OCR grading"}
                    </span>
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                      style={{
                        background: `hsl(${c.accent} / 0.15)`,
                        color: `hsl(${c.accent})`,
                      }}
                    >
                      {isAr ? c.levelAr : c.levelEn}
                    </span>
                  </div>

                  {/* CTA (disabled — coming soon) */}
                  <button
                    disabled
                    aria-disabled="true"
                    className="mt-5 w-full h-10 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
                    style={{
                      background: `linear-gradient(135deg, hsl(${c.accent} / 0.55), hsl(${c.accent} / 0.35))`,
                    }}
                  >
                    <Lock className="w-4 h-4" />
                    {isAr ? "قريباً" : "Coming soon"}
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