import { useState } from "react";
import { motion } from "framer-motion";
import { Sparkles, Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, Moon, ArrowRight, Send } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECT_STORAGE_KEY, type AppSubject } from "@/pages/Subjects";

export const FOCUS_SUBJECT_PICKED_KEY = "app_focus_subject_picked_v1";

const SUBJECTS: Array<{ code: AppSubject; en: string; ar: string; Icon: React.ComponentType<{ className?: string }>; aliases: string[] }> = [
  { code: "physics", en: "Physics", ar: "الفيزياء", Icon: Atom, aliases: ["physics", "فيزياء", "الفيزياء"] },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء", Icon: FlaskConical, aliases: ["chem", "chemistry", "كيمياء", "الكيمياء"] },
  { code: "biology", en: "Biology", ar: "الأحياء", Icon: Leaf, aliases: ["bio", "biology", "احياء", "الأحياء", "الاحياء"] },
  { code: "english", en: "English", ar: "الإنجليزية", Icon: BookOpen, aliases: ["english", "eng", "انجليزي", "الإنجليزية", "الانجليزية"] },
  { code: "french", en: "French", ar: "الفرنسية", Icon: LangIcon, aliases: ["french", "فرنسي", "الفرنسية"] },
  { code: "arabic", en: "Arabic", ar: "العربية", Icon: BookOpen, aliases: ["arabic", "عربي", "العربية"] },
  { code: "islamic", en: "Islamic", ar: "الإسلامية", Icon: Moon, aliases: ["islamic", "اسلامية", "الإسلامية", "دين"] },
];

const copy = {
  en: {
    badge: "Your Focus",
    title: "Which subject do you want to study?",
    description: "Pick one subject and Tamayzak will tailor the whole experience around it. You can change it any time.",
    placeholder: "Type a subject (e.g. Physics)…",
    confirm: "Start studying",
    or: "or pick one",
    invalid: "I don't know that subject yet — try one of the cards below.",
  },
  ar: {
    badge: "تركيزك",
    title: "أي مادة تريد دراستها؟",
    description: "اختر مادة واحدة وسنُخصّص لك تجربة تميّزك حولها. تقدر تغيّرها بأي وقت.",
    placeholder: "اكتب اسم المادة (مثال: الفيزياء)…",
    confirm: "ابدأ الدراسة",
    or: "أو اختر من القائمة",
    invalid: "ما عرفت المادة — جرّب من البطاقات بالأسفل.",
  },
} as const;

const SubjectFocusPicker = ({
  language,
  onPick,
}: {
  language: AppLanguage;
  onPick: (subject: AppSubject) => void;
}) => {
  const text = copy[language];
  const [typed, setTyped] = useState("");
  const [error, setError] = useState<string | null>(null);

  const commit = (code: AppSubject) => {
    try {
      localStorage.setItem(SUBJECT_STORAGE_KEY, code);
      localStorage.setItem(FOCUS_SUBJECT_PICKED_KEY, "1");
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent("app:set-subject", { detail: { subject: code } }));
    onPick(code);
  };

  const submitTyped = () => {
    const q = typed.trim().toLowerCase();
    if (!q) return;
    const match = SUBJECTS.find((s) => s.aliases.some((a) => a.toLowerCase() === q || q.includes(a.toLowerCase())));
    if (match) {
      setError(null);
      commit(match.code);
    } else {
      setError(text.invalid);
    }
  };

  return (
    <main
      className="min-h-screen w-full px-4 py-10 md:py-16 relative overflow-hidden flex flex-col items-center justify-center"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <motion.header
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="text-center max-w-2xl mx-auto z-10 relative"
      >
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{text.badge}</span>
        </div>
        <h1 className="text-3xl md:text-5xl font-bold gradient-text leading-[1.15] mb-4">{text.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-lg mx-auto">{text.description}</p>
      </motion.header>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15 }}
        className="w-full max-w-md mx-auto mt-8 z-10 relative"
      >
        <div className="flex items-center gap-2 h-12 px-4 rounded-full border border-primary/30 bg-secondary/60 backdrop-blur focus-within:border-primary transition-colors">
          <input
            value={typed}
            onChange={(e) => { setTyped(e.target.value); setError(null); }}
            onKeyDown={(e) => { if (e.key === "Enter") submitTyped(); }}
            placeholder={text.placeholder}
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
            dir={language === "ar" ? "rtl" : "ltr"}
          />
          <button
            onClick={submitTyped}
            aria-label={text.confirm}
            className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
        {error && <p className="mt-2 text-xs text-destructive text-center">{error}</p>}
      </motion.div>

      <p className="mt-6 text-xs uppercase tracking-[0.3em] text-muted-foreground z-10 relative">{text.or}</p>

      <motion.section
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
        className="max-w-4xl w-full mx-auto mt-6 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 z-10 relative"
      >
        {SUBJECTS.map((s) => {
          const Icon = s.Icon;
          return (
            <motion.button
              key={s.code}
              variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => commit(s.code)}
              className="group relative rounded-2xl p-4 h-28 border border-primary/30 bg-secondary/40 backdrop-blur hover:border-primary hover:shadow-[var(--shadow-glow)] transition-all overflow-hidden text-start"
            >
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center mb-2">
                <Icon className="w-5 h-5 text-primary" />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-semibold text-foreground">
                  {language === "ar" ? s.ar : s.en}
                </span>
                <ArrowRight className="w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </motion.button>
          );
        })}
      </motion.section>
    </main>
  );
};

export default SubjectFocusPicker;