import { motion } from "framer-motion";
import { Sparkles, RefreshCw } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import type { AppSubject } from "@/pages/Subjects";

const LABELS: Record<AppSubject, { en: string; ar: string }> = {
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
  english: { en: "English", ar: "الإنجليزية" },
  french: { en: "French", ar: "الفرنسية" },
  arabic: { en: "Arabic", ar: "العربية" },
  islamic: { en: "Islamic", ar: "الإسلامية" },
  revision: { en: "Revision", ar: "المراجعة" },
};

const FocusSubjectPill = ({
  language,
  subject,
  onChange,
}: {
  language: AppLanguage;
  subject: AppSubject;
  onChange: () => void;
}) => {
  const label = LABELS[subject]?.[language] ?? subject;
  return (
    <motion.button
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={onChange}
      className="fixed z-30 top-3 right-3 md:top-4 md:right-4 inline-flex items-center gap-2 h-9 px-3 rounded-full border border-primary/40 bg-secondary/70 backdrop-blur text-xs font-medium text-foreground hover:border-primary hover:shadow-[var(--shadow-glow)] transition"
      dir={language === "ar" ? "rtl" : "ltr"}
      aria-label={language === "ar" ? "تغيير المادة" : "Change focus subject"}
    >
      <Sparkles className="w-3.5 h-3.5 text-primary" />
      <span className="text-muted-foreground">
        {language === "ar" ? "المادة" : "Focus"}:
      </span>
      <span>{label}</span>
      <RefreshCw className="w-3.5 h-3.5 text-primary/80" />
    </motion.button>
  );
};

export default FocusSubjectPill;