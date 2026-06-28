import { ArrowRight, Sparkles, HelpCircle, ListChecks, MessageSquareQuote, PenLine, Headphones, Crown } from "lucide-react";
import { motion } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";
import CurvedNavBar from "@/components/CurvedNavBar";

const copy = {
  en: {
    badge: "More",
    title: "More Tools",
    description: "Extra study superpowers beyond the basics.",
    items: {
      mcq: { title: "MCQ Generator", subtitle: "Upload any file and get multiple-choice questions." },
      missions: { title: "My Missions", subtitle: "Check off chapter topics and track progress." },
      advices: { title: "Advices", subtitle: "Read tips from top students or share yours." },
      essay: { title: "Al-Musahhih", subtitle: "Upload your answer sheet & the key — AI grades it." },
      videoNotes: { title: "Video to Notes", subtitle: "Paste a YouTube link, get study notes." },
      premium: { title: "Premium", subtitle: "Unlimited AI, premium badge & exclusive character styles." },
    },
  },
  ar: {
    badge: "المزيد",
    title: "أدوات إضافية",
    description: "قدرات دراسية إضافية تتجاوز الأساسيات.",
    items: {
      mcq: { title: "مولّد الأسئلة", subtitle: "ارفع أي ملف واحصل على أسئلة اختيار من متعدد." },
      missions: { title: "مهماتي", subtitle: "اشطب مواضيع الفصل وتابع تقدمك." },
      advices: { title: "النصائح", subtitle: "اقرأ نصائح المتفوقين أو شارك نصيحتك." },
      essay: { title: "المُصحِّح", subtitle: "ارفع ورقتك ونموذج الإجابة ودع الذكاء يصحّح." },
      videoNotes: { title: "من الفيديو إلى ملاحظات", subtitle: "ألصق رابط يوتيوب واحصل على ملاحظات." },
      premium: { title: "بريميوم", subtitle: "ذكاء اصطناعي غير محدود، شارة بريميوم وأزياء حصرية." },
    },
  },
} as const;

type MoreKey = "mcq" | "missions" | "advices" | "essay" | "videoNotes" | "premium";

const More = ({
  language,
  onSelect,
  onNav,
}: {
  language: AppLanguage;
  onSelect: (c: MainMenuChoice) => void;
  onNav: (c: MainMenuChoice) => void;
}) => {
  const t = copy[language];
  const items: { key: MoreKey; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "premium", Icon: Crown },
    { key: "mcq", Icon: HelpCircle },
    { key: "missions", Icon: ListChecks },
    { key: "advices", Icon: MessageSquareQuote },
    { key: "essay", Icon: PenLine },
    { key: "videoNotes", Icon: Headphones },
  ];

  return (
    <>
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <header className="text-center max-w-3xl mx-auto z-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">{t.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{t.description}</p>
      </header>

      <motion.section
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative"
      >
        {items.map((it) => {
          const Icon = it.Icon;
          const meta = t.items[it.key];
          return (
            <motion.button
              key={it.key}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => onSelect(it.key as MainMenuChoice)}
              className="group relative text-left rounded-3xl p-6 h-44 border border-primary/40 bg-secondary/40 backdrop-blur overflow-hidden cursor-pointer shadow-lg hover:border-primary hover:shadow-[var(--shadow-glow)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="relative z-10 mt-6">
                <h3 className="text-2xl font-semibold mb-1 text-foreground">{meta.title}</h3>
                <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.section>
    </motion.main>
      <CurvedNavBar language={language} active="more" onSelect={onNav} />
    </>
  );
};

export default More;