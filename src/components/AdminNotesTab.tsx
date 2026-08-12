import { useEffect, useRef, useState } from "react";
import { Plus, Trash2, Loader2, Eye, EyeOff, Save, X, FileText, ArrowUp, ArrowDown, Layout, Sparkles, Image as ImageIcon, Upload, BookOpen, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  AdminNoteRenderer,
  STUDY_GUIDE_TEMPLATE,
  type AdminNoteBlock,
} from "@/components/AdminNoteRenderer";

type NoteRow = {
  id: string;
  title: string;
  template: string;
  blocks: AdminNoteBlock[];
  cover_emoji: string | null;
  published: boolean;
  background_image_url: string | null;
  notebook_id: string | null;
  created_at: string;
  updated_at: string;
};

type NotebookRow = {
  id: string;
  title: string;
  description: string | null;
  cover_emoji: string | null;
  cover_image_url: string | null;
  published: boolean;
  created_at: string;
  updated_at: string;
};

async function uploadImage(file: File): Promise<string> {
  const ext = file.name.split(".").pop() || "jpg";
  const path = `note-covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
  const { error } = await supabase.storage.from("news").upload(path, file, { contentType: file.type });
  if (error) throw error;
  return supabase.storage.from("news").getPublicUrl(path).data.publicUrl;
}

const TEMPLATES: Record<string, { label: string; blocks: AdminNoteBlock[] }> = {
  "study-guide": { label: "Study guide", blocks: STUDY_GUIDE_TEMPLATE },
  blank: { label: "Blank", blocks: [{ type: "heading", level: 1, text: "Untitled" }] },
};

const BLOCK_ADDERS: Array<{ label: string; make: () => AdminNoteBlock }> = [
  { label: "Callout", make: () => ({ type: "callout", emoji: "💡", text: "" }) },
  { label: "Heading 1", make: () => ({ type: "heading", level: 1, text: "" }) },
  { label: "Heading 2", make: () => ({ type: "heading", level: 2, text: "" }) },
  { label: "Heading 3", make: () => ({ type: "heading", level: 3, text: "" }) },
  { label: "Paragraph", make: () => ({ type: "paragraph", text: "" }) },
  { label: "Bulleted list", make: () => ({ type: "bullets", items: [""] }) },
  { label: "Numbered list", make: () => ({ type: "numbered", items: [""] }) },
  { label: "Quote", make: () => ({ type: "quote", text: "" }) },
  { label: "Divider", make: () => ({ type: "divider" }) },
];

export default function AdminNotesTab() {
  const [rows, setRows] = useState<NoteRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [editor, setEditor] = useState<NoteRow | null>(null);
  const [notebooks, setNotebooks] = useState<NotebookRow[]>([]);
  const [activeNotebook, setActiveNotebook] = useState<NotebookRow | null>(null);
  const [nbEditor, setNbEditor] = useState<NotebookRow | null>(null);

  const load = async () => {
    setLoading(true);
    const [notesRes, nbRes] = await Promise.all([
      (supabase as any).from("admin_notes").select("*").order("updated_at", { ascending: false }),
      (supabase as any).from("admin_notebooks").select("*").order("created_at", { ascending: false }),
    ]);
    if (notesRes.error) toast.error(notesRes.error.message);
    if (nbRes.error) toast.error(nbRes.error.message);
    setRows((notesRes.data ?? []) as NoteRow[]);
    setNotebooks((nbRes.data ?? []) as NotebookRow[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const startNew = (templateKey: keyof typeof TEMPLATES) => {
    const tpl = TEMPLATES[templateKey];
    setEditor({
      id: "",
      title: tpl.label + " note",
      template: templateKey,
      blocks: JSON.parse(JSON.stringify(tpl.blocks)),
      cover_emoji: "📘",
      published: false,
      background_image_url: null,
      notebook_id: activeNotebook?.id ?? null,
      created_at: "",
      updated_at: "",
    });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this note?")) return;
    const { error } = await (supabase as any).from("admin_notes").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setRows((r) => r.filter((x) => x.id !== id));
  };

  const togglePublish = async (row: NoteRow) => {
    const { error } = await (supabase as any)
      .from("admin_notes")
      .update({ published: !row.published })
      .eq("id", row.id);
    if (error) return toast.error(error.message);
    setRows((r) => r.map((x) => (x.id === row.id ? { ...x, published: !row.published } : x)));
  };

  if (editor) {
    return (
      <NoteEditor
        row={editor}
        onClose={() => setEditor(null)}
        onSaved={(saved) => {
          setEditor(null);
          setRows((r) => {
            const others = r.filter((x) => x.id !== saved.id);
            return [saved, ...others];
          });
        }}
      />
    );
  }

  if (nbEditor) {
    return (
      <NotebookEditor
        row={nbEditor}
        onClose={() => setNbEditor(null)}
        onSaved={(saved) => {
          setNbEditor(null);
          setNotebooks((n) => [saved, ...n.filter((x) => x.id !== saved.id)]);
          setActiveNotebook((a) => (a && a.id === saved.id ? saved : a));
        }}
      />
    );
  }

  if (!activeNotebook) {
    return (
      <div className="space-y-6">
        <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur flex items-center justify-between flex-wrap gap-3">
          <h3 className="font-semibold flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-primary" /> Notebooks
          </h3>
          <button
            onClick={() =>
              setNbEditor({
                id: "",
                title: "New notebook",
                description: "",
                cover_emoji: "📚",
                cover_image_url: null,
                published: false,
                created_at: "",
                updated_at: "",
              })
            }
            className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
          >
            <Plus className="w-4 h-4" /> New notebook
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : notebooks.length === 0 ? (
          <p className="text-center text-muted-foreground py-10">No notebooks yet.</p>
        ) : (
          <div className="grid gap-3">
            {notebooks.map((nb) => (
              <article key={nb.id} className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex flex-wrap items-center gap-4">
                <div className="w-14 h-14 rounded-xl overflow-hidden bg-primary/15 flex items-center justify-center text-2xl">
                  {nb.cover_image_url ? (
                    <img src={nb.cover_image_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    nb.cover_emoji || "📚"
                  )}
                </div>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold">{nb.title}</h3>
                    <span className={`text-xs px-2 py-0.5 rounded-full border ${nb.published ? "border-emerald-500/40 text-emerald-400" : "border-amber-500/40 text-amber-400"}`}>
                      {nb.published ? "Published" : "Draft"}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {rows.filter((r) => r.notebook_id === nb.id).length} notes
                    </span>
                  </div>
                  {nb.description && <p className="text-xs text-muted-foreground mt-0.5">{nb.description}</p>}
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setActiveNotebook(nb)}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                  >
                    <FileText className="w-4 h-4" /> Open
                  </button>
                  <button
                    onClick={() => setNbEditor(nb)}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm"
                  >
                    Edit
                  </button>
                  <button
                    onClick={async () => {
                      if (!confirm("Delete this notebook and its notes?")) return;
                      const { error } = await (supabase as any).from("admin_notebooks").delete().eq("id", nb.id);
                      if (error) return toast.error(error.message);
                      setNotebooks((n) => n.filter((x) => x.id !== nb.id));
                      setRows((r) => r.filter((x) => x.notebook_id !== nb.id));
                    }}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    );
  }

  const visibleRows = rows.filter((r) => r.notebook_id === activeNotebook.id);

  return (
    <div className="space-y-6">
      <button
        onClick={() => setActiveNotebook(null)}
        className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm"
      >
        <ArrowLeft className="w-4 h-4" /> All notebooks
      </button>
      <h2 className="text-lg font-semibold">
        {activeNotebook.cover_emoji} {activeNotebook.title}
      </h2>
      <div className="rounded-2xl p-5 border border-white/10 bg-secondary/40 backdrop-blur">
        <h3 className="font-semibold flex items-center gap-2 mb-3">
          <Layout className="w-4 h-4 text-primary" /> Create note from template
        </h3>
        <div className="flex flex-wrap gap-2">
          {Object.entries(TEMPLATES).map(([key, tpl]) => (
            <button
              key={key}
              onClick={() => startNew(key as keyof typeof TEMPLATES)}
              className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
            >
              <Plus className="w-4 h-4" /> {tpl.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      ) : visibleRows.length === 0 ? (
        <p className="text-center text-muted-foreground py-10">No notes yet. Pick a template above.</p>
      ) : (
        <div className="grid gap-3">
          {visibleRows.map((r) => (
            <article
              key={r.id}
              className="rounded-2xl p-4 border border-white/10 bg-secondary/40 backdrop-blur flex flex-wrap items-center gap-4"
            >
              <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center text-2xl">
                {r.cover_emoji || "📘"}
              </div>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-semibold">{r.title}</h3>
                  <span className="text-xs px-2 py-0.5 rounded-full border border-primary/30 text-primary">
                    {TEMPLATES[r.template]?.label || r.template}
                  </span>
                  {r.published ? (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-emerald-500/40 text-emerald-400">
                      Published
                    </span>
                  ) : (
                    <span className="text-xs px-2 py-0.5 rounded-full border border-amber-500/40 text-amber-400">
                      Draft
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {new Date(r.updated_at).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => togglePublish(r)}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm"
                >
                  {r.published ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  {r.published ? "Unpublish" : "Publish"}
                </button>
                <button
                  onClick={() => setEditor(r)}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm"
                >
                  <FileText className="w-4 h-4" /> Edit
                </button>
                <button
                  onClick={() => remove(r.id)}
                  className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-sm"
                >
                  <Trash2 className="w-4 h-4" /> Delete
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}

function NoteEditor({
  row,
  onClose,
  onSaved,
}: {
  row: NoteRow;
  onClose: () => void;
  onSaved: (row: NoteRow) => void;
}) {
  // note editor below
  const [title, setTitle] = useState(row.title);
  const [emoji, setEmoji] = useState(row.cover_emoji || "📘");
  const [published, setPublished] = useState(row.published);
  const [blocks, setBlocks] = useState<AdminNoteBlock[]>(row.blocks || []);
  const [busy, setBusy] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [bgUrl, setBgUrl] = useState<string | null>(row.background_image_url ?? null);
  const [genBusy, setGenBusy] = useState(false);
  const [upBusy, setUpBusy] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const uploadCover = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Pick an image file");
    if (file.size > 5 * 1024 * 1024) return toast.error("Max 5MB");
    setUpBusy(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `note-covers/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const { error } = await supabase.storage.from("news").upload(path, file, {
        contentType: file.type,
      });
      if (error) throw error;
      const { data } = supabase.storage.from("news").getPublicUrl(path);
      setBgUrl(data.publicUrl);
      toast.success("Cover uploaded");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUpBusy(false);
    }
  };

  const generateBackground = async () => {
    const promptText = [title, ...blocks.map((b) => (b as any).text || (b as any).items?.join(", ") || "").filter(Boolean)].join(" — ").slice(0, 500);
    if (!promptText.trim()) return toast.error("Add a title first");
    setGenBusy(true);
    try {
      const { data, error } = await (supabase as any).functions.invoke("generate-note-image", { body: { prompt: promptText } });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setBgUrl(data.dataUrl);
      toast.success("Background generated");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate image");
    } finally {
      setGenBusy(false);
    }
  };

  const update = (i: number, next: AdminNoteBlock) =>
    setBlocks((b) => b.map((x, idx) => (idx === i ? next : x)));
  const removeAt = (i: number) => setBlocks((b) => b.filter((_, idx) => idx !== i));
  const move = (i: number, dir: -1 | 1) =>
    setBlocks((b) => {
      const j = i + dir;
      if (j < 0 || j >= b.length) return b;
      const next = [...b];
      [next[i], next[j]] = [next[j], next[i]];
      return next;
    });
  const add = (make: () => AdminNoteBlock) => setBlocks((b) => [...b, make()]);

  const save = async () => {
    if (!title.trim()) return toast.error("Title required");
    setBusy(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      const payload = {
        title: title.trim(),
        template: row.template,
        blocks: blocks as any,
        cover_emoji: emoji,
        published,
        background_image_url: bgUrl,
        notebook_id: row.notebook_id,
        created_by: u.user?.id,
      };
      const q = row.id
        ? (supabase as any).from("admin_notes").update(payload).eq("id", row.id).select("*").single()
        : (supabase as any).from("admin_notes").insert(payload).select("*").single();
      const { data, error } = await q;
      if (error) throw error;
      toast.success("Note saved");
      onSaved(data as NoteRow);
    } catch (e: any) {
      toast.error(e.message || "Save failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <button
          onClick={onClose}
          className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm"
        >
          <X className="w-4 h-4" /> Close
        </button>
        <div className="flex items-center gap-2">
          <label className="inline-flex items-center gap-2 px-3 h-9 rounded-lg border border-white/10 text-sm cursor-pointer">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
            />
            Publish
          </label>
          <button
            onClick={() => setShowPreview((s) => !s)}
            className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-sm"
          >
            <Eye className="w-4 h-4" /> {showPreview ? "Edit" : "Preview"}
          </button>
          <button
            onClick={save}
            disabled={busy}
            className="inline-flex items-center gap-1.5 px-4 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-sm disabled:opacity-60"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />} Save
          </button>
        </div>
      </div>

      {showPreview ? (
        <div className="relative rounded-2xl border border-white/10 overflow-hidden">
          {bgUrl && (
            <>
              <img src={bgUrl} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-background/80 backdrop-blur-sm" />
            </>
          )}
          <div className="relative p-6 md:p-10">
            <div className="text-6xl mb-4">{emoji}</div>
            <h1 className="text-4xl md:text-5xl font-bold mb-6">{title}</h1>
            <AdminNoteRenderer blocks={blocks} language="en" />
          </div>
        </div>
      ) : (
        <>
          <div className="rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-4 md:p-6 space-y-3">
            <input
              value={emoji}
              onChange={(e) => setEmoji(e.target.value.slice(0, 4))}
              className="w-24 h-14 text-4xl text-center rounded-xl bg-background border border-white/10"
            />
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Note title"
              className="w-full h-14 px-4 rounded-xl bg-background border border-white/10 text-2xl font-semibold"
            />
            <div className="pt-2 border-t border-white/10">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="w-4 h-4 text-primary" />
                  Cover image
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => fileRef.current?.click()}
                    disabled={upBusy}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-white/10 hover:border-primary/40 text-xs disabled:opacity-60"
                  >
                    {upBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                    Upload photo
                  </button>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadCover(f); e.currentTarget.value = ""; }}
                  />
                  {bgUrl && (
                    <button
                      onClick={() => setBgUrl(null)}
                      className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg border border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs"
                    >
                      <Trash2 className="w-3.5 h-3.5" /> Remove
                    </button>
                  )}
                  <button
                    onClick={generateBackground}
                    disabled={genBusy}
                    className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 text-xs disabled:opacity-60"
                  >
                    {genBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                    {bgUrl ? "Regenerate" : "Generate with AI"}
                  </button>
                </div>
              </div>
              {bgUrl && (
                <div className="mt-3 rounded-xl overflow-hidden border border-white/10 aspect-[16/9] bg-black">
                  <img src={bgUrl} alt="Background preview" className="w-full h-full object-cover" />
                </div>
              )}
            </div>
          </div>

          <div className="space-y-3">
            {blocks.map((b, i) => (
              <BlockEditor
                key={i}
                block={b}
                onChange={(nb) => update(i, nb)}
                onRemove={() => removeAt(i)}
                onMoveUp={() => move(i, -1)}
                onMoveDown={() => move(i, 1)}
              />
            ))}
          </div>

          <div className="rounded-2xl border border-dashed border-white/10 bg-secondary/20 p-4">
            <p className="text-xs uppercase tracking-widest text-muted-foreground mb-2">
              Add block
            </p>
            <div className="flex flex-wrap gap-2">
              {BLOCK_ADDERS.map((a) => (
                <button
                  key={a.label}
                  onClick={() => add(a.make)}
                  className="inline-flex items-center gap-1.5 px-3 h-8 rounded-lg border border-white/10 hover:border-primary/40 text-xs"
                >
                  <Plus className="w-3.5 h-3.5" /> {a.label}
                </button>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

function BlockEditor({
  block,
  onChange,
  onRemove,
  onMoveUp,
  onMoveDown,
}: {
  block: AdminNoteBlock;
  onChange: (b: AdminNoteBlock) => void;
  onRemove: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-secondary/30 p-3">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
          {block.type}
          {block.type === "heading" ? ` ${block.level}` : ""}
        </span>
        <div className="flex items-center gap-1">
          <button onClick={onMoveUp} className="w-7 h-7 rounded-md hover:bg-white/5">
            <ArrowUp className="w-3.5 h-3.5 mx-auto" />
          </button>
          <button onClick={onMoveDown} className="w-7 h-7 rounded-md hover:bg-white/5">
            <ArrowDown className="w-3.5 h-3.5 mx-auto" />
          </button>
          <button onClick={onRemove} className="w-7 h-7 rounded-md hover:bg-red-500/10 text-red-400">
            <Trash2 className="w-3.5 h-3.5 mx-auto" />
          </button>
        </div>
      </div>

      {block.type === "callout" && (
        <div className="flex gap-2">
          <input
            value={block.emoji || ""}
            onChange={(e) => onChange({ ...block, emoji: e.target.value.slice(0, 4) })}
            className="w-14 h-10 text-center text-xl rounded-lg bg-background border border-white/10"
          />
          <textarea
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            rows={2}
            className="flex-1 px-3 py-2 rounded-lg bg-background border border-white/10 text-sm"
          />
        </div>
      )}
      {block.type === "heading" && (
        <div className="flex gap-2">
          <select
            value={block.level}
            onChange={(e) =>
              onChange({ ...block, level: Number(e.target.value) as 1 | 2 | 3 })
            }
            className="h-10 px-2 rounded-lg bg-background border border-white/10 text-sm"
          >
            <option value={1}>H1</option>
            <option value={2}>H2</option>
            <option value={3}>H3</option>
          </select>
          <input
            value={block.text}
            onChange={(e) => onChange({ ...block, text: e.target.value })}
            className="flex-1 h-10 px-3 rounded-lg bg-background border border-white/10 text-sm font-semibold"
          />
        </div>
      )}
      {block.type === "paragraph" && (
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm"
        />
      )}
      {(block.type === "bullets" || block.type === "numbered") && (
        <div className="space-y-1.5">
          {block.items.map((it, j) => (
            <div key={j} className="flex gap-2">
              <input
                value={it}
                onChange={(e) => {
                  const items = [...block.items];
                  items[j] = e.target.value;
                  onChange({ ...block, items });
                }}
                className="flex-1 h-9 px-3 rounded-lg bg-background border border-white/10 text-sm"
              />
              <button
                onClick={() => {
                  const items = block.items.filter((_, k) => k !== j);
                  onChange({ ...block, items });
                }}
                className="w-9 h-9 rounded-lg border border-white/10 hover:bg-red-500/10 text-red-400"
              >
                <Trash2 className="w-3.5 h-3.5 mx-auto" />
              </button>
            </div>
          ))}
          <button
            onClick={() => onChange({ ...block, items: [...block.items, ""] })}
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            <Plus className="w-3 h-3" /> Add item
          </button>
        </div>
      )}
      {block.type === "quote" && (
        <textarea
          value={block.text}
          onChange={(e) => onChange({ ...block, text: e.target.value })}
          rows={2}
          className="w-full px-3 py-2 rounded-lg bg-background border border-white/10 text-sm italic"
        />
      )}
      {block.type === "divider" && (
        <div className="text-center text-muted-foreground text-xs">— divider —</div>
      )}
    </div>
  );
}