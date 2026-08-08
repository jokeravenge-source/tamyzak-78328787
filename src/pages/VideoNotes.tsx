import { useEffect, useState } from "react";
import { useFeatureUsed } from "@/hooks/useFeatureUsed";
import { ArrowLeft, Loader2, Youtube, Copy, CheckCircle2, AlertTriangle, RefreshCw, ChevronDown, Layers, BrainCircuit, Sparkles, Check, X, Plus, Save, RotateCw, Lightbulb, type LucideIcon } from "lucide-react";
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

const readFunctionError = async (error: any, fallback: string) => {
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      const message = payload?.error || payload?.message || fallback;
      return {
        message: String(message),
        retryable: payload?.retryable === true || (response.status >= 500 && payload?.retryable !== false),
        retryAfter: Number(payload?.retryAfter || 0),
      };
    } catch { /* fall through */ }
  }

  const raw = error?.message || fallback;
  return {
    message: /non-2xx/i.test(raw) ? fallback : String(raw),
    retryable: false,
    retryAfter: 0,
  };
};

const STORAGE_KEY = "video_notes_state_v1";
type Persisted = {
  url: string;
  notes: string;
  parts: Part[];
  transcript: string;
  cards: Card[];
  mcqs: MCQItem[];
};

const VideoNotes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  useFeatureUsed("video_to_notes");
  const t = copy[language];
  const initial: Persisted = (() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return { url: "", notes: "", parts: [], transcript: "", cards: [], mcqs: [], ...JSON.parse(raw) };
    } catch { /* */ }
    return { url: "", notes: "", parts: [], transcript: "", cards: [], mcqs: [] };
  })();
  const [url, setUrl] = useState(initial.url);
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState(initial.notes);
  const [parts, setParts] = useState<Part[]>(initial.parts);
  const [openIdx, setOpenIdx] = useState<number | null>(0);
  const [transcript, setTranscript] = useState(initial.transcript);
  type Status =
    | { kind: "idle" }
    | { kind: "working"; message: string }
    | { kind: "retrying"; attempt: number; max: number }
    | { kind: "success" }
    | { kind: "failed"; message: string };
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // Flashcards
  const [cards, setCards] = useState<Card[]>(initial.cards);
  const [cardsLoading, setCardsLoading] = useState(false);
  const [savingIdx, setSavingIdx] = useState<number | null>(null);
  const [savedIdx, setSavedIdx] = useState<Set<number>>(new Set());
  const [subject, setSubject] = useState<BankSubject | "">("");
  const [chapter, setChapter] = useState<string>("");

  // MCQ
  const [mcqs, setMcqs] = useState<MCQItem[]>(initial.mcqs);
  const [mcqLoading, setMcqLoading] = useState(false);
  const [mcqIdx, setMcqIdx] = useState(0);
  const [mcqSelected, setMcqSelected] = useState<number | null>(null);
  const [mcqRevealed, setMcqRevealed] = useState(false);
  const [mcqScore, setMcqScore] = useState(0);
  const [mcqHint, setMcqHint] = useState(false);
  const [mcqDone, setMcqDone] = useState(false);

  useEffect(() => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ url, notes, parts, transcript, cards, mcqs }),
      );
    } catch { /* */ }
  }, [url, notes, parts, transcript, cards, mcqs]);

  useEffect(() => {
    if (initial.parts.length > 0 || initial.notes) {
      setStatus({ kind: "success" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      let lastRetryAfter = 0;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt === 1) setStatus({ kind: "working", message: t.working });
        const { data, error } = await supabase.functions.invoke("video-notes", {
          body: { url: url.trim(), language },
        });
        let retryable = false;
        if (error) {
          const details = await readFunctionError(error, t.failed);
          lastErr = new Error(details.message);
          retryable = details.retryable;
          lastRetryAfter = details.retryAfter;
        }
        else if ((data as any)?.error) {
          lastErr = new Error((data as any).message || (data as any).error);
          retryable = (data as any).retryable === true;
          lastRetryAfter = Number((data as any)?.retryAfter || 0);
        } else if ((data as any)?.notes) {
          setNotes((data as any).notes);
          const ps = Array.isArray((data as any).parts) ? (data as any).parts as Part[] : [];
          setParts(ps.length ? ps : [{ title: t.notes, notes: (data as any).notes }]);
          setOpenIdx(0);
          if (typeof (data as any).transcript === "string") setTranscript((data as any).transcript);
          setStatus({ kind: "success" });
          awardAction("video_to_notes", {});
          lastErr = null;
          break;
        } else {
          lastErr = new Error(t.failed);
        }
        if (!retryable) break;
        if (attempt < maxAttempts) {
          setStatus({ kind: "retrying", attempt: attempt + 1, max: maxAttempts });
          const retryAfterMs = lastRetryAfter * 1000;
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
    <main
      className="min-h-screen bg-background text-foreground"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 md:py-14">
        {/* Header */}
        <button
          onClick={onBack}
          className="inline-flex items-center gap-1.5 text-[11px] uppercase tracking-[0.22em] text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t.back}
        </button>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="inline-flex items-center gap-2 mb-3">
              <Youtube className="w-3.5 h-3.5 text-primary" />
              <span className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-semibold">YouTube</span>
            </div>
            <h1 className="text-3xl md:text-[44px] font-bold tracking-tight leading-[1.05]">
              {t.title}
            </h1>
            <p className="text-sm md:text-base text-muted-foreground mt-2 max-w-xl">
              {t.subtitle}
            </p>
          </div>
        </div>

        {/* Input panel */}
        <Panel icon={Youtube} title={t.title}>
          <div className="space-y-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder={t.placeholder}
              dir="ltr"
              className="h-11 text-sm bg-transparent border border-border rounded-md font-mono focus-visible:ring-0 focus-visible:border-foreground/60"
            />
            <button
              onClick={run}
              disabled={loading || !url.trim()}
              className="w-full h-11 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 rounded-md disabled:opacity-40 hover:opacity-90 transition-opacity"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {loading ? t.working : t.generate}
            </button>

            {status.kind !== "idle" && (
              <StatusStrip status={status} t={t} loading={loading} onRetry={run} />
            )}
          </div>
        </Panel>

        {/* Parts / notes */}
        {parts.length > 0 && (
          <div className="mt-6 space-y-6">
            {/* Action row */}
            <div className="grid sm:grid-cols-2 gap-3">
              <ActionBtn primary onClick={generateFlashcards} disabled={cardsLoading} icon={cardsLoading ? Loader2 : Sparkles} spin={cardsLoading}>
                {cardsLoading ? t.generatingCards : t.flashcardsBtn}
              </ActionBtn>
              <ActionBtn primary onClick={generateMcqs} disabled={mcqLoading} icon={mcqLoading ? Loader2 : BrainCircuit} spin={mcqLoading}>
                {mcqLoading ? t.generatingMcq : t.mcqBtn}
              </ActionBtn>
            </div>

            <Panel
              icon={Layers}
              title={t.parts}
              action={
                <button
                  onClick={() => { navigator.clipboard.writeText(notes); toast.success(t.copied); }}
                  className="h-8 px-3 border border-border hover:border-foreground/50 text-[10px] font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-1.5 rounded-md transition-colors"
                >
                  <Copy className="w-3 h-3" />{t.copy}
                </button>
              }
            >
              <div className="divide-y divide-border border-y border-border">
                {parts.map((p, i) => {
                  const open = openIdx === i;
                  return (
                    <div key={i}>
                      <button
                        onClick={() => setOpenIdx(open ? null : i)}
                        className="w-full flex items-center justify-between py-4 text-left hover:bg-secondary/60 transition-colors px-2 -mx-2"
                      >
                        <span className="flex items-center gap-3 min-w-0">
                          <span className="font-mono text-[11px] tabular-nums text-muted-foreground w-6 shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="font-semibold text-sm md:text-base truncate">
                            {p.title}
                          </span>
                        </span>
                        <ChevronDown className={`w-4 h-4 text-muted-foreground transition-transform shrink-0 ${open ? "rotate-180" : ""}`} />
                      </button>
                      {open && (
                        <div className="pb-5 px-2 -mx-2 whitespace-pre-wrap text-foreground/90 leading-relaxed text-sm">
                          {p.notes}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {/* Flashcards */}
        {cards.length > 0 && (
          <div className="mt-6">
            <Panel icon={Sparkles} title={t.flashcardsTitle}>
              <div className="grid sm:grid-cols-3 gap-3 mb-5">
                <div>
                  <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-1.5 block">{t.pickSubject}</label>
                  <Select value={subject} onValueChange={(v) => { setSubject(v as BankSubject); setChapter(""); }}>
                    <SelectTrigger className="rounded-md border-border bg-transparent h-10 text-sm"><SelectValue placeholder={t.pickSubject} /></SelectTrigger>
                    <SelectContent>
                      {SUBJECTS_ORDER.map((s) => (
                        <SelectItem key={s.code} value={s.code}>{language === "ar" ? s.ar : s.en}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <label className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-1.5 block">{t.pickChapter}</label>
                  <Select value={chapter} onValueChange={setChapter} disabled={!subject}>
                    <SelectTrigger className="rounded-md border-border bg-transparent h-10 text-sm"><SelectValue placeholder={t.pickChapter} /></SelectTrigger>
                    <SelectContent>
                      {chapters.filter((c) => !c.locked).map((c) => (
                        <SelectItem key={c.n} value={String(c.n)}>{language === "ar" ? c.arTitle : c.title}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex items-end">
                  <button
                    onClick={saveAllCards}
                    disabled={!subject || !chapter}
                    className="w-full h-10 bg-primary text-primary-foreground text-[10px] font-semibold uppercase tracking-[0.18em] inline-flex items-center justify-center gap-2 rounded-md disabled:opacity-30 hover:opacity-90 transition-opacity"
                  >
                    <Save className="w-3.5 h-3.5" />{t.addAll}
                  </button>
                </div>
              </div>

              <div className="divide-y divide-border border-y border-border">
                {cards.map((c, i) => {
                  const isSaved = savedIdx.has(i);
                  return (
                    <div key={i} className="py-4 flex gap-4 items-start">
                      <span className="font-mono text-[11px] tabular-nums text-muted-foreground w-6 shrink-0 pt-0.5">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="text-[10px] uppercase tracking-[0.22em] text-primary font-semibold mb-1">{t.cardFront}</div>
                        <div className="font-medium text-sm mb-3">{c.q}</div>
                        <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-semibold mb-1">{t.cardBack}</div>
                        <div className="text-sm text-foreground/85 mb-3">{c.a}</div>
                        <button
                          onClick={() => saveOneCard(i)}
                          disabled={isSaved || savingIdx === i || !subject || !chapter}
                          className="h-8 px-3 border border-border hover:border-foreground/50 text-[10px] font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-1.5 rounded-md disabled:opacity-40 transition-colors"
                        >
                          {isSaved ? <><Check className="w-3 h-3" />{t.saved}</> :
                            savingIdx === i ? <Loader2 className="w-3 h-3 animate-spin" /> :
                            <><Plus className="w-3 h-3" />{t.addToDeck}</>}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </Panel>
          </div>
        )}

        {/* MCQ */}
        {mcqs.length > 0 && (
          <div className="mt-6">
            <Panel icon={BrainCircuit} title={t.mcqTitle}>
              {!mcqDone ? (() => {
                const q = mcqs[mcqIdx];
                return (
                  <div>
                    <div className="flex items-center justify-between mb-5 pb-3 border-b border-border">
                      <span className="font-mono text-[11px] tabular-nums uppercase tracking-[0.18em] text-muted-foreground">
                        {t.question} {String(mcqIdx + 1).padStart(2, "0")} / {String(mcqs.length).padStart(2, "0")}
                      </span>
                      <span className="font-mono text-sm tabular-nums font-semibold text-primary">
                        {mcqScore} ✓
                      </span>
                    </div>
                    <h3 className="text-base md:text-lg font-semibold mb-5 leading-relaxed">{q.question}</h3>
                    <div className="space-y-2 mb-5">
                      {q.choices.map((c, i) => {
                        const isCorrect = i === q.answer_index;
                        const isSelected = i === mcqSelected;
                        let cls = "border-border hover:border-foreground/50";
                        if (mcqRevealed) {
                          if (isCorrect) cls = "border-[hsl(140_50%_35%)] bg-[hsl(140_50%_35%/0.12)]";
                          else if (isSelected) cls = "border-destructive bg-destructive/10";
                          else cls = "border-border opacity-50";
                        } else if (isSelected) cls = "border-primary bg-primary/10";
                        return (
                          <button
                            key={i}
                            disabled={mcqRevealed}
                            onClick={() => setMcqSelected(i)}
                            className={`w-full text-left border p-3.5 transition-colors flex items-center justify-between gap-3 text-sm ${cls}`}
                          >
                            <span className="flex items-center gap-3 min-w-0">
                              <span className="font-mono text-[11px] text-muted-foreground tabular-nums shrink-0">
                                {String.fromCharCode(65 + i)}
                              </span>
                              <span className="truncate">{c}</span>
                            </span>
                            {mcqRevealed && isCorrect && <Check className="w-4 h-4 text-[hsl(140_50%_35%)] shrink-0" />}
                            {mcqRevealed && isSelected && !isCorrect && <X className="w-4 h-4 text-destructive shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {mcqRevealed && (
                      <div className="border-l-2 border-primary bg-primary/10 p-3 mb-4">
                        <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-primary mb-1">{t.explanation}</p>
                        <p className="text-sm text-foreground/90">{q.explanation}</p>
                      </div>
                    )}

                    {!mcqRevealed && q.hint && (
                      <div className="mb-4">
                        {mcqHint ? (
                          <div className="border-l-2 border-muted-foreground bg-muted/60 p-3 flex gap-3">
                            <Lightbulb className="w-4 h-4 text-muted-foreground shrink-0 mt-0.5" />
                            <p className="text-sm text-foreground/90">{q.hint}</p>
                          </div>
                        ) : (
                          <button
                            onClick={() => setMcqHint(true)}
                            className="h-8 px-3 border border-border hover:border-foreground/50 text-[10px] font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-1.5 rounded-md transition-colors"
                          >
                            <Lightbulb className="w-3 h-3" />{t.showHint}
                          </button>
                        )}
                      </div>
                    )}

                    {!mcqRevealed ? (
                      <button
                        onClick={submitMcqAnswer}
                        disabled={mcqSelected === null}
                        className="w-full h-11 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center justify-center rounded-md disabled:opacity-30 hover:opacity-90 transition-opacity"
                      >
                        {t.next}
                      </button>
                    ) : (
                      <button
                        onClick={nextMcq}
                        className="w-full h-11 bg-primary text-primary-foreground text-xs font-semibold uppercase tracking-[0.18em] inline-flex items-center justify-center rounded-md hover:opacity-90 transition-opacity"
                      >
                        {mcqIdx + 1 >= mcqs.length ? t.finish : t.next}
                      </button>
                    )}
                  </div>
                );
              })() : (
                <div className="py-6 text-center">
                  <p className="text-[10px] uppercase tracking-[0.32em] text-muted-foreground font-semibold mb-4">{t.yourScore}</p>
                  <p className="font-mono text-6xl md:text-7xl font-bold tabular-nums text-primary leading-none mb-2">
                    {mcqScore}<span className="text-muted-foreground">/</span>{mcqs.length}
                  </p>
                  <p className="font-mono text-lg text-muted-foreground tabular-nums mb-6">
                    {Math.round((mcqScore / mcqs.length) * 100)}%
                  </p>
                  <button
                    onClick={restartMcq}
                    className="h-10 px-5 border border-border hover:border-foreground/50 text-[10px] font-semibold uppercase tracking-[0.18em] inline-flex items-center gap-2 rounded-md transition-colors"
                  >
                    <RotateCw className="w-3 h-3" />{t.restartQuiz}
                  </button>
                </div>
              )}
            </Panel>
          </div>
        )}
      </div>
    </main>
  );
};

export default VideoNotes;

/* ---------- Local UI primitives (parchment / facet) ---------- */

function Panel({
  icon: Icon,
  title,
  action,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section className="border border-border bg-background p-5 md:p-6 rounded-xl">
      <header className="mb-4 flex items-start justify-between gap-3">
        <div className="inline-flex items-center gap-2">
          <Icon className="w-3.5 h-3.5 text-foreground" />
          <h2 className="text-[11px] uppercase tracking-[0.22em] font-semibold text-foreground">{title}</h2>
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

function ActionBtn({
  onClick,
  disabled,
  icon: Icon,
  spin,
  primary,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  icon: LucideIcon;
  spin?: boolean;
  primary?: boolean;
  children: React.ReactNode;
}) {
  const base =
    "h-12 inline-flex items-center justify-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] rounded-md disabled:opacity-40 transition-colors px-4";
  const skin = primary
    ? "bg-primary text-primary-foreground hover:opacity-90"
    : "border border-border hover:border-foreground/50 text-foreground";
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${skin}`}>
      <Icon className={`w-4 h-4 ${spin ? "animate-spin" : ""}`} />
      {children}
    </button>
  );
}

function StatusStrip({
  status,
  t,
  loading,
  onRetry,
}: {
  status:
    | { kind: "idle" }
    | { kind: "working"; message: string }
    | { kind: "retrying"; attempt: number; max: number }
    | { kind: "success" }
    | { kind: "failed"; message: string };
  t: (typeof copy)[keyof typeof copy];
  loading: boolean;
  onRetry: () => void;
}) {
  const tone =
    status.kind === "success"
      ? "border-[hsl(140_50%_35%/0.45)] text-[hsl(140_50%_25%)] bg-[hsl(140_50%_35%/0.1)]"
      : status.kind === "failed"
      ? "border-destructive/45 text-destructive bg-destructive/10"
      : status.kind === "retrying"
      ? "border-primary/45 text-primary bg-primary/10"
      : "border-border text-foreground bg-transparent";
  return (
    <div role="status" aria-live="polite" className={`flex items-center gap-3 border px-3 py-2.5 text-xs ${tone}`}>
      {status.kind === "working" && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {status.kind === "retrying" && <RefreshCw className="w-3.5 h-3.5 animate-spin shrink-0" />}
      {status.kind === "success" && <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />}
      {status.kind === "failed" && <AlertTriangle className="w-3.5 h-3.5 shrink-0" />}
      <span className="flex-1 font-mono tabular-nums tracking-tight">
        {status.kind === "working" && status.message}
        {status.kind === "retrying" && t.status.retrying(status.attempt, status.max)}
        {status.kind === "success" && t.status.success}
        {status.kind === "failed" && `${t.status.failed} — ${status.message}`}
      </span>
      {status.kind === "failed" && (
        <button
          onClick={onRetry}
          disabled={loading}
          className="h-7 px-2.5 border border-current text-[10px] font-semibold uppercase tracking-[0.18em] rounded-md disabled:opacity-40"
        >
          {t.status.failed.startsWith("ف") || t.status.failed.startsWith("ال") ? "إعادة" : "Retry"}
        </button>
      )}
    </div>
  );
}