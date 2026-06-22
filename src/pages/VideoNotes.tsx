import { useState } from "react";
import { ArrowLeft, Loader2, Youtube, Copy, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, Layers, BrainCircuit, Sparkles, Check, X, Plus, Save, RotateCw, Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECTS_ORDER, getChaptersForSubject, type BankSubject } from "@/data/subjectChapters";

const copy = {
  en: {
    title: "Video to Notes",
    subtitle: "Paste a YouTube link — we transcribe it and turn it into clean study notes.",
    placeholder: "https://www.youtube.com/watch?v=...",
    generate: "Generate notes",
    working: "Transcribing & writing notes…",
    back: "Back",
    notes: "Notes",
    copy: "Copy",
    copied: "Copied to clipboard",
    invalid: "Please paste a valid YouTube link.",
    failed: "Could not generate notes.",
    retrying: "The AI is busy. Retrying shortly…",
    status: {
      starting: "Starting…",
      retrying: (n: number, max: number) => `AI is busy — retrying (attempt ${n} of ${max})`,
      success: "Notes ready",
      failed: "Generation failed",
    },
    parts: "Video parts",
    part: "Part",
    flashcardsBtn: "Generate flashcards",
    flashcardsTitle: "Flashcards from this video",
    mcqBtn: "Test myself with MCQs",
    mcqTitle: "Test from this video",
    generatingCards: "Creating flashcards…",
    generatingMcq: "Creating questions…",
    addToDeck: "Save to deck",
    pickSubject: "Subject",
    pickChapter: "Chapter",
    saved: "Saved — waiting for admin approval",
    needSubject: "Pick a subject and chapter first.",
    cardFront: "Question",
    cardBack: "Answer",
    addAll: "Save all to deck",
    addedAll: (n: number) => `Saved ${n} cards — waiting for approval`,
    question: "Question",
    of: "of",
    next: "Next",
    finish: "Finish",
    explanation: "Explanation",
    hint: "Hint",
    showHint: "Show hint",
    yourScore: "Your Score",
    restartQuiz: "New quiz",
    qCount: "Number of questions",
    cardCount: "Number of flashcards",
  },
  ar: {
    title: "من الفيديو إلى ملاحظات",
    subtitle: "ألصق رابط يوتيوب — نُفرّغه نصياً ونحوّله إلى ملاحظات دراسية مرتبة.",
    placeholder: "https://www.youtube.com/watch?v=...",
    generate: "إنشاء الملاحظات",
    working: "جاري التفريغ وكتابة الملاحظات…",
    back: "رجوع",
    notes: "الملاحظات",
    copy: "نسخ",
    copied: "تم النسخ",
    invalid: "الرجاء لصق رابط يوتيوب صالح.",
    failed: "تعذّر إنشاء الملاحظات.",
    retrying: "الذكاء الاصطناعي مشغول حالياً. سنعيد المحاولة بعد قليل…",
    status: {
      starting: "جارٍ البدء…",
      retrying: (n: number, max: number) => `الذكاء الاصطناعي مشغول — إعادة المحاولة (${n} من ${max})`,
      success: "الملاحظات جاهزة",
      failed: "فشل الإنشاء",
    },
    parts: "أجزاء الفيديو",
    part: "الجزء",
    flashcardsBtn: "توليد بطاقات مراجعة",
    flashcardsTitle: "بطاقات من هذا الفيديو",
    mcqBtn: "اختبر نفسك بأسئلة",
    mcqTitle: "اختبار من هذا الفيديو",
    generatingCards: "جارٍ إنشاء البطاقات…",
    generatingMcq: "جارٍ إنشاء الأسئلة…",
    addToDeck: "حفظ في المجموعة",
    pickSubject: "المادة",
    pickChapter: "الفصل",
    saved: "تم الإرسال — بانتظار موافقة المسؤول",
    needSubject: "اختر المادة والفصل أولاً.",
    cardFront: "السؤال",
    cardBack: "الإجابة",
    addAll: "حفظ الكل في المجموعة",
    addedAll: (n: number) => `تم حفظ ${n} بطاقة — بانتظار الموافقة`,
    question: "سؤال",
    of: "من",
    next: "التالي",
    finish: "إنهاء",
    explanation: "الشرح",
    hint: "تلميح",
    showHint: "عرض تلميح",
    yourScore: "نتيجتك",
    restartQuiz: "اختبار جديد",
    qCount: "عدد الأسئلة",
    cardCount: "عدد البطاقات",
  },
} as const;

const isYouTubeUrl = (u: string) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(u.trim());

type Part = { title: string; notes: string };
type Card = { q: string; a: string };
type MCQItem = { question: string; choices: string[]; answer_index: number; explanation: string; hint?: string };

const VideoNotes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  const [parts, setParts] = useState<Part[]>([]);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [transcript, setTranscript] = useState("");
  type Status =
    | { kind: "idle" }
    | { kind: "working"; message: string }
    | { kind: "retrying"; attempt: number; max: number }
    | { kind: "success" }
    | { kind: "failed"; message: string };
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Flashcards
  const [cards, setCards] = useState<Card[]>([]);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const [subject, setSubject] = useState<BankSubject | "">("");
  const [chapter, setChapter] = useState<string>("");

  // MCQ
  const [mcqs, setMcqs] = useState<MCQItem[]>([]);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqRevealed, setMcqRevealed] = useState(false);
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqHint, setMcqHint] = useState(false);
  const [mcqDone, setMcqDone] = useState(false);

  const run = async () => {
    if (!isYouTubeUrl(url)) {
      toast.error(t.invalid);
      setStatus({ kind: "failed", message: t.invalid });
      return;
    }
    setLoading(true);
    setNotes("");
    setParts([]);
    setCards([]); setMcqs([]); setMcqDone(false); setSavedIdx(new Set()); setTranscript("");
    setStatus({ kind: "working", message: t.status.starting });
    try {
      const maxAttempts = 4;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt === 1) setStatus({ kind: "working", message: t.working });
        const { data, error } = await supabase.functions.invoke("video-notes", {
          body: { url: url.trim(), language },
        });
        if (error) { lastErr = error; }
        else if ((data as any)?.error) {
          lastErr = new Error((data as any).message || (data as any).error);
          if ((data as any).retryable === false) break;
        } else if ((data as any)?.notes) {
          setNotes((data as any).notes);
          const ps = Array.isArray((data as any).parts) ? (data as any).parts as Part[] : [];
          setParts(ps.length ? ps : [{ title: t.notes, notes: (data as any).notes }]);
          setOpenIdx(0);
          if (typeof (data as any).transcript === "string") setTranscript((data as any).transcript);
          setStatus({ kind: "success" });
          lastErr = null;
          break;
        } else {
          lastErr = new Error(t.failed);
        }
        if (attempt < maxAttempts) {
          setStatus({ kind: "retrying", attempt: attempt + 1, max: maxAttempts });
          const retryAfterMs = Number((data as any)?.retryAfter || 0) * 1000;
          const delay = Math.max(retryAfterMs, Math.min(8000, 600 * 2 ** (attempt - 1)) + Math.random() * 250);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      if (lastErr) throw lastErr;
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || t.failed;
      toast.error(msg);
      setStatus({ kind: "failed", message: msg });
    } finally {
      setLoading(false);
    }
  };

  const generateFlashcards = async () => {
    if (cardsLoading) return;
    setCardsLoading(true);
    setCards([]); setSavedIdx(new Set());
    try {
      const { data, error } = await supabase.functions.invoke("video-notes", {
        body: { url: url.trim(), language, mode: "flashcards", transcript, count: 15 },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const list = ((data as any)?.cards || []) as Card[];
      if (!list.length) throw new Error(t.failed);
      setCards(list);
    } catch (e: any) {
      toast.error(e?.message || t.failed);
    } finally {
      setCardsLoading(false);
    }
  };

  const saveOneCard = async (idx: number) => {
    if (!subject || !chapter) { toast.error(t.needSubject); return; }
    setSavingIdx(idx);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const c = cards[idx];
      const { error } = await supabase.from("custom_flashcards").insert({
        subject, chapter: String(chapter), language,
        question: c.q, answer: c.a, created_by: u.user.id, approved: false,
      });
      if (error) throw error;
      setSavedIdx((s) => new Set(s).add(idx));
      toast.success(t.saved);
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    } finally {
      setSavingIdx(null);
    }
  };

  const saveAllCards = async () => {
    if (!subject || !chapter) { toast.error(t.needSubject); return; }
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const rows = cards.map((c) => ({
        subject, chapter: String(chapter), language,
        question: c.q, answer: c.a, created_by: u.user!.id, approved: false,
      }));
      const { error } = await supabase.from("custom_flashcards").insert(rows);
      if (error) throw error;
      setSavedIdx(new Set(cards.map((_, i) => i)));
      toast.success(t.addedAll(rows.length));
    } catch (e: any) {
      toast.error(e?.message || "Failed");
    }
  };

  const generateMcqs = async () => {
    if (mcqLoading) return;
    if (!transcript && !notes) { toast.error(t.failed); return; }
    setMcqLoading(true);
    setMcqs([]); setMcqIdx(0); setMcqSelected(null); setMcqRevealed(false); setMcqScore(0); setMcqDone(false); setMcqHint(false);
    try {
      const { data, error } = await supabase.functions.invoke("generate-mcq", {
        body: { text: transcript || notes, count: 10, language },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const qs: MCQItem[] = ((data as any)?.questions || []).filter((q: any) => q?.choices?.length === 4);
      if (!qs.length) throw new Error(t.failed);
      setMcqs(qs);
    } catch (e: any) {
      toast.error(e?.message || t.failed);
    } finally {
      setMcqLoading(false);
    }
  };

  const submitMcqAnswer = () => {
    if (mcqSelected === null) return;
    const q = mcqs[mcqIdx];
    if (mcqSelected === q.answer_index) setMcqScore((s) => s + 1);
    setMcqRevealed(true);
  };
  const nextMcq = () => {
    if (mcqIdx + 1 >= mcqs.length) { setMcqDone(true); return; }
    setMcqIdx((i) => i + 1); setMcqSelected(null); setMcqRevealed(false); setMcqHint(false);
  };
  const restartMcq = () => {
    setMcqIdx(0); setMcqSelected(null); setMcqRevealed(false); setMcqHint(false); setMcqScore(0); setMcqDone(false);
  };

  const chapters = subject ? getChaptersForSubject(subject as BankSubject) : [];

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <button
        onClick={onBack}
        aria-label={t.back}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Youtube className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">YouTube</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text leading-[1.1] mb-4">{t.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{t.subtitle}</p>
      </header>

      <section className="max-w-2xl mx-auto mt-10 space-y-4 relative z-10">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.placeholder}
          dir="ltr"
          className="h-12 text-base"
        />
        <Button onClick={run} disabled={loading || !url.trim()} className="w-full h-12 text-base">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />{t.working}</>) : t.generate}
        </Button>

        {status.kind !== "idle" && (
          <div
            role="status"
            aria-live="polite"
            className={
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur " +
              (status.kind === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : status.kind === "failed"
                ? "border-destructive/50 bg-destructive/10 text-destructive-foreground"
                : status.kind === "retrying"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-primary/40 bg-secondary/40 text-foreground")
            }
          >
            {status.kind === "working" && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {status.kind === "retrying" && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
            {status.kind === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {status.kind === "failed" && <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">
              {status.kind === "working" && status.message}
              {status.kind === "retrying" && t.status.retrying(status.attempt, status.max)}
              {status.kind === "success" && t.status.success}
              {status.kind === "failed" && `${t.status.failed} — ${status.message}`}
            </span>
            {status.kind === "failed" && (
              <Button size="sm" variant="outline" onClick={run} disabled={loading}>
                {language === "ar" ? "إعادة المحاولة" : "Retry"}
              </Button>
            )}
          </div>
        )}
      </section>

      {parts.length > 0 && (
        <section className="max-w-3xl mx-auto mt-10 relative z-10 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-semibold gradient-text flex items-center gap-2">
              <Layers className="w-5 h-5" /> {t.parts}
            </h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(notes); toast.success(t.copied); }}
            >
              <Copy className="w-4 h-4 mr-2" />{t.copy}
            </Button>
          </div>
          {/* Action row (top, always visible after notes are ready) */}
          <div className="mb-5 grid sm:grid-cols-2 gap-3">
            <Button onClick={generateFlashcards} disabled={cardsLoading} className="h-12 bg-gradient-to-r from-primary to-accent text-primary-foreground">
              {cardsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {cardsLoading ? t.generatingCards : t.flashcardsBtn}
            </Button>
            <Button onClick={generateMcqs} disabled={mcqLoading} className="h-12 bg-gradient-to-r from-accent to-primary text-primary-foreground">
              {mcqLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
              {mcqLoading ? t.generatingMcq : t.mcqBtn}
            </Button>
          </div>
          <div className="space-y-3">
            {parts.map((p, i) => {
              const open = openIdx === i;
              return (
                <div key={i} className="rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur overflow-hidden">
                  <button
                    onClick={() => setOpenIdx(open ? null : i)}
                    className="w-full flex items-center justify-between px-5 py-4 text-left hover:bg-primary/5 transition"
                  >
                    <span className="flex items-center gap-3">
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-primary/20 text-primary text-sm font-bold">{i + 1}</span>
                      <span className="font-semibold text-base">{t.part} {i + 1}: {p.title}</span>
                    </span>
                    <ChevronDown className={`w-5 h-5 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
                  </button>
                  {open && (
                    <div className="px-5 pb-5 pt-1 whitespace-pre-wrap text-foreground/90 leading-relaxed border-t border-white/5">
                      {p.notes}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Action row */}
          <div className="mt-6 grid sm:grid-cols-2 gap-3">
            <Button onClick={generateFlashcards} disabled={cardsLoading} variant="outline" className="h-12">
              {cardsLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {cardsLoading ? t.generatingCards : t.flashcardsBtn}
            </Button>
            <Button onClick={generateMcqs} disabled={mcqLoading} variant="outline" className="h-12">
              {mcqLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <BrainCircuit className="w-4 h-4 mr-2" />}
              {mcqLoading ? t.generatingMcq : t.mcqBtn}
            </Button>
          </div>
        </section>
      )}

      {/* Flashcards section */}
      {cards.length > 0 && (
        <section className="max-w-3xl mx-auto mt-10 relative z-10 animate-fade-up">
          <h2 className="text-2xl font-semibold gradient-text mb-4 flex items-center gap-2">
            <Sparkles className="w-5 h-5" /> {t.flashcardsTitle}
          </h2>
          <div className="rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5 mb-4 grid sm:grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.pickSubject}</label>
              <Select value={subject} onValueChange={(v) => { setSubject(v as BankSubject); setChapter(""); }}>
                <SelectTrigger><SelectValue placeholder={t.pickSubject} /></SelectTrigger>
                <SelectContent>
                  {SUBJECTS_ORDER.map((s) => (
                    <SelectItem key={s.code} value={s.code}>{language === "ar" ? s.ar : s.en}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-xs text-muted-foreground mb-1 block">{t.pickChapter}</label>
              <Select value={chapter} onValueChange={setChapter} disabled={!subject}>
                <SelectTrigger><SelectValue placeholder={t.pickChapter} /></SelectTrigger>
                <SelectContent>
                  {chapters.filter((c) => !c.locked).map((c) => (
                    <SelectItem key={c.n} value={String(c.n)}>{language === "ar" ? c.arTitle : c.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end">
              <Button onClick={saveAllCards} disabled={!subject || !chapter} className="w-full h-10">
                <Save className="w-4 h-4 mr-2" />{t.addAll}
              </Button>
            </div>
          </div>
          <div className="space-y-3">
            {cards.map((c, i) => {
              const isSaved = savedIdx.has(i);
              return (
                <div key={i} className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-4">
                  <div className="text-xs uppercase tracking-wider text-primary mb-1">{t.cardFront}</div>
                  <div className="font-medium mb-3">{c.q}</div>
                  <div className="text-xs uppercase tracking-wider text-muted-foreground mb-1">{t.cardBack}</div>
                  <div className="text-sm text-foreground/90 mb-3">{c.a}</div>
                  <Button
                    size="sm"
                    variant={isSaved ? "secondary" : "outline"}
                    onClick={() => saveOneCard(i)}
                    disabled={isSaved || savingIdx === i || !subject || !chapter}
                  >
                    {isSaved ? <><Check className="w-4 h-4 mr-2" />{t.saved}</> :
                      savingIdx === i ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> :
                      <><Plus className="w-4 h-4 mr-2" />{t.addToDeck}</>}
                  </Button>
                </div>
              );
            })}
          </div>
        </section>
      )}

      {/* MCQ section */}
      {mcqs.length > 0 && (
        <section className="max-w-3xl mx-auto mt-10 relative z-10 animate-fade-up">
          <h2 className="text-2xl font-semibold gradient-text mb-4 flex items-center gap-2">
            <BrainCircuit className="w-5 h-5" /> {t.mcqTitle}
          </h2>
          {!mcqDone ? (() => {
            const q = mcqs[mcqIdx];
            return (
              <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-6 md:p-8">
                <div className="flex items-center justify-between mb-4 text-sm text-muted-foreground">
                  <span>{t.question} {mcqIdx + 1} {t.of} {mcqs.length}</span>
                  <span>{mcqScore} ✓</span>
                </div>
                <h3 className="text-lg md:text-xl font-semibold mb-5">{q.question}</h3>
                <div className="space-y-2 mb-5">
                  {q.choices.map((c, i) => {
                    const isCorrect = i === q.answer_index;
                    const isSelected = i === mcqSelected;
                    let cls = "border-white/10 bg-background/40 hover:border-primary/50";
                    if (mcqRevealed) {
                      if (isCorrect) cls = "border-green-500 bg-green-500/10";
                      else if (isSelected) cls = "border-red-500 bg-red-500/10";
                      else cls = "border-white/5 bg-background/20 opacity-60";
                    } else if (isSelected) cls = "border-primary bg-primary/10";
                    return (
                      <button key={i} disabled={mcqRevealed} onClick={() => setMcqSelected(i)}
                        className={`w-full text-left rounded-xl border p-3 transition flex items-center justify-between ${cls}`}>
                        <span>{c}</span>
                        {mcqRevealed && isCorrect && <Check className="w-5 h-5 text-green-500" />}
                        {mcqRevealed && isSelected && !isCorrect && <X className="w-5 h-5 text-red-500" />}
                      </button>
                    );
                  })}
                </div>
                {mcqRevealed && (
                  <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 mb-4">
                    <p className="text-sm font-semibold text-primary mb-1">{t.explanation}</p>
                    <p className="text-sm text-foreground/90">{q.explanation}</p>
                  </div>
                )}
                {!mcqRevealed && q.hint && (
                  <div className="mb-3">
                    {mcqHint ? (
                      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-3 flex gap-3">
                        <Lightbulb className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        <p className="text-sm text-foreground/90">{q.hint}</p>
                      </div>
                    ) : (
                      <Button variant="outline" size="sm" onClick={() => setMcqHint(true)}>
                        <Lightbulb className="w-4 h-4 mr-2" />{t.showHint}
                      </Button>
                    )}
                  </div>
                )}
                {!mcqRevealed ? (
                  <Button onClick={submitMcqAnswer} disabled={mcqSelected === null} className="w-full h-11">{t.next}</Button>
                ) : (
                  <Button onClick={nextMcq} className="w-full h-11">
                    {mcqIdx + 1 >= mcqs.length ? t.finish : t.next}
                  </Button>
                )}
              </div>
            );
          })() : (
            <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-10 text-center">
              <p className="text-sm uppercase tracking-[0.3em] text-muted-foreground mb-3">{t.yourScore}</p>
              <p className="text-6xl font-bold gradient-text mb-2">{mcqScore} / {mcqs.length}</p>
              <p className="text-xl text-muted-foreground mb-6">{Math.round((mcqScore / mcqs.length) * 100)}%</p>
              <Button onClick={restartMcq} className="h-11 px-6"><RotateCw className="w-4 h-4 mr-2" />{t.restartQuiz}</Button>
            </div>
          )}
        </section>
      )}
    </main>
  );
};

export default VideoNotes;