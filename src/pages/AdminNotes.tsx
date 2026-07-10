import { useEffect, useState } from "react";
import { ArrowLeft, Loader2, StickyNote, ChevronRight } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
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
};

const AdminNotes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<NoteRow | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await (supabase as any)
        .from("admin_notes")
        .select("id, title, blocks, cover_emoji, background_image_url, updated_at")
        .eq("published", true)
        .order("updated_at", { ascending: false });
      setRows((data ?? []) as NoteRow[]);
      setLoading(false);
    })();
  }, []);

  return (
    <main className="min-h-screen px-4 py-10 md:py-14 pb-32" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => (open ? setOpen(null) : onBack())}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {isRTL ? "رجوع" : "Back"}
        </button>

        <AnimatePresence mode="wait">
          {!open ? (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <header className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-4">
                  <StickyNote className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {isRTL ? "ملاحظات المدرّس" : "Study Notes"}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold gradient-text leading-tight mb-3">
                  {isRTL ? "ملاحظات دراسية" : "Study Notes"}
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">
                  {isRTL
                    ? "ملاحظات جميلة أعدّها المدرّسون خصيصاً لك."
                    : "Beautiful study notes crafted by your instructors."}
                </p>
              </header>

              {loading ? (
                <div className="flex justify-center py-16">
                  <Loader2 className="w-6 h-6 animate-spin text-primary" />
                </div>
              ) : rows.length === 0 ? (
                <p className="text-center text-muted-foreground py-16">
                  {isRTL ? "لا توجد ملاحظات بعد." : "No notes yet."}
                </p>
              ) : (
                <ul className="grid gap-3">
                  {rows.map((n, i) => (
                    <motion.li
                      key={n.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.04 }}
                    >
                      <button
                        onClick={() => setOpen(n)}
                        className="w-full flex items-center gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/50 transition-colors text-start"
                      >
                        <span className="text-3xl">{n.cover_emoji || "📘"}</span>
                        <span className="flex-1 min-w-0">
                          <span className="font-semibold block truncate">{n.title}</span>
                          <span className="text-xs text-muted-foreground">
                            {new Date(n.updated_at).toLocaleDateString()}
                          </span>
                        </span>
                        <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
                      </button>
                    </motion.li>
                  ))}
                </ul>
              )}
            </motion.div>
          ) : (
            <motion.article
              key={open.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="relative rounded-3xl border border-white/10 overflow-hidden"
            >
              {open.background_image_url && (
                <>
                  <img
                    src={open.background_image_url}
                    alt=""
                    className="absolute inset-0 w-full h-full object-cover"
                  />
                  <div className="absolute inset-0 bg-background/85 backdrop-blur-sm" />
                </>
              )}
              <div className={`relative p-6 md:p-10 ${open.background_image_url ? "" : "bg-secondary/30"}`}>
                <div className="text-6xl mb-4">{open.cover_emoji || "📘"}</div>
                <h1 className="text-4xl md:text-5xl font-bold mb-8 text-foreground">
                  {open.title}
                </h1>
                <AdminNoteRenderer blocks={open.blocks} language={language} />
              </div>
            </motion.article>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

export default AdminNotes;