import { useEffect, useState } from "react";
import type { AppLanguage } from "@/components/LanguageGate";

const phases = {
  en: ["Thinking", "Searching", "Generating response"],
  ar: ["جاري التفكير", "جاري البحث", "جاري كتابة الرد"],
};

const GeminiStatus = ({ language }: { language: AppLanguage }) => {
  const [i, setI] = useState(0);
  const list = phases[language];
  useEffect(() => {
    setI(0);
    const t1 = setTimeout(() => setI(1), 1100);
    const t2 = setTimeout(() => setI(2), 2600);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  }, [language]);
  return (
    <div className="flex items-center gap-3 py-2">
      <span className="gemini-dot inline-block w-4 h-4 rounded-full" aria-hidden />
      <span className="gemini-shimmer text-sm font-medium">
        {list[i]}
        <span className="opacity-70">…</span>
      </span>
    </div>
  );
};

export default GeminiStatus;