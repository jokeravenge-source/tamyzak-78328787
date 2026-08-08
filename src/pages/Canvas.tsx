import { useCallback, useEffect, useMemo, useState } from "react";
import { useFeatureUsed } from "@/hooks/useFeatureUsed";
import { ArrowLeft, Plus, Trash2, Pencil, Check, X, FileInput, FileText, PanelLeftClose, PanelLeft, Cloud, CloudOff, Loader2, Palette, Sparkles } from "lucide-react";
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
  useFeatureUsed("canvas");
  const isRTL = language === "ar";
  const t = useMemo(() => ({
    title: isRTL ? "اللوحات" : "Canvases",
    back: isRTL ? "رجوع" : "Back",
    autosaved: isRTL ? "الحفظ تلقائي" : "Autosaved",
    saving: isRTL ? "جارٍ الحفظ…" : "Saving…",
    saved: isRTL ? "تم الحفظ" : "Saved",
    offline: isRTL ? "محلي فقط" : "Local only",
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
  const [saveState, setSaveState] = useState<"idle" | "saving" | "saved" | "error">("idle");
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

  // Load (local first, then merge with cloud)
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        const uid = u.user?.id ?? null;
        setUserId(uid);
        const key = uid ? `${STORAGE_KEY}:${uid}` : STORAGE_KEY;
        const raw = localStorage.getItem(key);
        let local: Stored | null = null;
        if (raw) {
          const parsed = JSON.parse(raw) as Stored;
          if (parsed && Array.isArray(parsed.canvases)) {
            local = {
              canvases: parsed.canvases,
              activeId: parsed.activeId ?? parsed.canvases[0]?.id ?? null,
            };
            setStored(local);
          }
        }
        // Cloud fetch (signed-in users) — merge by client_id, newest wins.
        if (uid) {
          const { data: cloud } = await supabase
            .from("canvases")
            .select("client_id,name,data,updated_at")
            .order("updated_at", { ascending: false });
          if (cloud && cloud.length > 0) {
            const byId = new Map<string, StoredCanvas>();
            for (const c of (local?.canvases ?? [])) byId.set(c.id, c);
            for (const row of cloud) {
              const remoteTs = new Date(row.updated_at as string).getTime();
              const existing = byId.get(row.client_id as string);
              if (!existing || remoteTs > existing.updated_at) {
                byId.set(row.client_id as string, {
                  id: row.client_id as string,
                  name: (row.name as string) || (isRTL ? "بدون عنوان" : "Untitled"),
                  data: row.data as CanvasData,
                  updated_at: remoteTs,
                });
              }
            }
            const merged = Array.from(byId.values()).sort((a, b) => b.updated_at - a.updated_at);
            local = { canvases: merged, activeId: local?.activeId ?? merged[0]?.id ?? null };
            setStored(local);
          }
        }
        if (!local || local.canvases.length === 0) {
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
        }
      } catch { /* ignore */ }
      setLoaded(true);
    })();
  }, [isRTL]);

  // Autosave to localStorage (instant)
  useEffect(() => {
    if (!loaded) return;
    try {
      const key = userId ? `${STORAGE_KEY}:${userId}` : STORAGE_KEY;
      localStorage.setItem(key, JSON.stringify(stored));
    } catch { /* ignore */ }
  }, [stored, loaded, userId]);

  // Autosave to cloud (debounced) — only what changed since last save.
  const lastSavedRef = useMemo(() => ({ current: new Map<string, number>() }), []);
  useEffect(() => {
    if (!loaded || !userId) return;
    const dirty = stored.canvases.filter(c => (lastSavedRef.current.get(c.id) ?? 0) < c.updated_at);
    if (dirty.length === 0) return;
    const handle = setTimeout(async () => {
      setSaveState("saving");
      try {
        const rows = dirty.map(c => ({
          user_id: userId,
          client_id: c.id,
          name: c.name,
          data: c.data as any,
          updated_at: new Date(c.updated_at).toISOString(),
        }));
        const { error } = await supabase
          .from("canvases")
          .upsert(rows, { onConflict: "user_id,client_id" });
        if (error) throw error;
        for (const c of dirty) lastSavedRef.current.set(c.id, c.updated_at);
        setSaveState("saved");
      } catch (e) {
        console.error("[canvas autosave]", e);
        setSaveState("error");
      }
    }, 800);
    return () => clearTimeout(handle);
  }, [stored.canvases, loaded, userId, lastSavedRef]);

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
    if (userId) {
      supabase.from("canvases").delete().eq("user_id", userId).eq("client_id", id).then(({ error }) => {
        if (error) console.error("[canvas delete]", error);
      });
    }
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
    <div className="min-h-screen w-full bg-gradient-to-b from-background via-background to-secondary/20 text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      <header className="sticky top-0 z-30 h-14 backdrop-blur-xl bg-background/70 border-b border-border/60 flex items-center px-3 sm:px-5 gap-3">
        <button
          onClick={onBack}
          className="w-9 h-9 rounded-xl hover:bg-secondary/80 flex items-center justify-center text-muted-foreground hover:text-foreground transition-all hover:scale-105 active:scale-95"
          aria-label={t.back}
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
        </button>
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary/20 to-primary/5 border border-primary/20 flex items-center justify-center shrink-0">
            <Palette className="w-4 h-4 text-primary" />
          </div>
          <div className="flex flex-col leading-tight min-w-0">
            <h1 className="text-sm font-bold tracking-tight truncate">{t.title}</h1>
            <span className="text-[10px] text-muted-foreground truncate">
              {stored.canvases.length} {isRTL ? "لوحة" : stored.canvases.length === 1 ? "canvas" : "canvases"}
            </span>
          </div>
        </div>
        <span className="ml-auto inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border border-border/60 bg-card/60 backdrop-blur">
          {!userId ? (
            <><CloudOff className="w-3 h-3 text-muted-foreground" /> <span className="text-muted-foreground">{t.offline}</span></>
          ) : saveState === "saving" ? (
            <><Loader2 className="w-3 h-3 animate-spin text-primary" /> <span className="text-foreground/80">{t.saving}</span></>
          ) : saveState === "error" ? (
            <><CloudOff className="w-3 h-3 text-destructive" /> <span className="text-destructive">{t.autosaved}</span></>
          ) : (
            <>
              <span className="relative flex w-2 h-2">
                <span className="absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60 animate-ping" />
                <span className="relative inline-flex w-2 h-2 rounded-full bg-emerald-500" />
              </span>
              <span className="text-foreground/80">{t.saved}</span>
            </>
          )}
        </span>
      </header>

      <div
        className={`max-w-6xl mx-auto px-2 sm:px-3 md:px-6 py-3 md:py-4 grid grid-cols-1 gap-3 md:gap-4 ${
          listOpen ? "sm:grid-cols-[200px_1fr] md:grid-cols-[220px_1fr]" : "sm:grid-cols-[40px_1fr] md:grid-cols-[40px_1fr]"
        }`}
      >
        {/* Canvas list */}
        <aside className="rounded-2xl border border-border/60 bg-card/70 backdrop-blur p-2 h-fit shadow-sm">
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
            className="group w-full h-10 rounded-xl bg-gradient-to-br from-primary to-primary/85 text-primary-foreground text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm hover:shadow-md hover:scale-[1.02] active:scale-[0.98] transition-all"
          >
            <Plus className="w-4 h-4 transition-transform group-hover:rotate-90" /> {t.newCanvas}
          </button>
          <div className="mt-2 flex flex-col gap-1">
            {stored.canvases.map((c) => {
              const isActive = c.id === stored.activeId;
              const isEditing = editingId === c.id;
              return (
                <div
                  key={c.id}
                  className={`group relative flex items-center gap-1.5 rounded-lg px-2 py-1.5 cursor-pointer transition-all overflow-hidden ${
                    isActive
                      ? "bg-gradient-to-r from-primary/15 via-primary/10 to-transparent text-primary"
                      : "hover:bg-secondary/80 text-foreground/80 hover:translate-x-[2px]"
                  }`}
                  onClick={() => !isEditing && setActive(c.id)}
                >
                  {isActive && (
                    <span className={`absolute ${isRTL ? "right-0" : "left-0"} top-1.5 bottom-1.5 w-0.5 rounded-full bg-primary`} />
                  )}
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
              className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary to-primary/80 text-primary-foreground flex items-center justify-center mx-auto hover:scale-110 transition-transform shadow-sm"
              aria-label={t.newCanvas}
              title={t.newCanvas}
            >
              <Plus className="w-4 h-4" />
            </button>
          )}
        </aside>

        {/* Editor */}
        <main className="min-w-0 animate-fade-in">
          {active ? (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base">🎨</span>
                  <span className="text-sm font-bold tracking-tight truncate">{active.name || t.untitled}</span>
                </div>
                <button
                  onClick={openPicker}
                  className="ml-auto h-9 rounded-xl bg-secondary/70 hover:bg-secondary text-xs font-medium px-3 flex items-center gap-1.5 border border-border/60 hover:border-primary/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
                >
                  <FileInput className="w-3.5 h-3.5" /> {t.addToNote}
                </button>
              </div>
              <NotesCanvasBlock data={active.data} onChange={updateActiveData} language={language} expandable />
            </>
          ) : (
            <div className="flex flex-col items-center justify-center gap-3 p-10 text-center border border-dashed border-border/70 rounded-2xl bg-card/40">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 border border-primary/20 flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-primary" />
              </div>
              <p className="text-sm text-muted-foreground">{t.empty}</p>
              <button
                onClick={createCanvas}
                className="h-9 rounded-xl bg-primary text-primary-foreground text-xs font-semibold px-4 inline-flex items-center gap-1.5 hover:opacity-90 transition-all hover:scale-[1.02]"
              >
                <Plus className="w-4 h-4" /> {t.newCanvas}
              </button>
            </div>
          )}
        </main>
      </div>

      {/* Note picker modal */}
      {pickerOpen && (
        <div
          className="fixed inset-0 z-50 bg-background/70 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in"
          onClick={() => setPickerOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl border border-border/60 bg-card shadow-2xl p-4 animate-scale-in"
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