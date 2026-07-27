import { Layers, GraduationCap, BookMarked, FileText, HelpCircle, Headphones, ArrowRight, Sparkles, Lock, Compass, LineChart, Search, Youtube, StickyNote } from "lucide-react";
import { motion } from "framer-motion";
import { type AppLanguage } from "@/components/LanguageGate";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StreakTree from "@/components/StreakTree";
import CountdownTimer from "@/components/CountdownTimer";


const copy = {
  en: {
    badge: "Welcome",
    title: "Your Study Hub",
    description: "Pick what you want to do today. More tools are on the way.",
    soon: "Coming soon",
    hi: "Hi",
    items: {
      basics: { title: "The Basics", subtitle: "All your essential study tools in one tidy hub." },
      flashcards: { title: "Flashcards", subtitle: "Study with smart Q&A cards across every subject." },
      sessions: { title: "Sessions", subtitle: "Track study time per subject and climb the leaderboard." },
      malazam: { title: "Malazam", subtitle: "Curated booklets and study notes for every subject." },
      summaries: { title: "Notes & Summaries", subtitle: "Upload your notes or summaries — they appear once an admin approves." },
      missions: { title: "My Missions", subtitle: "Check off chapter topics and watch your progress per subject." },
      mcq: { title: "MCQ Generator", subtitle: "Upload any file and instantly get multiple-choice questions with hints." },
      advices: { title: "Advices", subtitle: "Read advice from top students or share your own." },
      videoNotes: { title: "Video to Notes", subtitle: "Paste a YouTube link and get AI-generated study notes." },
      account: { title: "Account Center", subtitle: "Set your username and manage your profile." },
      essay: { title: "Al-Musahhih", subtitle: "Upload your answer sheet & the key — AI grades it." },
      report: { title: "Daily Report", subtitle: "AI insights on today's study + share progress with a parent." },
      youtube: { title: "YouTube Player", subtitle: "Watch any YouTube video inside the app without distractions." },
      adminNotes: { title: "Study Notes", subtitle: "Beautiful study notes crafted by your instructors." },
    },
  },
  ar: {
    badge: "أهلاً بك",
    title: "منصة الدراسة",
    description: "اختر ما تريد البدء به اليوم. المزيد من الأدوات قريباً.",
    soon: "قريباً",
    hi: "أهلاً",
    items: {
      basics: { title: "الأساسيات", subtitle: "كل أدواتك الدراسية الأساسية في مكان واحد." },
      flashcards: { title: "البطاقات التعليمية", subtitle: "ادرس عبر بطاقات السؤال والجواب لجميع المواد." },
      sessions: { title: "الجلسات", subtitle: "احسب وقت دراستك لكل مادة وتحدّى أصدقاءك على لوحة المتصدرين." },
      malazam: { title: "الملازم", subtitle: "ملازم ومذكرات دراسية مختارة لكل مادة." },
      summaries: { title: "ملاحظات وملخصات", subtitle: "ارفع ملاحظاتك أو ملخصاتك — تظهر بعد موافقة المسؤول." },
      missions: { title: "مهماتي", subtitle: "اشطب مواضيع كل فصل وتابع تقدمك في كل مادة." },
      mcq: { title: "مولّد الأسئلة", subtitle: "ارفع أي ملف واحصل فوراً على أسئلة اختيار من متعدد مع تلميحات." },
      advices: { title: "النصائح", subtitle: "اقرأ نصائح من المتفوقين أو شارك نصيحتك." },
      videoNotes: { title: "من الفيديو إلى ملاحظات", subtitle: "ألصق رابط يوتيوب واحصل على ملاحظات دراسية بالذكاء الاصطناعي." },
      account: { title: "مركز الحساب", subtitle: "حدّد اسم المستخدم وأدر ملفك الشخصي." },
      essay: { title: "مدرّب المقالات", subtitle: "ارفع ملفاً واحصل على أسئلة مقالية مُقيَّمة من 1 إلى 10." },
      report: { title: "تقريري اليومي", subtitle: "تحليل ذكي ليومك الدراسي ومشاركة تقدمك مع ولي الأمر." },
      youtube: { title: "مشغّل يوتيوب", subtitle: "شاهد أي فيديو يوتيوب داخل التطبيق بدون تشتيت." },
      adminNotes: { title: "ملاحظات دراسية", subtitle: "ملاحظات جميلة أعدّها المدرّسون خصيصاً لك." },
    },
  },
} as const;

export type MainMenuChoice = "flashcards" | "missions" | "mcq" | "malazam" | "summaries" | "advices" | "sessions" | "account" | "essay" | "videoNotes" | "basics" | "biologyDrawings" | "leaderboard" | "news" | "premium" | "more" | "todo" | "ministerialBank" | "mindmap" | "islamicSurahs" | "hadithChecker" | "poemsChecker" | "englishEssays" | "englishIsqat" | "report" | "notes" | "canvas" | "youtube" | "organicEquations" | "liveBattle" | "subjectsHub" | "textToVideo" | "psych" | "companion" | "subjectTutor" | "physicsLaws" | "physicsQuickMcq" | "physicsProblemSolver" | "problemGenerator" | "frenchSynonyms" | "frenchAntonyms" | "toolPlaceholder" | "physicsActivities" | "ourCourses" | "examGenerator" | "teachers" | "adminNotes" | "dailyGame";

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

  const [username, setUsername] = useState<string>(() => localStorage.getItem("app_display_name_v1") || "");
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      if (p?.display_name) {
        setUsername(p.display_name);
        localStorage.setItem("app_display_name_v1", p.display_name);
      }
    })();
    const onChange = () => setUsername(localStorage.getItem("app_display_name_v1") || "");
    window.addEventListener("app:username-changed", onChange);
    return () => window.removeEventListener("app:username-changed", onChange);
  }, []);

  const items = [
    { key: "basics" as const, Icon: Compass, locked: false, ...text.items.basics },
    { key: "report" as const, Icon: LineChart, locked: false, ...text.items.report },
    { key: "flashcards" as const, Icon: Layers, locked: false, ...text.items.flashcards },
    { key: "malazam", Icon: BookMarked, locked: false, ...text.items.malazam },
    { key: "summaries", Icon: FileText, locked: false, ...text.items.summaries },
    { key: "mcq", Icon: HelpCircle, locked: false, ...text.items.mcq },
    { key: "sessions", Icon: GraduationCap, locked: false, ...text.items.sessions },
    { key: "videoNotes", Icon: Headphones, locked: false, ...text.items.videoNotes },
    { key: "youtube" as const, Icon: Youtube, locked: false, ...text.items.youtube },
    { key: "adminNotes" as const, Icon: StickyNote, locked: false, ...text.items.adminNotes },
  ];

  const openSearch = () => window.dispatchEvent(new Event("app:open-search"));

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="absolute top-6 inset-x-6 z-20 flex justify-center">
        <button
          onClick={openSearch}
          aria-label={language === "ar" ? "بحث" : "Search"}
          className="w-full max-w-md inline-flex items-center gap-2 h-11 px-4 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
        >
          <Search className="w-4 h-4 text-primary" />
          <span className="flex-1 text-start">
            {language === "ar" ? "ابحث عن أداة أو ميزة..." : "Search for a tool or feature..."}
          </span>
          <kbd className="hidden sm:inline-block text-[10px] text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">⌘K</kbd>
        </button>
      </div>

      <CountdownTimer target="2026-08-07T00:00:00" language={language} />

      <header className="text-center max-w-3xl mx-auto mt-8 z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{text.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">{text.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{text.description}</p>
        {username && (
          <p className="mt-3 text-sm text-primary font-medium">{text.hi}, {username} 👋</p>
        )}
      </header>

      <motion.section
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative"
      >
        {items.map((it) => {
          const Icon = it.Icon;
          const available = !it.locked;
          return (
            <motion.button
              key={it.key}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              whileHover={available ? { y: -6 } : undefined}
              whileTap={available ? { scale: 0.97 } : undefined}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => available && onSelect(it.key as MainMenuChoice)}
              disabled={it.locked}
              className={`group relative text-left rounded-3xl p-6 h-44 border backdrop-blur overflow-hidden
                ${available
                  ? it.key === "report"
                    ? "border-primary bg-primary/5 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                    : "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                  : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"}`}
            >
              {available && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }}
                />
              )}

              <div className="relative z-10 flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${it.key === "report" ? "bg-primary" : available ? "bg-primary/15" : "bg-muted/20"}`}>
                  <Icon className={`w-6 h-6 ${it.key === "report" ? "text-primary-foreground" : available ? "text-primary" : "text-muted-foreground/60"}`} />
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
            </motion.button>
          );
        })}
      </motion.section>
      <StreakTree language={language} />
    </main>
  );
};

export default MainMenu;