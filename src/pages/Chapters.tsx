import { useNavigate } from "react-router-dom";
import { Lock, ArrowRight, Sparkles } from "lucide-react";

const chapters = [
  { n: 1, title: "Electric Current", subtitle: "Foundations of charge flow", locked: true },
  { n: 2, title: "Magnetic Effects", subtitle: "Fields & forces", locked: true },
  { n: 3, title: "Alternating Current", subtitle: "AC circuits, R-L-C, resonance", locked: false },
  { n: 4, title: "Electromagnetic Waves", subtitle: "Maxwell, antennas & modulation", locked: false },
  { n: 5, title: "Wave Optics", subtitle: "Interference & diffraction", locked: true },
  { n: 6, title: "Modern Physics", subtitle: "Photons & matter waves", locked: true },
  { n: 7, title: "Atomic Structure", subtitle: "Bohr & beyond", locked: true },
  { n: 8, title: "Nuclear Physics", subtitle: "Decay & reactions", locked: true },
];

const Chapters = () => {
  const navigate = useNavigate();

  const handleClick = (chapter: typeof chapters[number]) => {
    if (!chapter.locked) navigate(`/flashcards/${chapter.n}`);
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden">
      {/* Ambient blobs */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute top-1/3 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      <div className="pointer-events-none absolute -bottom-40 left-1/3 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl animate-float" style={{ animationDelay: "4s" }} />

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">AC Physics</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">
          Choose a Chapter
        </h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">
          Eight chapters of physics, distilled into beautiful flashcards. Start with what you need.
        </p>
      </header>

      <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 z-10 relative">
        {chapters.map((c, i) => {
          const isAvailable = !c.locked;
          return (
            <button
              key={c.n}
              onClick={() => handleClick(c)}
              disabled={c.locked}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`group relative text-left rounded-3xl p-6 h-56 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up
                ${isAvailable
                  ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                  : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"}`}
            >
              {/* Gradient sheen for available */}
              {isAvailable && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }}
                />
              )}

              {/* Number */}
              <div className="relative z-10 flex items-start justify-between">
                <span
                  className={`text-6xl font-bold font-mono leading-none ${
                    isAvailable ? "gradient-text" : "text-muted-foreground/40"
                  }`}
                >
                  {String(c.n).padStart(2, "0")}
                </span>
                {c.locked ? (
                  <Lock className="w-4 h-4 text-muted-foreground/60" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </div>

              {/* Title */}
              <div className="relative z-10 absolute bottom-6 left-6 right-6">
                <h3 className={`text-lg font-semibold mb-1 ${isAvailable ? "text-foreground" : "text-muted-foreground"}`}>
                  {c.title}
                </h3>
                <p className="text-xs text-muted-foreground line-clamp-1">{c.subtitle}</p>
              </div>

              {/* Bottom border accent */}
              {isAvailable && (
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700"
                  style={{ background: "var(--gradient-primary)" }}
                />
              )}
            </button>
          );
        })}
      </section>

      <footer className="text-center mt-16 text-xs text-muted-foreground tracking-widest z-10 relative">
        CHAPTERS 03 & 04 ARE AVAILABLE — MORE COMING SOON
      </footer>
    </main>
  );
};

export default Chapters;
