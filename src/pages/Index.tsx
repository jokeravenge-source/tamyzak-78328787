import { useEffect, useMemo, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, RotateCcw } from "lucide-react";
import { flashcards } from "@/data/flashcards";
import { flashcardsCh3Ar } from "@/data/flashcardsCh3Ar";
import { flashcardsCh4Ar } from "@/data/flashcardsCh4Ar";
import { flashcardsCh5Ar } from "@/data/flashcardsCh5Ar";
import { flashcardsCh6Ar } from "@/data/flashcardsCh6Ar";
import { flashcardsCh1 } from "@/data/flashcardsCh1";
import { flashcardsCh2 } from "@/data/flashcardsCh2";
import { flashcardsCh4 } from "@/data/flashcardsCh4";
import { flashcardsCh5 } from "@/data/flashcardsCh5";
import { flashcardsCh6 } from "@/data/flashcardsCh6";
import { flashcardsCh7 } from "@/data/flashcardsCh7";
import { flashcardsCh8 } from "@/data/flashcardsCh8";
import { Flashcard } from "@/components/Flashcard";
import { Button } from "@/components/ui/button";
import type { AppLanguage } from "@/components/LanguageGate";

const decks: Record<string, { title: string; eyebrow: string; cards: typeof flashcards }> = {
  "1": { title: "Flashcards", eyebrow: "Ch 01 · Capacitors", cards: flashcardsCh1 },
  "2": { title: "Flashcards", eyebrow: "Ch 02 · Electromagnetic Induction", cards: flashcardsCh2 },
  "3": { title: "Flashcards", eyebrow: "Ch 03 · Alternating Current", cards: flashcards },
  "4": { title: "Flashcards", eyebrow: "Ch 04 · Electromagnetic Waves", cards: flashcardsCh4 },
  "5": { title: "Flashcards", eyebrow: "Ch 05 · Physical Optics", cards: flashcardsCh5 },
  "6": { title: "Flashcards", eyebrow: "Ch 06 · Modern Physics", cards: flashcardsCh6 },
  "7": { title: "Flashcards", eyebrow: "Ch 07 · Solid State Electronics", cards: flashcardsCh7 },
  "8": { title: "Flashcards", eyebrow: "Ch 08 · Atomic Spectra and Laser", cards: flashcardsCh8 },
};

const copy = {
  en: { chapters: "Chapters", of: "of", shuffle: "Shuffle", reset: "Reset" },
  ar: { chapters: "الفصول", of: "من", shuffle: "خلط", reset: "إعادة" },
};

const Index = ({ language }: { language: AppLanguage }) => {
  const { chapter = "3" } = useParams();
  const baseDeck = decks[chapter] ?? decks["3"];
  const deck = useMemo(
    () => {
      if (language === "ar" && chapter === "3") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 03 · التيار المتناوب", cards: flashcardsCh3Ar };
      }

      if (language === "ar" && chapter === "4") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 04 · الموجات الكهرومغناطيسية", cards: flashcardsCh4Ar };
      }

      if (language === "ar" && chapter === "5") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 05 · البصريات الفيزيائية", cards: flashcardsCh5Ar };
      }

      if (language === "ar" && chapter === "6") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 06 · الفيزياء الحديثة", cards: flashcardsCh6Ar };
      }

      return baseDeck;
    },
    [baseDeck, chapter, language]
  );
  const text = copy[language];
  const [cards, setCards] = useState(deck.cards);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const next = () => {
    setDirection("right");
    setIndex((i) => (i + 1) % cards.length);
  };
  const prev = () => {
    setDirection("left");
    setIndex((i) => (i - 1 + cards.length) % cards.length);
  };
  const shuffle = () => {
    setCards([...cards].sort(() => Math.random() - 0.5));
    setIndex(0);
    setDirection("right");
  };
  const reset = () => {
    setCards(deck.cards);
    setIndex(0);
    setDirection("left");
  };

  useEffect(() => {
    setCards(deck.cards);
    setIndex(0);
  }, [deck]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const card = cards[index];
  const progress = ((index + 1) / cards.length) * 100;

  return (
    <main className="min-h-screen flex flex-col items-center justify-between px-4 py-8 md:py-12 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <Link
        to="/"
        className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 hover:-translate-x-0.5 transition-all duration-300 animate-fade-up"
      >
        <ArrowLeft className="w-4 h-4" />
        <span className="hidden sm:inline">{text.chapters}</span>
      </Link>

      <header className="text-center z-10 animate-fade-up">
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">{deck.eyebrow}</p>
        <h1 className="text-4xl md:text-5xl font-bold gradient-text">{deck.title}</h1>
      </header>

      <section className="w-full flex flex-col items-center gap-8 z-10 my-8">
        <Flashcard
          question={card.q}
          answer={card.a}
          index={index}
          total={cards.length}
          direction={direction}
          language={language}
        />

        {/* Controls */}
        <div className="flex items-center gap-4 md:gap-6" dir="ltr">
          <button
            onClick={prev}
            aria-label="Previous card"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-secondary/60 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-primary hover:scale-110 hover:-translate-x-1 transition-all duration-300 group"
          >
            <ChevronLeft className="w-6 h-6 group-hover:text-primary-foreground" />
          </button>

          <div className="text-center min-w-[80px]">
            <div className="text-2xl font-mono font-bold gradient-text">
              {String(index + 1).padStart(2, "0")}
            </div>
            <div className="text-xs text-muted-foreground tracking-widest">{text.of} {cards.length}</div>
          </div>

          <button
            onClick={next}
            aria-label="Next card"
            className="w-14 h-14 md:w-16 md:h-16 rounded-full bg-secondary/60 backdrop-blur border border-white/10 flex items-center justify-center hover:bg-primary hover:scale-110 hover:translate-x-1 transition-all duration-300 group"
          >
            <ChevronRight className="w-6 h-6 group-hover:text-primary-foreground" />
          </button>
        </div>

        {/* Progress */}
        <div className="w-full max-w-2xl h-1 bg-secondary/60 rounded-full overflow-hidden">
          <div
            className="h-full transition-all duration-500 ease-out rounded-full"
            style={{ width: `${progress}%`, background: "var(--gradient-primary)" }}
          />
        </div>
      </section>

      <footer className="flex items-center gap-3 z-10 animate-fade-up">
        <Button variant="ghost" size="sm" onClick={shuffle} className="gap-2">
          <Shuffle className="w-4 h-4" /> {text.shuffle}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> {text.reset}
        </Button>
      </footer>
    </main>
  );
};

export default Index;
