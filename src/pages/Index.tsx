import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { ChevronLeft, ChevronRight, Shuffle, RotateCcw } from "lucide-react";
import { flashcards } from "@/data/flashcards";
import { flashcardsCh4 } from "@/data/flashcardsCh4";
import { Flashcard } from "@/components/Flashcard";
import { Button } from "@/components/ui/button";

const decks: Record<string, { title: string; eyebrow: string; cards: typeof flashcards }> = {
  "3": { title: "Flashcards", eyebrow: "Ch 03 · Alternating Current", cards: flashcards },
  "4": { title: "Flashcards", eyebrow: "Ch 04 · Electromagnetic Waves", cards: flashcardsCh4 },
};

const Index = () => {
  const { chapter = "3" } = useParams();
  const deck = decks[chapter] ?? decks["3"];
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
    <main className="min-h-screen flex flex-col items-center justify-between px-4 py-8 md:py-12 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-96 h-96 rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-96 h-96 rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

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
        />

        {/* Controls */}
        <div className="flex items-center gap-4 md:gap-6">
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
            <div className="text-xs text-muted-foreground tracking-widest">of {cards.length}</div>
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
          <Shuffle className="w-4 h-4" /> Shuffle
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-2">
          <RotateCcw className="w-4 h-4" /> Reset
        </Button>
      </footer>
    </main>
  );
};

export default Index;
