import { useState, useEffect } from "react";

interface FlashcardProps {
  question: string;
  answer: string;
  index: number;
  total: number;
  direction: "left" | "right";
  language?: "ar" | "en";
}

export const Flashcard = ({ question, answer, index, total, direction, language = "en" }: FlashcardProps) => {
  const [flipped, setFlipped] = useState(false);
  const labels = language === "ar"
    ? { question: "السؤال", answer: "الإجابة", reveal: "اضغط لإظهار الإجابة", back: "اضغط لرؤية السؤال" }
    : { question: "Question", answer: "Answer", reveal: "Tap to reveal answer", back: "Tap to see question" };

  useEffect(() => {
    setFlipped(false);
  }, [index]);

  const animClass = direction === "right" ? "animate-slide-in-right" : "animate-slide-in-left";

  return (
    <div key={index} className={`perspective w-full max-w-2xl ${animClass}`}>
      <button
        onClick={() => setFlipped((f) => !f)}
        aria-label="Flip card"
        className="relative w-full h-[420px] md:h-[480px] preserve-3d transition-transform duration-700 ease-[cubic-bezier(0.4,0.0,0.2,1)] focus:outline-none group"
        style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)" }}
      >
        {/* Front */}
        <div
          className="absolute inset-0 backface-hidden rounded-[var(--radius)] p-8 md:p-12 flex flex-col justify-between border border-white/10"
          style={{ background: "var(--gradient-card-front)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>{labels.question}</span>
            <span className="font-mono">{String(index + 1).padStart(2, "0")} / {total}</span>
          </div>
          <div className="flex-1 flex items-center justify-center px-2">
            <p className="text-2xl md:text-3xl font-semibold text-center leading-snug text-white">
              {question}
            </p>
          </div>
          <div className="text-center text-xs text-white/50 tracking-widest uppercase group-hover:text-white/80 transition-colors">
            {labels.reveal}
          </div>
        </div>

        {/* Back */}
        <div
          className="absolute inset-0 backface-hidden rotate-y-180 rounded-[var(--radius)] p-8 md:p-12 flex flex-col justify-between border border-white/10"
          style={{ background: "var(--gradient-card-back)", boxShadow: "var(--shadow-card)" }}
        >
          <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em] text-white/60">
            <span>{labels.answer}</span>
            <span className="font-mono">{String(index + 1).padStart(2, "0")} / {total}</span>
          </div>
          <div className="flex-1 flex items-center justify-center px-2">
            <p className="text-2xl md:text-3xl font-semibold text-center leading-snug text-white">
              {answer}
            </p>
          </div>
          <div className="text-center text-xs text-white/50 tracking-widest uppercase group-hover:text-white/80 transition-colors">
            {labels.back}
          </div>
        </div>
      </button>
    </div>
  );
};
