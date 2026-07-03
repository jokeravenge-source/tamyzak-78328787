import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, Moon, ScrollText, Microscope, PenLine, MousePointerClick, Layers, BookMarked, Lock, Bot, Calculator, Ruler, Zap, RefreshCw, BookText, Beaker, Sigma, Atom as AtomIcon, FileQuestion, Volume2, Timer, TrendingDown, Repeat, FileText, Feather, Type, Music, Brain, HeartPulse, Table2, Sparkles as SparklesIcon, Languages, GaugeCircle, ListTodo, ClipboardList, Wand2, MessageCircle, BookHeart, Speech, PenTool, Boxes } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { useSubscription } from "@/hooks/useSubscription";
import { toast } from "sonner";
import { TOOL_PLACEHOLDER_KEY } from "@/pages/ToolPlaceholder";

const FREE_TOOLS = new Set<MainMenuChoice>(["flashcards", "malazam", "frenchSynonyms", "frenchAntonyms"]);

type SubjectKey = "physics" | "chemistry" | "biology" | "english" | "french" | "arabic" | "islamic" | "revision";

// A tool either points to a real MainMenuChoice route, or is a placeholder
// with its own display metadata (routed through the shared ToolPlaceholder page).
type Tool = {
  key: MainMenuChoice;
  en: string;
  ar: string;
  Icon: React.ComponentType<{ className?: string }>;
  placeholder?: boolean;
  descEn?: string;
  descAr?: string;
};

// Helper to declare a "coming soon" tool that routes to ToolPlaceholder.
const soon = (
  en: string,
  ar: string,
  Icon: React.ComponentType<{ className?: string }>,
  descEn?: string,
  descAr?: string,
): Tool => ({ key: "toolPlaceholder", en, ar, Icon, placeholder: true, descEn, descAr });

const SUBJECTS: { code: SubjectKey; en: string; ar: string; Icon: React.ComponentType<{ className?: string }>; tools: Tool[] }[] = [
  {
    code: "physics", en: "Physics", ar: "الفيزياء", Icon: Atom,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "physicsActivities", en: "Activities", ar: "الأنشطة", Icon: Boxes },
      { key: "physicsProblemSolver", en: "Problem Solver", ar: "حل المسائل", Icon: Calculator },
      { key: "physicsQuickMcq", en: "Quick MCQ", ar: "اختبار سريع", Icon: Zap },
      { key: "physicsLaws", en: "Laws & Units", ar: "قوانين ووحدات", Icon: Ruler },
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Formula Sheet", "ورقة القوانين", BookText, "Searchable, chapter-indexed physics formulas.", "قوانين فيزياء مفهرسة حسب الفصل مع بحث."),
      soon("Unit Converter", "محوّل الوحدات", GaugeCircle, "Convert between SI and common units.", "حوّل بين وحدات SI والوحدات الشائعة."),
      soon("Diagram Reader", "قارئ المخططات", AtomIcon, "Upload a circuit or diagram and let AI explain it.", "ارفع دائرة أو مخطط ودع الذكاء يشرحه."),
      soon("Mistake Journal", "سجل الأخطاء", ClipboardList, "Log wrong answers and review them with spaced repetition.", "سجّل الإجابات الخاطئة وراجعها بالتكرار المتباعد."),
      soon("Concept Explainer", "شرح المفاهيم", Brain, "Ask for a plain-language walk-through of any concept.", "اطلب شرحاً مبسطاً لأي مفهوم."),
      soon("Past Papers Solver", "حل الأسئلة السابقة", FileText, "Step-by-step solutions for past ministerial questions.", "حلول مفصلة للأسئلة الوزارية السابقة."),
    ],
  },
  {
    code: "chemistry", en: "Chemistry", ar: "الكيمياء", Icon: FlaskConical,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "organicEquations", en: "Organic Equations", ar: "تفاعلات العضوية", Icon: FlaskConical },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Periodic Table", "الجدول الدوري", Table2, "Interactive element cards with properties.", "بطاقات تفاعلية للعناصر مع خصائصها."),
      soon("Reaction Balancer", "موازن التفاعلات", Beaker, "AI balances chemical equations for you.", "الذكاء يوازن المعادلات الكيميائية."),
      soon("Nomenclature Trainer", "تدريب التسمية", Type, "Drill IUPAC naming for organic molecules.", "تدرّب على تسمية IUPAC للمركبات."),
      soon("Molar Mass Calculator", "حاسبة الكتلة المولية", Sigma, "Enter a formula, get the molar mass.", "أدخل الصيغة واحصل على الكتلة المولية."),
      soon("Lab Safety Cards", "بطاقات السلامة", HeartPulse, "Quick-reference cards for lab safety.", "بطاقات مرجعية لسلامة المختبر."),
      soon("Quick MCQ", "اختبار سريع", Zap, "Rapid multiple-choice practice for chemistry.", "تدريب سريع على أسئلة الكيمياء."),
    ],
  },
  {
    code: "biology", en: "Biology", ar: "الأحياء", Icon: Leaf,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "biologyDrawings", en: "Biology Drawings", ar: "رسومات الأحياء", Icon: Microscope },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Anatomy Explorer", "مستكشف التشريح", HeartPulse, "Interactive labeled body-system diagrams.", "مخططات تفاعلية لأجهزة الجسم مع تسميات."),
      soon("Term Glossary", "قاموس المصطلحات", BookText, "Search biology terms with clear definitions.", "ابحث في مصطلحات الأحياء مع تعريفات واضحة."),
      soon("Quick MCQ", "اختبار سريع", Zap, "Fast biology multiple-choice practice.", "تدريب سريع على أسئلة الأحياء."),
      soon("Case Study Analyzer", "محلل حالات", Brain, "Break down clinical or ecological cases with AI.", "حلّل حالات سريرية أو بيئية مع الذكاء."),
      soon("Mnemonics Pack", "حزمة الاختصارات", SparklesIcon, "Memory tricks for tough biology lists.", "حيل للحفظ للقوائم الصعبة في الأحياء."),
      soon("Life-Cycle Diagrams", "دورات الحياة", Repeat, "Animated life-cycle walkthroughs.", "شرح متسلسل لدورات حياة الكائنات."),
    ],
  },
  {
    code: "english", en: "English", ar: "الإنجليزية", Icon: BookOpen,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "englishEssays", en: "English Compositions", ar: "إنشاءات الإنكليزي", Icon: PenLine },
      { key: "englishIsqat", en: "Word Drops (Isqatat)", ar: "الإسقاطات", Icon: MousePointerClick },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Grammar Drills", "تمارين القواعد", Type, "Tenses, articles, prepositions — timed drills.", "تمارين موقوتة على الأزمنة وأدوات التعريف والحروف."),
      soon("Vocabulary Builder", "بناء المفردات", BookHeart, "Level-based English vocabulary sets.", "مجموعات مفردات إنكليزية حسب المستوى."),
      soon("Reading Comprehension", "الاستيعاب القرائي", FileText, "AI-generated passages with questions.", "قطع قراءة مولّدة بالذكاء مع أسئلة."),
      soon("Pronunciation Coach", "مدرب النطق", Volume2, "Hear model pronunciation for any word or phrase.", "استمع للنطق النموذجي لأي كلمة أو عبارة."),
      soon("Writing Feedback", "تقييم الكتابة", PenTool, "Get AI feedback on your English writing.", "احصل على تقييم ذكي لكتاباتك بالإنكليزية."),
      soon("Idioms & Phrasal Verbs", "التعابير الاصطلاحية", MessageCircle, "Common idioms and phrasal verbs with examples.", "تعابير وأفعال مركّبة شائعة مع أمثلة."),
    ],
  },
  {
    code: "french", en: "French", ar: "الفرنسية", Icon: LangIcon,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "frenchSynonyms", en: "Synonyms", ar: "المرادفات", Icon: MousePointerClick },
      { key: "frenchAntonyms", en: "Antonyms", ar: "المعاكسات", Icon: MousePointerClick },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Conjugation Trainer", "تدريب التصريف", Repeat, "Practice French verbs across all tenses.", "تدرّب على تصريف الأفعال الفرنسية في كل الأزمنة."),
      soon("Dictée", "الإملاء", Speech, "Listen to a passage and type what you hear.", "استمع لقطعة واكتب ما تسمع."),
      soon("Grammar Rules", "قواعد القواعد", BookText, "Quick reference for French grammar.", "مرجع سريع لقواعد اللغة الفرنسية."),
      soon("Reading Passages", "قطع قراءة", FileText, "Graded French reading passages.", "قطع قراءة فرنسية متدرجة الصعوبة."),
      soon("Translation Practice", "تدريب الترجمة", Languages, "Translate between Arabic/English and French.", "ترجم بين العربية/الإنكليزية والفرنسية."),
      soon("Pronunciation Coach", "مدرب النطق", Volume2, "Hear model French pronunciation.", "استمع للنطق الفرنسي النموذجي."),
    ],
  },
  {
    code: "arabic", en: "Arabic", ar: "العربية", Icon: BookOpen,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "ministerialBank", en: "Ministerial Bank", ar: "بنك الوزاريات", Icon: ScrollText },
      { key: "poemsChecker", en: "Poems Checker", ar: "قصائد الأدب", Icon: ScrollText },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Grammar Drills (النحو)", "تمارين النحو", Type, "Timed drills on Arabic grammar rules.", "تمارين موقوتة على قواعد النحو."),
      soon("Balaghah Cards", "بطاقات البلاغة", Feather, "Rhetorical devices with examples from literature.", "المحسّنات البلاغية مع أمثلة أدبية."),
      soon("Diacritics Trainer (التشكيل)", "تدريب التشكيل", PenTool, "AI adds and checks tashkeel on your text.", "الذكاء يضيف ويصحّح التشكيل على نصك."),
      soon("Composition Feedback", "تقييم الإنشاء", PenLine, "Get feedback on your Arabic composition.", "احصل على تقييم لإنشائك العربي."),
      soon("Word Roots Explorer", "مستكشف الجذور", BookHeart, "Explore Arabic root families and derivations.", "استكشف عائلات الجذور العربية واشتقاقاتها."),
      soon("Poetry Meter Analyzer", "محلل بحور الشعر", Music, "Analyze the meter of a line of poetry.", "حلّل بحر بيت من الشعر."),
    ],
  },
  {
    code: "islamic", en: "Islamic", ar: "التربية الإسلامية", Icon: Moon,
    tools: [
      { key: "subjectTutor", en: "AI Tutor", ar: "المعلم الذكي", Icon: Bot },
      { key: "islamicSurahs", en: "Islamic Surahs", ar: "سور إسلامية", Icon: Moon },
      { key: "hadithChecker", en: "Hadith Checker", ar: "فاحص الأحاديث", Icon: Moon },
      { key: "flashcards", en: "Flashcards", ar: "البطاقات", Icon: Layers },
      { key: "malazam", en: "Malazam", ar: "الملازم", Icon: BookMarked },
      soon("Tajweed Rules", "أحكام التجويد", BookText, "Learn tajweed rules with clear examples.", "تعلّم أحكام التجويد مع أمثلة واضحة."),
      soon("Fiqh Q&A", "أسئلة الفقه", MessageCircle, "Ask fiqh questions and get sourced answers.", "اسأل أسئلة فقهية واحصل على أجوبة موثّقة."),
      soon("Seerah Timeline", "الخط الزمني للسيرة", ClipboardList, "Interactive timeline of the Prophet's life.", "خط زمني تفاعلي للسيرة النبوية."),
      soon("Duaa Memorizer", "حافظ الأدعية", BookHeart, "Memorize essential duas with spaced repetition.", "احفظ الأدعية الأساسية بالتكرار المتباعد."),
      soon("Aqeedah Explainer", "شرح العقيدة", Brain, "Plain-language explanations of core beliefs.", "شرح مبسّط لمواضيع العقيدة."),
      soon("Islamic Quick MCQ", "اختبار إسلامي سريع", Zap, "Fast MCQ practice on Islamic Studies.", "تدريب سريع على أسئلة التربية الإسلامية."),
    ],
  },
  {
    code: "revision", en: "Revision", ar: "المراجعة", Icon: RefreshCw,
    tools: [
      soon("Full Exam Simulator", "محاكي الامتحان الكامل", Timer, "Timed mixed-subject mock exam.", "امتحان تجريبي موقوت متعدد المواد."),
      soon("Weakness Report", "تقرير نقاط الضعف", TrendingDown, "AI analyzes your wrong answers and finds gaps.", "الذكاء يحلل أخطاءك ويحدد نقاط الضعف."),
      soon("Spaced Repetition Queue", "طابور التكرار المتباعد", Repeat, "Auto-scheduled review of your due cards.", "مراجعة تلقائية للبطاقات المستحقة."),
      soon("Cheatsheet Generator", "مولّد الملخصات", Wand2, "Generate a one-page cheatsheet for any chapter.", "أنشئ ملخصاً من صفحة واحدة لأي فصل."),
      soon("Study Planner", "مخطط الدراسة", ListTodo, "Auto-build a study plan for exam week.", "خطة دراسية تلقائية لأسبوع الامتحان."),
      soon("Mixed Flashcard Deck", "بطاقات مختلطة", Layers, "Shuffle flashcards across subjects.", "خلط بطاقات من كل المواد."),
      soon("Mock MCQ Marathon", "ماراثون الاختبارات", FileQuestion, "Long-form mixed MCQ marathon.", "ماراثون طويل من أسئلة الاختيار من متعدد."),
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
  useEffect(() => {
    try {
      const focus = localStorage.getItem("app_subject_focus_v1") as SubjectKey | null;
      if (focus && SUBJECTS.some((s) => s.code === focus)) setOpen(focus);
    } catch { /* ignore */ }
    const handler = (e: Event) => {
      const code = (e as CustomEvent).detail?.code as SubjectKey | null;
      if (code && SUBJECTS.some((s) => s.code === code)) setOpen(code);
      else setOpen(null);
    };
    window.addEventListener("app:open-subject", handler as EventListener);
    return () => window.removeEventListener("app:open-subject", handler as EventListener);
  }, []);
  const current = SUBJECTS.find((s) => s.code === open);
  const { isPremium } = useSubscription();
  const handleToolClick = (t: Tool) => {
    const free = t.placeholder ? false : FREE_TOOLS.has(t.key);
    if (!free && !isPremium) {
      toast.error(isRTL ? "هذه الأداة متاحة للمشتركين في البريميوم فقط." : "This tool is available for Premium members only.");
      onSelect("premium" as MainMenuChoice);
      return;
    }
    // If launched from a focused subject page, preset the subject so tools
    // that normally show a subject picker (e.g. flashcards) jump straight
    // to the chapters step.
    if (open) {
      try {
        localStorage.setItem("app_subject_v1", open);
      } catch { /* ignore */ }
      window.dispatchEvent(new CustomEvent("app:set-subject", { detail: { subject: open } }));
    }
    // For placeholder tools, stash display metadata so the shared page can render it.
    if (t.placeholder) {
      try {
        localStorage.setItem(
          TOOL_PLACEHOLDER_KEY,
          JSON.stringify({ en: t.en, ar: t.ar, descEn: t.descEn, descAr: t.descAr }),
        );
      } catch { /* ignore */ }
    }
    onSelect(t.key);
  };

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={() => {
            if (current) {
              setOpen(null);
              try { localStorage.removeItem("app_subject_focus_v1"); } catch { /* ignore */ }
            } else {
              onBack();
            }
          }}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? (current ? "كل المواد" : "رجوع") : (current ? "All Subjects" : "Back")}
        </button>

        {!current && (
          <header className="mb-8">
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {isRTL ? "المواد" : "Subjects"}
            </h1>
            <p className="text-muted-foreground mt-1 text-sm md:text-base">
              {isRTL ? "اختر مادة لعرض الأدوات الخاصة بها." : "Pick a subject to see its tools."}
            </p>
          </header>
        )}

        {!current && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-8">
          {SUBJECTS.map((s) => {
            const Icon = s.Icon;
            const active = open === s.code;
            return (
              <motion.button
                key={s.code}
                whileHover={{ y: -2 }}
                whileTap={{ scale: 0.97 }}
                onClick={() => {
                  const next = active ? null : s.code;
                  setOpen(next);
                  try {
                    if (next) localStorage.setItem("app_subject_focus_v1", next);
                    else localStorage.removeItem("app_subject_focus_v1");
                  } catch { /* ignore */ }
                }}
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
        )}

        <AnimatePresence mode="wait">
          {current && (
            <motion.section
              key={current.code}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.25 }}
            >
              <header className="mb-6 flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <current.Icon className="w-6 h-6 text-primary" />
                </div>
                <div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                    {isRTL ? current.ar : current.en}
                  </h1>
                  <p className="text-muted-foreground text-sm">
                    {current.tools.length} {isRTL ? "أدوات لهذه المادة" : "tools for this subject"}
                  </p>
                </div>
              </header>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {current.tools.map((t) => {
                  const Icon = t.Icon;
                  const free = t.placeholder ? false : FREE_TOOLS.has(t.key);
                  const locked = !free && !isPremium;
                  return (
                    <motion.button
                      key={`${t.key}:${t.en}`}
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