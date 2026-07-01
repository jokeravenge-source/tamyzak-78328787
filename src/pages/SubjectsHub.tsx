import { useState } from "react";
import { ArrowLeft, ArrowRight, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, Moon, ScrollText, Microscope, PenLine, MousePointerClick, Layers, BookMarked, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { useSubscription } from "@/hooks/useSubscription";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const FREE_TOOLS = new Set<MainMenuChoice>(["flashcards", "malazam"]);

type SubjectKey = "physics" | "chemistry" | "biology" | "english" | "french" | "arabic" | "islamic" | "revision";

type Tool = { key: MainMenuChoice; en: string; ar: string; Icon: React.ComponentType<{ className?: string }> };

const SUBJECTS: { code: SubjectKey; en: string; ar: string; Icon: React.ComponentType<{ className?: string }>; tools: Tool[] }[] = [
  {
    code: "physics", en: "Physics", ar: "الفيزياء", Icon: Atom,
    tools: [
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
  {
    code: "chemistry", en: "Chemistry", ar: "الكيمياء", Icon: FlaskConical,
    tools: [
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "organicEquations", en: "Organic Equations", ar: "تفاعلات العضوية", Icon: FlaskConical },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
  {
    code: "biology", en: "Biology", ar: "الأحياء", Icon: Leaf,
    tools: [
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "biologyDrawings", en: "Biology Drawings", ar: "رسومات الأحياء", Icon: Microscope },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
  {
    code: "english", en: "English", ar: "الإنجليزية", Icon: BookOpen,
    tools: [
      { key: "englishEssays", en: "English Compositions", ar: "إنشاءات الإنكليزي", Icon: PenLine },
      { key: "englishIsqat", en: "Word Drops (Isqatat)", ar: "الإسقاطات", Icon: MousePointerClick },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
  {
    code: "french", en: "French", ar: "الفرنسية", Icon: LangIcon,
    tools: [
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
  {
    code: "arabic", en: "Arabic", ar: "العربية", Icon: BookOpen,
    tools: [
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "poemsChecker", en: "Poems Checker", ar: "قصائد الأدب", Icon: ScrollText },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
  {
    code: "islamic", en: "Islamic", ar: "التربية الإسلامية", Icon: Moon,
    tools: [
      { key: "islamicSurahs", en: "Islamic Surahs", ar: "سور إسلامية", Icon: Moon },
      { key: "hadithChecker", en: "Hadith Checker", ar: "فاحص الأحاديث", Icon: Moon },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
    ],
  },
];

const SubjectsHub = ({
  language,
  onBack,
  onSelect,
}: {
  language: AppLanguage;
  onBack: () => void;
  onSelect: (c: MainMenuChoice) => void;
}) => {
  const isRTL = language === "ar";
  const [open, setOpen] = useState<SubjectKey | null>(null);
  const current = SUBJECTS.find((s) => s.code === open);
  const { isPremium } = useSubscription();
  const navigate = useNavigate();

  const handleToolClick = (t: Tool) => {
    const free = FREE_TOOLS.has(t.key);
    if (!free && !isPremium) {
      toast.error(isRTL ? "هذه الأداة متاحة للمشتركين في البريميوم فقط." : "This tool is available for Premium members only.");
      navigate("/premium");
      return;
    }
    onSelect(t.key);
  };

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? "رجوع" : "Back"}
        </button>

        <header className="mb-8">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
            {isRTL ? "المواد" : "Subjects"}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm md:text-base">
            {isRTL ? "اختر مادة لعرض الأدوات الخاصة بها." : "Pick a subject to see its tools."}
          </p>
        </header>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {SUBJECTS.map((s) => {
            const Icon = s.Icon;
            const active = open === s.code;
            return (
              <motion.button
                key={s.code}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => setOpen(active ? null : s.code)}
                className={`p-4 rounded-2xl border text-left transition-all ${
                  active
                    ? "border-primary bg-primary/10 shadow-[var(--shadow-card)]"
                    : "border-border bg-card hover:border-primary/40"
                }`}
              >
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                  <Icon className="w-5 h-5 text-primary" />
                </div>
                <p className="font-bold text-sm">{isRTL ? s.ar : s.en}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  {s.tools.length} {isRTL ? "أداة" : "tools"}
                </p>
              </motion.button>
            );
          })}
        </div>

        <AnimatePresence mode="wait">
          {current && (
            <motion.section
              key={current.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <h2 className="text-lg font-bold mb-4" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {isRTL ? `أدوات ${current.ar}` : `${current.en} tools`}
              </h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {current.tools.map((t) => {
                  const Icon = t.Icon;
                  const free = FREE_TOOLS.has(t.key);
                  const locked = !free && !isPremium;
                  return (
                    <motion.button
                      key={t.key}
                      whileHover={{ y: -2 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleToolClick(t)}
                      className={`group relative bg-card p-5 border rounded-2xl text-left transition-all ${
                        locked
                          ? "border-border/60 hover:border-amber-400/60"
                          : "border-border hover:border-primary/40 hover:shadow-[var(--shadow-card)]"
                      }`}
                    >
                      {locked && (
                        <span className={`absolute top-3 ${isRTL ? "left-3" : "right-3"} inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-400/15 text-amber-600 border border-amber-400/30`}>
                          <Lock className="w-3 h-3" />
                          {isRTL ? "بريميوم" : "PREMIUM"}
                        </span>
                      )}
                      <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                        <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                      </div>
                      <h5 className="font-bold text-base mb-3">{isRTL ? t.ar : t.en}</h5>
                      <span className={`inline-flex items-center gap-1 text-xs font-semibold ${locked ? "text-amber-600" : "text-primary"}`}>
                        {locked ? (isRTL ? "ترقية للفتح" : "Upgrade to unlock") : (isRTL ? "افتح" : "Open")}
                        <ArrowRight className={`w-3.5 h-3.5 ${isRTL ? "rotate-180" : ""}`} />
                      </span>
                    </motion.button>
                  );
                })}
              </div>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default SubjectsHub;