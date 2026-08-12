import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Loader2, StickyNote, ChevronRight, Check, X, RotateCcw, BookOpen, ListX } from "lucide-react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import {
  AdminNoteRenderer,
  type AdminNoteBlock,
} from "@/components/AdminNoteRenderer";

type NoteRow = {
  id: string;
  title: string;
  blocks: AdminNoteBlock[];
  cover_emoji: string | null;
  background_image_url: string | null;
  updated_at: string;
  notebook_id: string | null;
};

type NotebookRow = {
  id: string;
  title: string;
  description: string | null;
  cover_emoji: string | null;
  cover_image_url: string | null;
};

const storeKey = (nbId: string) => `admin-notes-unknown:${nbId}`;
const readUnknown = (nbId: string): string[] => {
  try {
    return JSON.parse(localStorage.getItem(storeKey(nbId)) || "[]");
  } catch {
    return [];
  }
};
const writeUnknown = (nbId: string, ids: string[]) =>
  localStorage.setItem(storeKey(nbId), JSON.stringify(Array.from(new Set(ids))));

const NoteCard = ({
  note,
  language,
  onSwipe,
}: {
  note: NoteRow;
  language: AppLanguage;
  onSwipe: (understood: boolean) => void;
}) => {
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-250, 250], [-12, 12]);
  const yesOpacity = useTransform(x, [40, 160], [0, 1]);
  const noOpacity = useTransform(x, [-160, -40], [1, 0]);

  return (
    <motion.article
      drag="x"
      style={{ x, rotate }}
      dragConstraints={{ left: 0, right: 0 }}
      dragElastic={0.7}
      onDragEnd={(_, info) => {
        if (info.offset.x > 120) onSwipe(true);
        else if (info.offset.x < -120) onSwipe(false);
      }}
      initial={{ opacity: 0, scale: 0.96, y: 16 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.95 }}
      className="relative rounded-3xl border border-white/10 overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
    >
      {note.background_image_url && (
        <>
          <img src={note.background_image_url} alt="" className="absolute inset-0 w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/50 to-background/70" />
        </>
      )}
      <motion.div
        style={{ opacity: yesOpacity }}
        className="absolute top-5 start-5 z-10 px-3 py-1 rounded-lg border-2 border-emerald-400 text-emerald-400 font-bold text-sm rotate-[-8deg]"
      >
        ✓
      </motion.div>
      <motion.div
        style={{ opacity: noOpacity }}
        className="absolute top-5 end-5 z-10 px-3 py-1 rounded-lg border-2 border-red-400 text-red-400 font-bold text-sm rotate-[8deg]"
      >
        ✕
      </motion.div>
      <div className={`relative p-6 md:p-10 max-h-[62vh] overflow-y-auto ${note.background_image_url ? "" : "bg-secondary/30"}`}>
        <div className="text-5xl mb-3">{note.cover_emoji || "📘"}</div>
        <h2 className="text-3xl md:text-4xl font-bold mb-6 text-foreground">{note.title}</h2>
        <AdminNoteRenderer blocks={note.blocks} language={language} />
      </div>
    </motion.article>
  );
};

const AdminNotes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const [notebooks, setNotebooks] = useState<NotebookRow[]>([]);
  const [notes, setNotes] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [notebook, setNotebook] = useState<NotebookRow | null>(null);
  const [queue, setQueue] = useState<NoteRow[]>([]);
  const [index, setIndex] = useState(0);
  const [unknownIds, setUnknownIds] = useState<string[]>([]);
  const [mode, setMode] = useState<"deck" | "unknown-list">("deck");
  const [reviewing, setReviewing] = useState(false);

  useEffect(() => {
    (async () => {
      const [nbRes, nRes] = await Promise.all([
        (supabase as any)
          .from("admin_notebooks")
          .select("id, title, description, cover_emoji, cover_image_url")
          .eq("published", true)
          .order("created_at", { ascending: false }),
        (supabase as any)
          .from("admin_notes")
          .select("id, title, blocks, cover_emoji, background_image_url, updated_at, notebook_id")
          .eq("published", true)
          .order("updated_at", { ascending: false }),
      ]);
      setNotebooks((nbRes.data ?? []) as NotebookRow[]);
      setNotes((nRes.data ?? []) as NoteRow[]);
      setLoading(false);
    })();
  }, []);

  const notebookNotes = useMemo(
    () => (notebook ? notes.filter((n) => n.notebook_id === notebook.id) : []),
    [notebook, notes],
  );
  const unknownNotes = useMemo(
    () => notebookNotes.filter((n) => unknownIds.includes(n.id)),
    [notebookNotes, unknownIds],
  );

  const openNotebook = (nb: NotebookRow) => {
    const list = notes.filter((n) => n.notebook_id === nb.id);
    setNotebook(nb);
    setUnknownIds(readUnknown(nb.id));
    setQueue(list);
    setIndex(0);
    setMode("deck");
    setReviewing(false);
  };

  const startReview = () => {
    const list = notebookNotes.filter((n) => unknownIds.includes(n.id));
    if (!list.length) return;
    setQueue(list);
    setIndex(0);
    setMode("deck");
    setReviewing(true);
  };

  const swipe = (understood: boolean) => {
    const current = queue[index];
    if (!current || !notebook) return;
    const next = understood
      ? unknownIds.filter((id) => id !== current.id)
      : [...unknownIds, current.id];
    setUnknownIds(Array.from(new Set(next)));
    writeUnknown(notebook.id, next);
    setIndex((i) => i + 1);
  };

  const t = (ar: string, en: string) => (isRTL ? ar : en);

  return (
    <main className="min-h-screen px-4 py-10 md:py-14 pb-32" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto">
        <button
          onClick={() => (notebook ? setNotebook(null) : onBack())}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {t("رجوع", "Back")}
        </button>

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : !notebook ? (
          <>
            <header className="mb-10 text-center">
              <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-4">
                <StickyNote className="w-3.5 h-3.5 text-primary" />
                <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                  {t("دفاتر الملاحظات", "Notebooks")}
                </span>
              </div>
              <h1 className="text-4xl md:text-5xl font-bold gradient-text leading-tight mb-3">
                {t("ملاحظات دراسية", "Study Notes")}
              </h1>
              <p className="text-muted-foreground max-w-lg mx-auto">
                {t(
                  "افتح دفتراً وراجع ملاحظاته بنظام السحب: يمين إذا فهمت، يسار إذا لم تفهم.",
                  "Open a notebook and review its notes: swipe right if you understood, left if not.",
                )}
              </p>
            </header>

            {notebooks.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">
                {t("لا توجد دفاتر بعد.", "No notebooks yet.")}
              </p>
            ) : (
              <ul className="grid gap-3">
                {notebooks.map((nb, i) => (
                  <motion.li
                    key={nb.id}
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04 }}
                  >
                    <button
                      onClick={() => openNotebook(nb)}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/50 transition-colors text-start"
                    >
                      <span className="w-14 h-14 rounded-xl overflow-hidden bg-primary/10 flex items-center justify-center text-3xl shrink-0">
                        {nb.cover_image_url ? (
                          <img src={nb.cover_image_url} alt="" className="w-full h-full object-cover" />
                        ) : (
                          nb.cover_emoji || "📚"
                        )}
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="font-semibold block truncate">{nb.title}</span>
                        <span className="text-xs text-muted-foreground block truncate">
                          {nb.description ||
                            `${notes.filter((n) => n.notebook_id === nb.id).length} ${t("ملاحظة", "notes")}`}
                        </span>
                      </span>
                      <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
                    </button>
                  </motion.li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <div className="flex items-center justify-between flex-wrap gap-3 mb-6">
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <BookOpen className="w-5 h-5 text-primary" /> {notebook.title}
              </h1>
              <button
                onClick={() => setMode(mode === "unknown-list" ? "deck" : "unknown-list")}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm hover:bg-secondary"
              >
                <ListX className="w-4 h-4 text-amber-400" />
                {t("الملاحظات غير المفهومة", "Not understood notes")} ({unknownNotes.length})
              </button>
            </div>

            {mode === "unknown-list" ? (
              unknownNotes.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">
                  {t("لا توجد ملاحظات غير مفهومة 🎉", "No not-understood notes 🎉")}
                </p>
              ) : (
                <div className="space-y-3">
                  <button
                    onClick={startReview}
                    className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-semibold"
                  >
                    {t("راجعها الآن بنظام السحب", "Review them with swipe")}
                  </button>
                  <ul className="grid gap-2">
                    {unknownNotes.map((n) => (
                      <li
                        key={n.id}
                        className="flex items-center gap-3 p-3 rounded-xl border border-amber-500/30 bg-secondary/30"
                      >
                        <span className="text-2xl">{n.cover_emoji || "📘"}</span>
                        <span className="flex-1 min-w-0 truncate font-medium">{n.title}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )
            ) : queue.length === 0 ? (
              <p className="text-center text-muted-foreground py-16">
                {t("لا توجد ملاحظات في هذا الدفتر.", "No notes in this notebook.")}
              </p>
            ) : index >= queue.length ? (
              <div className="text-center py-14 space-y-4">
                <p className="text-2xl font-bold">{t("أنهيت الجولة! 🎉", "Round complete! 🎉")}</p>
                <p className="text-muted-foreground">
                  {t("غير مفهومة:", "Not understood:")} {unknownNotes.length}
                </p>
                <div className="flex justify-center gap-2 flex-wrap">
                  {unknownNotes.length > 0 && (
                    <button
                      onClick={startReview}
                      className="inline-flex items-center gap-2 h-11 px-5 rounded-xl bg-primary text-primary-foreground font-semibold"
                    >
                      <RotateCcw className="w-4 h-4" />
                      {t("أعد الملاحظات غير المفهومة", "Review not understood")}
                    </button>
                  )}
                  <button
                    onClick={() => openNotebook(notebook)}
                    className="inline-flex items-center gap-2 h-11 px-5 rounded-xl border border-border bg-card font-semibold"
                  >
                    {t("ابدأ من جديد", "Start over")}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-xs text-center text-muted-foreground">
                  {reviewing ? t("مراجعة غير المفهومة", "Reviewing not understood") : t("جولة كاملة", "Full round")} ·{" "}
                  {index + 1}/{queue.length}
                </p>
                <AnimatePresence mode="wait">
                  <NoteCard key={queue[index].id} note={queue[index]} language={language} onSwipe={swipe} />
                </AnimatePresence>
                <div className="flex items-center justify-center gap-4">
                  <button
                    onClick={() => swipe(false)}
                    className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-red-500/40 text-red-400 hover:bg-red-500/10 font-semibold"
                  >
                    <X className="w-5 h-5" /> {t("لم أفهم", "Didn't get it")}
                  </button>
                  <button
                    onClick={() => swipe(true)}
                    className="inline-flex items-center gap-2 h-12 px-6 rounded-2xl border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10 font-semibold"
                  >
                    <Check className="w-5 h-5" /> {t("فهمتها", "Understood")}
                  </button>
                </div>
                <p className="text-[11px] text-center text-muted-foreground">
                  {t("اسحب يميناً إذا فهمت، ويساراً إذا لم تفهم", "Swipe right if understood, left if not")}
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </main>
  );
};

export default AdminNotes;