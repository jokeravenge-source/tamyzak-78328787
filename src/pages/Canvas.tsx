import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, FileInput, FileText, PanelLeftClose, PanelLeft } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import NotesCanvasBlock, { type CanvasData } from "@/components/NotesCanvasBlock";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const STORAGE_KEY = "app_standalone_canvases_v2";
const LEGACY_SINGLE_KEY = "app_standalone_canvas_v1";

type StoredCanvas = {
  id: string;
  name: string;
  data: CanvasData;
  updated_at: number;
};

type Stored = {
  canvases: StoredCanvas[];
  activeId: string | null;
};

type NoteLite = { id: string; title: string; icon: string; content: any };

const rid = () => Math.random().toString(36).slice(2, 11);
const emptyData = (): CanvasData => ({ items: [], height: 720 });
const newCanvas = (name: string): StoredCanvas => ({
  id: rid(), name, data: emptyData(), updated_at: Date.now(),
});

const Canvas = ({
  language, onBack, onOpenNotes,
}: {
  language: AppLanguage;
  onBack: () => void;
  onOpenNotes?: () => void;
}) => {
  const isRTL = language === "ar";
  const t = useMemo(() => ({
    title: isRTL ? "اللوحات" : "Canvases",
    back: isRTL ? "رجوع" : "Back",
    autosaved: isRTL ? "الحفظ تلقائي" : "Autosaved",
    newCanvas: isRTL ? "لوحة جديدة" : "New canvas",
    untitled: isRTL ? "بدون عنوان" : "Untitled",
    delete: isRTL ? "حذف" : "Delete",
    rename: isRTL ? "إعادة تسمية" : "Rename",
    deleteConfirm: isRTL ? "حذف هذه اللوحة؟" : "Delete this canvas?",
    addToNote: isRTL ? "إضافة إلى صفحة" : "Add to a note",
    pickNote: isRTL ? "اختر صفحة" : "Pick a note",
    noNotes: isRTL ? "لا توجد صفحات بعد." : "No notes yet.",
    added: isRTL ? "تمت الإضافة إلى الصفحة" : "Added to note",
    openNotes: isRTL ? "فتح ملاحظاتي" : "Open Notes",
    empty: isRTL ? "أنشئ لوحتك الأولى." : "Create your first canvas.",
    save: isRTL ? "حفظ" : "Save",
    cancel: isRTL ? "إلغاء" : "Cancel",
    namePlaceholder: isRTL ? "اسم اللوحة" : "Canvas name",
  }), [isRTL]);

  const [stored, setStored] = useState<Stored>({ canvases: [], activeId: null });
  const [loaded, setLoaded] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftName, setDraftName] = useState("");
  const [listOpen, setListOpen] = useState<boolean>(() => {
    try {
      const v = localStorage.getItem("app_canvas_list_open");
      if (v === "0") return false;
      if (v === "1") return true;
    } catch { /* ignore */ }
    if (typeof window !== "undefined") return window.innerWidth >= 768;
    return true;
  });
  useEffect(() => {
    try { localStorage.setItem("app_canvas_list_open", listOpen ? "1" : "0"); } catch { /* ignore */ }
  }, [listOpen]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [notes, setNotes] = useState<NoteLite[]>([]);
  const [loadingNotes, setLoadingNotes] = useState(false);

  // Load
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? null;
        setUserId(uid);
        const key = uid ? `${STORAGE_KEY}:${uid}` : STORAGE_KEY;
        const raw = localStorage.getItem(key);
        if (raw) {
          const parsed = JSON.parse(raw) as Stored;
          if (parsed && Array.isArray(parsed.canvases)) {
            setStored({
              canvases: parsed.canvases,
              activeId: parsed.activeId ?? parsed.canvases[0]?.id ?? null,
            });
            setLoaded(true);
            return;
          }
        }
        // Migrate legacy single-canvas key
        const legacyKey = uid ? `${LEGACY_SINGLE_KEY}:${uid}` : LEGACY_SINGLE_KEY;
        const legacyRaw = localStorage.getItem(legacyKey);
        let initial: StoredCanvas[] = [];
        if (legacyRaw) {
          try {
            const parsed = JSON.parse(legacyRaw);
            if (parsed && Array.isArray(parsed.items)) {
              initial = [{
                id: rid(),
                name: isRTL ? "لوحتي" : "My canvas",
                data: { items: parsed.items, height: parsed.height || 720 },
                updated_at: Date.now(),
              }];
            }
          } catch { /* ignore */ }
        }
        if (initial.length === 0) {
          initial = [newCanvas(isRTL ? "لوحة 1" : "Canvas 1")];
        }
        setStored({ canvases: initial, activeId: initial[0].id });
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, [isRTL]);

  // Autosave
  useEffect(() => {
    if (!loaded) return;
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(stored));
    } catch { /* ignore */ }
  }, [stored, loaded, userId]);

  const active = useMemo(
    () => stored.canvases.find((c) => c.id === stored.activeId) ?? null,
    [stored],
  );

  const setActive = (id: string) => setStored((s) => ({ ...s, activeId: id }));

  const createCanvas = () => {
    const c = newCanvas(`${isRTL ? "لوحة" : "Canvas"} ${stored.canvases.length + 1}`);
    setStored((s) => ({ canvases: [...s.canvases, c], activeId: c.id }));
  };

  const deleteCanvas = (id: string) => {
    if (!confirm(t.deleteConfirm)) return;
    setStored((s) => {
      const next = s.canvases.filter((c) => c.id !== id);
      const activeId = s.activeId === id ? (next[0]?.id ?? null) : s.activeId;
      return { canvases: next.length ? next : [newCanvas(isRTL ? "لوحة 1" : "Canvas 1")], activeId: next.length ? activeId : null };
    });
  };

  const renameCanvas = (id: string, name: string) => {
    const clean = name.trim() || t.untitled;
    setStored((s) => ({
      ...s,
      canvases: s.canvases.map((c) => c.id === id ? { ...c, name: clean, updated_at: Date.now() } : c),
    }));
  };

  const updateActiveData = useCallback((data: CanvasData) => {
    setStored((s) => s.activeId == null ? s : ({
      ...s,
      canvases: s.canvases.map((c) => c.id === s.activeId ? { ...c, data, updated_at: Date.now() } : c),
    }));
  }, []);

  // ---------- Add to note ----------
  const openPicker = async () => {
    if (!active) return;
    setPickerOpen(true);
    setLoadingNotes(true);
    const { data, error } = await supabase
      .from("notes")
      .select("id,title,icon,content")
      .order("updated_at", { ascending: false });
    if (error) { toast.error(error.message); setLoadingNotes(false); return; }
    setNotes((data ?? []) as NoteLite[]);
    setLoadingNotes(false);
  };

  const insertIntoNote = async (note: NoteLite) => {
    if (!active) return;
    const block = {
      id: rid(),
      type: "canvas" as const,
      text: "",
      canvas: { items: active.data.items, height: active.data.height },
    };
    const nextContent = Array.isArray(note.content) ? [...note.content, block] : [block];
    const { error } = await supabase
      .from("notes")
      .update({ content: nextContent as any })
      .eq("id", note.id);
    if (error) { toast.error(error.message); return; }
    setPickerOpen(false);
    toast.success(`${t.added}: ${note.title || t.untitled}`, {
      action: onOpenNotes ? { label: t.openNotes, onClick: () => onOpenNotes() } : undefined,
    });
  };

  return (
    <div className="min-h-screen w-full bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 h-12 backdrop-blur-md bg-background/70 border-b border-border flex items-center px-3 gap-2">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
          aria-label={t.back}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <h1 className="text-sm font-bold">{t.title}</h1>
        <span className="ml-auto text-[11px] text-muted-foreground">{t.autosaved}</span>
      </header>

      <div
        className={`max-w-6xl mx-auto px-2 sm:px-3 md:px-6 py-3 md:py-4 grid grid-cols-1 gap-3 md:gap-4 ${
          listOpen ? "sm:grid-cols-[200px_1fr] md:grid-cols-[220px_1fr]" : "sm:grid-cols-[40px_1fr] md:grid-cols-[40px_1fr]"
        }`}
      >
        {/* Canvas list */}
        <aside className="rounded-xl border border-border bg-card/60 p-2 h-fit">
          <div className="flex items-center gap-1 mb-2">
            <button
              onClick={() => setListOpen(v => !v)}
              className="w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shrink-0"
              aria-label={listOpen ? (isRTL ? "طي" : "Collapse") : (isRTL ? "فتح" : "Expand")}
              title={listOpen ? (isRTL ? "طي" : "Collapse") : (isRTL ? "فتح" : "Expand")}
            >
              {listOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
            </button>
            {listOpen && (
              <span className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
                {t.title}
              </span>
            )}
          </div>
          {listOpen ? (
          <>
          <button
            onClick={createCanvas}
            className="w-full h-9 rounded-lg bg-primary text-primary-foreground text-xs font-medium flex items-center justify-center gap-1 hover:opacity-90"
          >
            <Plus className="w-4 h-4" /> {t.newCanvas}
          </button>
          <div className="mt-2 flex flex-col gap-1">
            {stored.canvases.map((c) => {
              const isActive = c.id === stored.activeId;
              const isEditing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group flex items-center gap-1 rounded-md px-1.5 py-1 cursor-pointer transition-colors ${
                    isActive ? "bg-primary/10 text-primary" : "hover:bg-secondary text-foreground/80"
                  }`}
                  onClick={() => !isEditing && setActive(c.id)}
                >
                  {isEditing ? (
                    <>
                      <input
                        autoFocus
                        value={draftName}
                        onChange={(e) => setDraftName(e.target.value)}
                        onClick={(e) => e.stopPropagation()}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") { renameCanvas(c.id, draftName); setEditingId(null); }
                          else if (e.key === "Escape") setEditingId(null);
                        }}
                        className="flex-1 min-w-0 text-xs bg-card border border-primary/40 rounded px-1 py-0.5 outline-none"
                        placeholder={t.namePlaceholder}
                      />
                      <button
                        onClick={(e) => { e.stopPropagation(); renameCanvas(c.id, draftName); setEditingId(null); }}
                        className="p-1 rounded hover:bg-foreground/10"
                        aria-label={t.save}
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(null); }}
                        className="p-1 rounded hover:bg-foreground/10"
                        aria-label={t.cancel}
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-sm shrink-0">🎨</span>
                      <span className="text-xs truncate flex-1">{c.name || t.untitled}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); setEditingId(c.id); setDraftName(c.name); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-foreground/10"
                        aria-label={t.rename}
                        title={t.rename}
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteCanvas(c.id); }}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded hover:bg-destructive/20 hover:text-destructive"
                        aria-label={t.delete}
                        title={t.delete}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </>
          ) : (
            <button
              onClick={createCanvas}
              className="w-7 h-7 rounded-md bg-primary text-primary-foreground flex items-center justify-center mx-auto hover:opacity-90"
              aria-label={t.newCanvas}
              title={t.newCanvas}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </aside>

        {/* Editor */}
        <main className="min-w-0">
          {active ? (
            <>
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                <span className="text-sm font-semibold truncate">{active.name || t.untitled}</span>
                <button
                  onClick={openPicker}
                  className="ml-auto h-8 rounded-lg bg-secondary hover:bg-secondary/80 text-xs font-medium px-2.5 flex items-center gap-1.5"
                >
                  <FileInput className="w-3.5 h-3.5" /> {t.addToNote}
                </button>
              </div>
              <NotesCanvasBlock data={active.data} onChange={updateActiveData} language={language} expandable />
            </>
          ) : (
            <div className="text-sm text-muted-foreground p-6 text-center border border-dashed border-border rounded-xl">
              {t.empty}
            </div>
          )}
        </main>
      </div>

      {/* Note picker modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border bg-card shadow-xl p-3"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2 mb-2">
              <h2 className="text-sm font-semibold">{t.pickNote}</h2>
              <button
                onClick={() => setPickerOpen(false)}
                className="ml-auto w-7 h-7 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground"
                aria-label={t.cancel}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto flex flex-col gap-1">
              {loadingNotes ? (
                <div className="text-xs text-muted-foreground p-3 text-center">…</div>
              ) : notes.length === 0 ? (
                <div className="text-xs text-muted-foreground p-3 text-center">{t.noNotes}</div>
              ) : (
                notes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => insertIntoNote(n)}
                    className="flex items-center gap-2 rounded-lg px-2 py-2 hover:bg-secondary text-start"
                  >
                    <span className="text-base shrink-0">{n.icon || "📄"}</span>
                    <span className="text-sm truncate flex-1">{n.title || t.untitled}</span>
                    <FileText className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Canvas;