import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Shuffle, RotateCcw, Bookmark, BookmarkCheck, Star } from "lucide-react";
import { Plus, X, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { setRedoRequired, clearRedoAndZombie } from "@/components/ZombieGuard";
import { awardPoints } from "@/lib/points";
import { flashcards } from "@/data/flashcards";
import { flashcardsCh1Ar } from "@/data/flashcardsCh1Ar";
import { flashcardsCh2Ar } from "@/data/flashcardsCh2Ar";
import { flashcardsCh3Ar } from "@/data/flashcardsCh3Ar";
import { flashcardsCh4Ar } from "@/data/flashcardsCh4Ar";
import { flashcardsCh5Ar } from "@/data/flashcardsCh5Ar";
import { flashcardsCh6Ar } from "@/data/flashcardsCh6Ar";
import { flashcardsCh7Ar } from "@/data/flashcardsCh7Ar";
import { flashcardsCh8Ar } from "@/data/flashcardsCh8Ar";
import { flashcardsBioCh1Ar } from "@/data/flashcardsBioCh1Ar";
import { flashcardsBioCh2Ar } from "@/data/flashcardsBioCh2Ar";
import { flashcardsBioCh5Ar } from "@/data/flashcardsBioCh5Ar";
import { flashcardsBioCh1En } from "@/data/flashcardsBioCh1En";
import { flashcardsBioCh2En } from "@/data/flashcardsBioCh2En";
import { flashcardsBioCh3En } from "@/data/flashcardsBioCh3En";
import { flashcardsBioCh3Ar } from "@/data/flashcardsBioCh3Ar";
import { flashcardsBioCh5En } from "@/data/flashcardsBioCh5En";
import { flashcardsChemCh1En } from "@/data/flashcardsChemCh1En";
import { flashcardsChemCh2En } from "@/data/flashcardsChemCh2En";
import { flashcardsChemCh3En } from "@/data/flashcardsChemCh3En";
import { flashcardsChemCh4En } from "@/data/flashcardsChemCh4En";
import { flashcardsChemCh5En } from "@/data/flashcardsChemCh5En";
import { flashcardsChemCh6En } from "@/data/flashcardsChemCh6En";
import { flashcardsChemCh1Ar } from "@/data/flashcardsChemCh1Ar";
import { flashcardsChemCh2Ar } from "@/data/flashcardsChemCh2Ar";
import { flashcardsChemCh3Ar } from "@/data/flashcardsChemCh3Ar";
import { flashcardsChemCh4Ar } from "@/data/flashcardsChemCh4Ar";
import { flashcardsChemCh5Ar } from "@/data/flashcardsChemCh5Ar";
import { flashcardsChemCh6Ar } from "@/data/flashcardsChemCh6Ar";
import { flashcardsArabicLit1Ar } from "@/data/flashcardsArabicLit1Ar";
import { flashcardsIslamicMeaningsAr } from "@/data/flashcardsIslamicMeaningsAr";
import { flashcardsEngGrammar1 } from "@/data/flashcardsEngGrammar1";
import { flashcardsFrenchNegationAr } from "@/data/flashcardsFrenchNegationAr";
import { flashcardsFrenchInterrogationAr } from "@/data/flashcardsFrenchInterrogationAr";
import { flashcardsFrenchRelativePronounsAr } from "@/data/flashcardsFrenchRelativePronounsAr";
import { flashcardsFrenchFeminineAr } from "@/data/flashcardsFrenchFeminineAr";
import { flashcardsFrenchPluralAr } from "@/data/flashcardsFrenchPluralAr";
import { flashcardsFrenchAdverbsAr } from "@/data/flashcardsFrenchAdverbsAr";
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
import type { AppSubject } from "@/pages/Subjects";

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

const Index = ({ language, subject }: { language: AppLanguage; subject: AppSubject }) => {
  const { chapter = "3" } = useParams();
  const baseDeck = decks[chapter] ?? decks["3"];
  const [extraCards, setExtraCards] = useState<typeof flashcards>([]);
  const SAVED_KEY = "saved_flashcards_v1";
  type SavedCard = { q: string; a: string; subject: string; chapter: string };
  const [saved, setSaved] = useState<SavedCard[]>(() => {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY) || "[]"); } catch { return []; }
  });
  const [savedView, setSavedView] = useState(false);
  const persistSaved = (next: SavedCard[]) => {
    setSaved(next);
    localStorage.setItem(SAVED_KEY, JSON.stringify(next));
  };
  useEffect(() => {
    let active = true;
    supabase
      .from("custom_flashcards")
      .select("question, answer")
      .eq("subject", subject)
      .eq("chapter", String(chapter))
      .eq("language", language)
      .eq("approved", true)
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (!active) return;
        setExtraCards((data ?? []).map((r) => ({ q: r.question, a: r.answer })));
      });
    return () => { active = false; };
  }, [subject, chapter, language]);
  const loading = false;
  const useRemote = false;

  const deck = useMemo(
    () => {
      if (subject === "biology" && chapter === "1") {
        return {
          title: "بطاقات تعليمية",
          eyebrow: language === "ar" ? "الأحياء · الخلية" : "Biology · The Cell",
          cards: language === "ar" ? flashcardsBioCh1Ar : flashcardsBioCh1En,
        };
      }
      if (subject === "biology" && chapter === "2") {
        return {
          title: "بطاقات تعليمية",
          eyebrow: language === "ar" ? "الأحياء · الأنسجة" : "Biology · Tissues",
          cards: language === "ar" ? flashcardsBioCh2Ar : flashcardsBioCh2En,
        };
      }
      if (subject === "biology" && chapter === "3") {
        return {
          title: "بطاقات تعليمية",
          eyebrow: language === "ar" ? "الأحياء · التكاثر" : "Biology · Reproduction",
          cards: language === "ar" ? flashcardsBioCh3Ar : flashcardsBioCh3En,
        };
      }
      if (subject === "biology" && chapter === "5") {
        return {
          title: "بطاقات تعليمية",
          eyebrow: language === "ar" ? "الأحياء · الوراثة" : "Biology · Genetics",
          cards: language === "ar" ? flashcardsBioCh5Ar : flashcardsBioCh5En,
        };
      }

      if (subject === "chemistry") {
        const chemEn: Record<string, typeof flashcards> = {
          "1": flashcardsChemCh1En, "2": flashcardsChemCh2En, "3": flashcardsChemCh3En,
          "4": flashcardsChemCh4En, "5": flashcardsChemCh5En, "6": flashcardsChemCh6En,
        };
        const chemAr: Record<string, typeof flashcards> = {
          "1": flashcardsChemCh1Ar, "2": flashcardsChemCh2Ar, "3": flashcardsChemCh3Ar,
          "4": flashcardsChemCh4Ar, "5": flashcardsChemCh5Ar, "6": flashcardsChemCh6Ar,
        };
        const cards = (language === "ar" ? chemAr : chemEn)[chapter];
        if (cards) {
          return {
            title: "بطاقات تعليمية",
            eyebrow: language === "ar" ? `الكيمياء · الفصل ${chapter}` : `Chemistry · Chapter ${chapter}`,
            cards,
          };
        }
      }

      if (subject === "arabic" && chapter === "1") {
        return {
          title: "بطاقات تعليمية",
          eyebrow: language === "ar" ? "العربية · الأدب" : "Arabic · Literature",
          cards: flashcardsArabicLit1Ar,
        };
      }

      if (subject === "islamic" && chapter === "1") {
        return {
          title: "بطاقات تعليمية",
          eyebrow: "التربية الإسلامية · المعاني",
          cards: flashcardsIslamicMeaningsAr,
        };
      }

      if (subject === "english" && chapter === "1") {
        return {
          title: language === "ar" ? "بطاقات تعليمية" : "Flashcards",
          eyebrow: language === "ar" ? "الإنجليزية · القواعد · الوحدة 1" : "English · Grammar · Unit 1",
          cards: flashcardsEngGrammar1,
        };
      }

      if (subject === "french") {
        const frenchDecks: Record<string, { ar: string; en: string; cards: typeof flashcards }> = {
          "1": { ar: "الفرنسية · النفي", en: "French · Negation", cards: flashcardsFrenchNegationAr },
          "2": { ar: "الفرنسية · الاستفهام", en: "French · Interrogation", cards: flashcardsFrenchInterrogationAr },
          "3": { ar: "الفرنسية · ضمائر الوصل", en: "French · Relative Pronouns", cards: flashcardsFrenchRelativePronounsAr },
          "4": { ar: "الفرنسية · التأنيث", en: "French · Feminization", cards: flashcardsFrenchFeminineAr },
          "5": { ar: "الفرنسية · الجمع", en: "French · Plural", cards: flashcardsFrenchPluralAr },
          "6": { ar: "الفرنسية · اشتقاق الظروف", en: "French · Adverbs", cards: flashcardsFrenchAdverbsAr },
        };
        const d = frenchDecks[chapter];
        if (d) {
          return {
            title: language === "ar" ? "بطاقات تعليمية" : "Flashcards",
            eyebrow: language === "ar" ? d.ar : d.en,
            cards: d.cards,
          };
        }
      }

      if (language === "ar" && chapter === "1") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 01 · المتسعات", cards: flashcardsCh1Ar };
      }

      if (language === "ar" && chapter === "2") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 02 · الحث الكهرومغناطيسي", cards: flashcardsCh2Ar };
      }

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

      if (language === "ar" && chapter === "7") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 07 · إلكترونيات الحالة الصلبة", cards: flashcardsCh7Ar };
      }

      if (language === "ar" && chapter === "8") {
        return { ...baseDeck, title: "بطاقات تعليمية", eyebrow: "الفصل 08 · الأطياف الذرية والليزر", cards: flashcardsCh8Ar };
      }

      return baseDeck;
    },
    [baseDeck, chapter, language, subject]
  );
  const text = copy[language];
  const [cards, setCards] = useState([...deck.cards, ...extraCards]);
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState<"left" | "right">("right");

  const next = () => {
    setDirection("right");
    setIndex((i) => {
      const ni = (i + 1) % cards.length;
      if (i === cards.length - 1) setShowRating(true);
      return ni;
    });
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

  // Rebuild deck only when the underlying source changes — reset index here.
  useEffect(() => {
    if (savedView) {
      setCards(saved.map((s) => ({ q: s.q, a: s.a })));
    } else {
      setCards([...deck.cards, ...extraCards]);
    }
    setIndex(0);
    // intentionally exclude `saved` so bookmarking a card doesn't reset position
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [deck, extraCards, savedView]);

  // When in saved view and the saved list changes (e.g. unbookmark),
  // update cards in place without snapping back to the first card.
  useEffect(() => {
    if (!savedView) return;
    setCards((prev) => {
      const next = saved.map((s) => ({ q: s.q, a: s.a }));
      setIndex((i) => Math.min(i, Math.max(0, next.length - 1)));
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saved]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  const card = cards[index];
  const progress = cards.length ? ((index + 1) / cards.length) * 100 : 0;
  const isSaved = !!card && saved.some((s) => s.q === card.q && s.a === card.a);
  const toggleSave = () => {
    if (!card) return;
    if (isSaved) {
      persistSaved(saved.filter((s) => !(s.q === card.q && s.a === card.a)));
    } else {
      persistSaved([...saved, { q: card.q, a: card.a, subject, chapter: String(chapter) }]);
    }
  };

  // User-submitted flashcards (await admin approval)
  const [showSubmit, setShowSubmit] = useState(false);
  const [showRating, setShowRating] = useState(false);

  const handleRating = (level: "good" | "bad") => {
    setShowRating(false);
    if (level === "good") {
      clearRedoAndZombie();
      // Award 2 points per (subject, chapter) deck — unique per user via DB constraint
      awardPoints("flashcard", `${subject}:${chapter}`);
      toast.success(language === "ar" ? "أحسنت! استمر." : "Great work — keep it up!");
    } else {
      setRedoRequired(subject, String(chapter), 10);
      toast.warning(
        language === "ar"
          ? "أعد البطاقات الآن — وإلا سيتحول الموقع إلى وضع الزومبي!"
          : "Redo these flashcards now — or the site will turn into zombie mode!",
        { duration: 8000 }
      );
    }
  };
  const [submitQ, setSubmitQ] = useState("");
  const [submitA, setSubmitA] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const submitFlashcard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!submitQ.trim() || !submitA.trim()) return;
    setSubmitting(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { error } = await supabase.from("custom_flashcards").insert({
        subject,
        chapter: String(chapter),
        language,
        question: submitQ.trim(),
        answer: submitA.trim(),
        created_by: u.user.id,
        approved: false,
      });
      if (error) throw error;
      toast.success(language === "ar" ? "تم الإرسال — بانتظار موافقة المسؤول" : "Submitted — waiting for admin approval");
      setSubmitQ(""); setSubmitA(""); setShowSubmit(false);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally { setSubmitting(false); }
  };

  if (useRemote && (loading || cards.length === 0)) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-4 py-8 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
        <Link
          to="/"
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-2 px-4 py-2 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="hidden sm:inline">{text.chapters}</span>
        </Link>
        <p className="text-xs uppercase tracking-[0.4em] text-muted-foreground mb-3">{deck.eyebrow}</p>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-4">{deck.title}</h1>
        <p className="text-muted-foreground">
          {loading
            ? language === "ar" ? "جارٍ التحميل..." : "Loading..."
            : language === "ar" ? "لا توجد بطاقات بعد" : "No cards yet"}
        </p>
      </main>
    );
  }

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

      <footer className="w-full max-w-2xl overflow-x-auto overflow-y-hidden flex items-center gap-3 z-10 animate-fade-up whitespace-nowrap px-1 pb-1 [scrollbar-width:thin]">
        <Button variant="ghost" size="sm" onClick={shuffle} className="gap-2 shrink-0">
          <Shuffle className="w-4 h-4" /> {text.shuffle}
        </Button>
        <Button variant="ghost" size="sm" onClick={reset} className="gap-2 shrink-0">
          <RotateCcw className="w-4 h-4" /> {text.reset}
        </Button>
        <Button variant="ghost" size="sm" onClick={toggleSave} className="gap-2 shrink-0" disabled={!card}>
          {isSaved ? <BookmarkCheck className="w-4 h-4 text-primary" /> : <Bookmark className="w-4 h-4" />}
          {language === "ar" ? (isSaved ? "محفوظة" : "حفظ") : (isSaved ? "Saved" : "Save")}
        </Button>
        <Button
          variant={savedView ? "default" : "ghost"}
          size="sm"
          onClick={() => setSavedView((v) => !v)}
          className="gap-2 shrink-0"
        >
          <Star className="w-4 h-4" />
          {language === "ar"
            ? (savedView ? "كل البطاقات" : `المحفوظة (${saved.length})`)
            : (savedView ? "All cards" : `Saved (${saved.length})`)}
        </Button>
        <Button variant="ghost" size="sm" onClick={() => setShowSubmit(true)} className="gap-2 shrink-0">
          <Plus className="w-4 h-4" />
          {language === "ar" ? "أضف بطاقة" : "Submit card"}
        </Button>
      </footer>

      {showSubmit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4" onClick={() => !submitting && setShowSubmit(false)}>
          <form onSubmit={submitFlashcard} onClick={(e) => e.stopPropagation()} dir={language === "ar" ? "rtl" : "ltr"} className="w-full max-w-md rounded-3xl border border-white/10 bg-secondary p-6 space-y-4 animate-fade-up">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold gradient-text">
                {language === "ar" ? "أرسل بطاقة جديدة" : "Submit a flashcard"}
              </h2>
              <button type="button" onClick={() => setShowSubmit(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
            </div>
            <p className="text-xs text-muted-foreground">
              {language === "ar"
                ? `سيُراجع المسؤول بطاقتك قبل ظهورها. (${subject} · ${chapter} · ${language.toUpperCase()})`
                : `An admin will review your card before it appears. (${subject} · Ch ${chapter} · ${language.toUpperCase()})`}
            </p>
            <div>
              <label className="text-xs text-muted-foreground">{language === "ar" ? "السؤال *" : "Question *"}</label>
              <textarea required value={submitQ} onChange={(e) => setSubmitQ(e.target.value)} rows={2} maxLength={500} className="mt-1 w-full px-3 py-2 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{language === "ar" ? "الإجابة *" : "Answer *"}</label>
              <textarea required value={submitA} onChange={(e) => setSubmitA(e.target.value)} rows={4} maxLength={2000} className="mt-1 w-full px-3 py-2 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm" />
            </div>
            <button type="submit" disabled={submitting || !submitQ.trim() || !submitA.trim()} className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {submitting
                ? <><Loader2 className="w-4 h-4 animate-spin" /> {language === "ar" ? "جارٍ الإرسال…" : "Submitting…"}</>
                : <><Plus className="w-4 h-4" /> {language === "ar" ? "إرسال للموافقة" : "Submit for approval"}</>}
            </button>
          </form>
        </div>
      )}

      {showRating && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm px-4">
          <div dir={language === "ar" ? "rtl" : "ltr"} className="w-full max-w-md rounded-3xl border border-white/10 bg-secondary p-6 space-y-5 animate-fade-up text-center">
            <h2 className="text-2xl font-bold gradient-text">
              {language === "ar" ? "كيف كان مستواك؟" : "How did you do?"}
            </h2>
            <p className="text-sm text-muted-foreground">
              {language === "ar" ? "قيّم نفسك بصراحة بعد إنهاء البطاقات." : "Rate yourself honestly after finishing the deck."}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => handleRating("good")}
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 font-semibold"
              >
                {language === "ar" ? "جيد 👍" : "Good 👍"}
              </button>
              <button
                onClick={() => handleRating("bad")}
                className="flex-1 h-12 rounded-xl border border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20 font-semibold"
              >
                {language === "ar" ? "سيئ 👎" : "Bad 👎"}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Index;
