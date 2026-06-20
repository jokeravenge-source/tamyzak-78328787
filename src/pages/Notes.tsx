import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft, Plus, ChevronRight, ChevronDown, Trash2, FileText, Search,
  Type, Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Minus, MoreHorizontal, Smile, PanelLeftClose, PanelLeft,
  BookOpen, FolderPlus, Pencil, Check, X, FolderInput,
} from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { AnimatePresence, motion } from "framer-motion";

type BlockType =
  | "text" | "h1" | "h2" | "h3"
  | "bullet" | "numbered" | "todo"
  | "toggle" | "quote" | "code" | "divider";

type Block = {
  id: string;
  type: BlockType;
  text: string;
  checked?: boolean;
  collapsed?: boolean;
  indent?: number;
};

type Note = {
  id: string;
  parent_id: string | null;
  notebook_id: string | null;
  title: string;
  icon: string;
  content: Block[];
  position: number;
  updated_at: string;
};

type Notebook = {
  id: string;
  name: string;
  icon: string;
  position: number;
};

const newId = () => Math.random().toString(36).slice(2, 11);
const blankBlock = (type: BlockType = "text"): Block => ({ id: newId(), type, text: "" });

const SLASH_OPTIONS: { type: BlockType; labelEn: string; labelAr: string; Icon: any; descEn: string; descAr: string }[] = [
  { type: "text",     labelEn: "Text",          labelAr: "نص",            Icon: Type,        descEn: "Plain paragraph",         descAr: "فقرة عادية" },
  { type: "h1",       labelEn: "Heading 1",     labelAr: "عنوان 1",       Icon: Heading1,    descEn: "Big section heading",     descAr: "عنوان كبير" },
  { type: "h2",       labelEn: "Heading 2",     labelAr: "عنوان 2",       Icon: Heading2,    descEn: "Medium heading",          descAr: "عنوان متوسط" },
  { type: "h3",       labelEn: "Heading 3",     labelAr: "عنوان 3",       Icon: Heading3,    descEn: "Small heading",           descAr: "عنوان صغير" },
  { type: "bullet",   labelEn: "Bulleted list", labelAr: "قائمة نقطية",   Icon: List,        descEn: "Bullet point",            descAr: "نقطة" },
  { type: "numbered", labelEn: "Numbered list", labelAr: "قائمة مرقمة",   Icon: ListOrdered, descEn: "Numbered list",           descAr: "قائمة مرقمة" },
  { type: "todo",     labelEn: "To-do",         labelAr: "مهمة",          Icon: CheckSquare, descEn: "Checkbox task",           descAr: "مربع اختيار" },
  { type: "toggle",   labelEn: "Toggle",        labelAr: "قابل للطي",     Icon: ChevronRight,descEn: "Collapsible block",       descAr: "قابل للطي" },
  { type: "quote",    labelEn: "Quote",         labelAr: "اقتباس",        Icon: Quote,       descEn: "Quote block",             descAr: "اقتباس" },
  { type: "code",     labelEn: "Code",          labelAr: "كود",           Icon: Code,        descEn: "Code snippet",            descAr: "مقتطف كود" },
  { type: "divider",  labelEn: "Divider",       labelAr: "فاصل",          Icon: Minus,       descEn: "Visual separator",        descAr: "خط فاصل" },
];

const ICONS = ["📄","📝","📚","📒","📓","📕","📗","📘","📙","🧠","💡","⭐","🎯","🔥","🚀","🌱","🌟","✨","🧪","🧬","🔬","📊","📈","💻","🎨","🎵","⚽","🏆","💎","🦄","🐱","🐶","🌈","☕","🍎","🍕"];

const copy = {
  en: {
    title: "Notes",
    back: "Back",
    untitled: "Untitled",
    newPage: "New page",
    addSubpage: "Add sub-page",
    delete: "Delete",
    deleteConfirm: "Delete this page and all sub-pages?",
    emptySidebar: "No pages yet. Create one to get started.",
    emptyState: "Pick a page on the left or create a new one.",
    typeSlash: "Type '/' for commands",
    titlePlaceholder: "Untitled",
    search: "Search pages",
    pickIcon: "Pick an icon",
    todoPlaceholder: "To-do",
    togglePlaceholder: "Toggle",
    quotePlaceholder: "Quote",
    codePlaceholder: "Code",
    notebooks: "Notebooks",
    newNotebook: "New notebook",
    newNotebookName: "Notebook name",
    renameNotebook: "Rename notebook",
    deleteNotebook: "Delete notebook",
    deleteNotebookConfirm: "Delete this notebook? Its pages will move to Unassigned.",
    unassigned: "Unassigned",
    rename: "Rename",
    save: "Save",
    cancel: "Cancel",
    addPage: "Add page",
    moveTo: "Move to notebook",
    noNotebook: "No notebook",
    createPrompt: "Name your notebook",
    namePagePrompt: "Page name",
    untitledPage: "Untitled",
  },
  ar: {
    title: "ملاحظاتي",
    back: "رجوع",
    untitled: "بدون عنوان",
    newPage: "صفحة جديدة",
    addSubpage: "إضافة صفحة فرعية",
    delete: "حذف",
    deleteConfirm: "حذف هذه الصفحة وكل صفحاتها الفرعية؟",
    emptySidebar: "لا توجد صفحات بعد. أنشئ واحدة للبدء.",
    emptyState: "اختر صفحة من اليسار أو أنشئ صفحة جديدة.",
    typeSlash: "اكتب '/' لعرض الأوامر",
    titlePlaceholder: "بدون عنوان",
    search: "ابحث في الصفحات",
    pickIcon: "اختر أيقونة",
    todoPlaceholder: "مهمة",
    togglePlaceholder: "قابل للطي",
    quotePlaceholder: "اقتباس",
    codePlaceholder: "كود",
    notebooks: "الدفاتر",
    newNotebook: "دفتر جديد",
    newNotebookName: "اسم الدفتر",
    renameNotebook: "إعادة تسمية الدفتر",
    deleteNotebook: "حذف الدفتر",
    deleteNotebookConfirm: "حذف هذا الدفتر؟ ستنتقل صفحاته إلى غير مصنّف.",
    unassigned: "غير مصنّف",
    rename: "إعادة تسمية",
    save: "حفظ",
    cancel: "إلغاء",
    addPage: "إضافة صفحة",
    moveTo: "نقل إلى دفتر",
    noNotebook: "بدون دفتر",
    createPrompt: "سمِّ الدفتر",
    namePagePrompt: "اسم الصفحة",
    untitledPage: "بدون عنوان",
  },
} as const;

// ---------- Block row ----------
const BlockRow = ({
  block, language, onChange, onEnter, onBackspaceEmpty, onIndent, onOutdent, onSlash,
  onToggleCheck, onToggleCollapse, autoFocus,
}: {
  block: Block;
  language: AppLanguage;
  onChange: (text: string) => void;
  onEnter: () => void;
  onBackspaceEmpty: () => void;
  onIndent: () => void;
  onOutdent: () => void;
  onSlash: (rect: DOMRect, ref: HTMLDivElement) => void;
  onToggleCheck: () => void;
  onToggleCollapse: () => void;
  autoFocus?: boolean;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const t = copy[language];

  // Set initial text once per id/type change
  useEffect(() => {
    if (!ref.current) return;
    if (ref.current.innerText !== block.text) {
      ref.current.innerText = block.text;
    }
  }, [block.id, block.type]);

  useEffect(() => {
    if (autoFocus && ref.current) {
      ref.current.focus();
      // place caret end
      const sel = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(ref.current);
      range.collapse(false);
      sel?.removeAllRanges();
      sel?.addRange(range);
    }
  }, [autoFocus]);

  if (block.type === "divider") {
    return (
      <div className="my-3 px-1">
        <hr className="border-border" />
      </div>
    );
  }

  const indent = Math.min(block.indent ?? 0, 4);

  const baseEditable = "outline-none w-full whitespace-pre-wrap break-words";
  const placeholderEmpty = !block.text;

  const editor = (
    <div
      ref={ref}
      contentEditable
      suppressContentEditableWarning
      data-placeholder={
        block.type === "h1" ? "Heading 1" :
        block.type === "h2" ? "Heading 2" :
        block.type === "h3" ? "Heading 3" :
        block.type === "quote" ? t.quotePlaceholder :
        block.type === "code" ? t.codePlaceholder :
        block.type === "toggle" ? t.togglePlaceholder :
        block.type === "todo" ? t.todoPlaceholder :
        t.typeSlash
      }
      onInput={(e) => {
        const txt = (e.currentTarget as HTMLDivElement).innerText;
        onChange(txt);
        if (txt === "/" && ref.current) {
          const rect = ref.current.getBoundingClientRect();
          onSlash(rect, ref.current);
        }
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && !e.shiftKey) {
          e.preventDefault();
          onEnter();
        } else if (e.key === "Backspace") {
          if ((ref.current?.innerText ?? "") === "") {
            e.preventDefault();
            onBackspaceEmpty();
          }
        } else if (e.key === "Tab") {
          e.preventDefault();
          if (e.shiftKey) onOutdent();
          else onIndent();
        }
      }}
      className={[
        baseEditable,
        block.type === "h1" && "text-3xl md:text-4xl font-bold py-1",
        block.type === "h2" && "text-2xl md:text-3xl font-bold py-1",
        block.type === "h3" && "text-xl md:text-2xl font-semibold py-1",
        block.type === "text" && "text-[15px] leading-relaxed",
        block.type === "bullet" && "text-[15px] leading-relaxed",
        block.type === "numbered" && "text-[15px] leading-relaxed",
        block.type === "todo" && `text-[15px] leading-relaxed ${block.checked ? "line-through text-muted-foreground" : ""}`,
        block.type === "toggle" && "text-[15px] font-medium leading-relaxed",
        block.type === "quote" && "text-[15px] italic leading-relaxed",
        block.type === "code" && "font-mono text-sm",
        placeholderEmpty && "before:content-[attr(data-placeholder)] before:text-muted-foreground/40 before:pointer-events-none empty:before:block",
      ].filter(Boolean).join(" ")}
      style={{ caretColor: "hsl(var(--primary))" }}
    />
  );

  const wrapperBase = "group flex items-start gap-2 rounded-md px-2 py-0.5 hover:bg-secondary/40 transition-colors";
  const indentPad = { paddingInlineStart: `${indent * 1.5}rem` };

  if (block.type === "bullet") {
    return (
      <div className={wrapperBase} style={indentPad}>
        <span className="mt-2 w-1.5 h-1.5 rounded-full bg-foreground shrink-0" />
        <div className="flex-1 min-w-0">{editor}</div>
      </div>
    );
  }
  if (block.type === "numbered") {
    return (
      <div className={wrapperBase} style={indentPad}>
        <span className="mt-1 text-sm text-muted-foreground shrink-0 min-w-[1ch]">•</span>
        <div className="flex-1 min-w-0">{editor}</div>
      </div>
    );
  }
  if (block.type === "todo") {
    return (
      <div className={wrapperBase} style={indentPad}>
        <button
          onClick={onToggleCheck}
          className={`mt-1.5 w-4 h-4 rounded border ${block.checked ? "bg-primary border-primary" : "border-border bg-card"} shrink-0 flex items-center justify-center transition-colors`}
          aria-label="toggle"
        >
          {block.checked && <CheckSquare className="w-3 h-3 text-primary-foreground" />}
        </button>
        <div className="flex-1 min-w-0">{editor}</div>
      </div>
    );
  }
  if (block.type === "toggle") {
    return (
      <div className={wrapperBase} style={indentPad}>
        <button onClick={onToggleCollapse} className="mt-1 shrink-0 text-muted-foreground hover:text-foreground transition-colors">
          {block.collapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        <div className="flex-1 min-w-0">{editor}</div>
      </div>
    );
  }
  if (block.type === "quote") {
    return (
      <div className={wrapperBase} style={indentPad}>
        <div className="flex-1 min-w-0 border-l-4 border-primary/60 pl-3">{editor}</div>
      </div>
    );
  }
  if (block.type === "code") {
    return (
      <div className="my-2 px-2" style={indentPad}>
        <div className="rounded-lg bg-secondary/60 border border-border p-3">{editor}</div>
      </div>
    );
  }
  return (
    <div className={wrapperBase} style={indentPad}>
      <div className="flex-1 min-w-0">{editor}</div>
    </div>
  );
};

// ---------- Sidebar tree ----------
type TreeNode = Note & { children: TreeNode[] };
const buildTree = (notes: Note[]): TreeNode[] => {
  const map = new Map<string, TreeNode>();
  notes.forEach((n) => map.set(n.id, { ...n, children: [] }));
  const roots: TreeNode[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });
  const sort = (arr: TreeNode[]) => {
    arr.sort((a, b) => a.position - b.position || a.title.localeCompare(b.title));
    arr.forEach((c) => sort(c.children));
  };
  sort(roots);
  return roots;
};

const TreeItem = ({
  node, depth, activeId, expanded, onToggle, onSelect, onAddChild, onDelete, onRename, language,
}: {
  node: TreeNode;
  depth: number;
  activeId: string | null;
  expanded: Set<string>;
  onToggle: (id: string) => void;
  onSelect: (id: string) => void;
  onAddChild: (parentId: string) => void;
  onDelete: (id: string) => void;
  onRename: (id: string, newTitle: string) => void;
  language: AppLanguage;
}) => {
  const t = copy[language];
  const isOpen = expanded.has(node.id);
  const active = activeId === node.id;
  const hasChildren = node.children.length > 0;
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(node.title);
  useEffect(() => { setDraft(node.title); }, [node.title]);
  const commit = () => { onRename(node.id, draft.trim() || t.untitledPage); setEditing(false); };
  return (
    <div>
      <div
        className={`group flex items-center gap-1 rounded-md px-1 py-1 cursor-pointer transition-colors ${
          active ? "bg-primary/10 text-primary" : "text-foreground/80 hover:bg-secondary"
        }`}
        style={{ paddingInlineStart: `${depth * 0.75 + 0.25}rem` }}
        onClick={() => { if (!editing) onSelect(node.id); }}
        onDoubleClick={(e) => { e.stopPropagation(); setEditing(true); }}
      >
        <button
          onClick={(e) => { e.stopPropagation(); if (hasChildren) onToggle(node.id); }}
          className={`w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-foreground/10 ${hasChildren ? "" : "opacity-30 cursor-default"}`}
        >
          {isOpen ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
        </button>
        <span className="text-sm shrink-0">{node.icon || "📄"}</span>
        {editing ? (
          <input
            autoFocus
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onClick={(e) => e.stopPropagation()}
            onBlur={commit}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); commit(); }
              else if (e.key === "Escape") { setDraft(node.title); setEditing(false); }
            }}
            className="flex-1 min-w-0 text-sm bg-card border border-primary/40 rounded px-1 outline-none"
          />
        ) : (
          <span className="text-sm truncate flex-1">{node.title || t.untitled}</span>
        )}
        <button
          onClick={(e) => { e.stopPropagation(); setEditing(true); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-foreground/10"
          aria-label={t.rename}
          title={t.rename}
        >
          <Pencil className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); onAddChild(node.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-foreground/10"
          aria-label={t.addSubpage}
          title={t.addSubpage}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => { e.stopPropagation(); if (confirm(t.deleteConfirm)) onDelete(node.id); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20 hover:text-destructive"
          aria-label={t.delete}
          title={t.delete}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
      <AnimatePresence initial={false}>
        {isOpen && hasChildren && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: "hidden" }}
          >
            {node.children.map((c) => (
              <TreeItem
                key={c.id}
                node={c}
                depth={depth + 1}
                activeId={activeId}
                expanded={expanded}
                onToggle={onToggle}
                onSelect={onSelect}
                onAddChild={onAddChild}
                onDelete={onDelete}
                onRename={onRename}
                language={language}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

// ---------- Main page ----------
const Notes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const isRTL = language === "ar";
  const [notes, setNotes] = useState<Note[]>([]);
  const [notebooks, setNotebooks] = useState<Notebook[]>([]);
  const [expandedNotebooks, setExpandedNotebooks] = useState<Set<string>>(new Set());
  const [editingNotebookId, setEditingNotebookId] = useState<string | null>(null);
  const [notebookDraft, setNotebookDraft] = useState("");
  const [moveMenuFor, setMoveMenuFor] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [search, setSearch] = useState("");
  const [slash, setSlash] = useState<{ blockId: string; x: number; y: number } | null>(null);
  const [iconPickerFor, setIconPickerFor] = useState<string | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string | null>(null);

  // Load notes
  useEffect(() => {
    (async () => {
      const [notesRes, nbRes] = await Promise.all([
        supabase.from("notes").select("*").order("position", { ascending: true }),
        supabase.from("notebooks").select("*").order("position", { ascending: true }),
      ]);
      if (nbRes.error) toast.error(nbRes.error.message);
      else if (nbRes.data) {
        setNotebooks(nbRes.data as Notebook[]);
        setExpandedNotebooks(new Set((nbRes.data as Notebook[]).map((n) => n.id)));
      }
      const { data, error } = notesRes;
      if (error) {
        toast.error(error.message);
      } else if (data) {
        const fixed: Note[] = data.map((n: any) => ({
          ...n,
          content: Array.isArray(n.content) && n.content.length > 0 ? n.content : [blankBlock()],
        }));
        setNotes(fixed);
        if (fixed.length > 0 && !activeId) setActiveId(fixed[0].id);
      }
      setLoading(false);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const active = useMemo(() => notes.find((n) => n.id === activeId) || null, [notes, activeId]);

  // Debounced save per note
  const saveTimers = useRef<Map<string, number>>(new Map());
  const scheduleSave = useCallback((note: Note) => {
    const map = saveTimers.current;
    const prev = map.get(note.id);
    if (prev) window.clearTimeout(prev);
    const id = window.setTimeout(async () => {
      await supabase
        .from("notes")
        .update({
          title: note.title,
          icon: note.icon,
          content: note.content as any,
          position: note.position,
          parent_id: note.parent_id,
          notebook_id: note.notebook_id,
        })
        .eq("id", note.id);
    }, 600);
    map.set(note.id, id);
  }, []);

  const updateNote = useCallback((id: string, patch: Partial<Note>) => {
    setNotes((prev) => {
      const next = prev.map((n) => (n.id === id ? { ...n, ...patch } : n));
      const updated = next.find((n) => n.id === id);
      if (updated) scheduleSave(updated);
      return next;
    });
  }, [scheduleSave]);

  // Create page
  const createNote = useCallback(async (parentId: string | null = null, notebookId: string | null = null) => {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Not signed in"); return; }
    const nb = parentId ? notes.find((p) => p.id === parentId)?.notebook_id ?? null : notebookId;
    const position = notes.filter((n) => n.parent_id === parentId).length;
    const { data, error } = await supabase
      .from("notes")
      .insert({
        user_id: u.user.id,
        parent_id: parentId,
        notebook_id: nb,
        title: "",
        icon: "📄",
        content: [blankBlock()] as any,
        position,
      })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    const newNote: Note = { ...(data as any), content: [blankBlock()] };
    setNotes((prev) => [...prev, newNote]);
    setActiveId(newNote.id);
    if (parentId) setExpanded((s) => new Set(s).add(parentId));
    if (nb) setExpandedNotebooks((s) => new Set(s).add(nb));
  }, [notes]);

  // Delete
  const deleteNote = useCallback(async (id: string) => {
    const { error } = await supabase.from("notes").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    // remove id and all descendants from state
    const toRemove = new Set<string>([id]);
    let changed = true;
    while (changed) {
      changed = false;
      notes.forEach((n) => {
        if (n.parent_id && toRemove.has(n.parent_id) && !toRemove.has(n.id)) {
          toRemove.add(n.id);
          changed = true;
        }
      });
    }
    setNotes((prev) => prev.filter((n) => !toRemove.has(n.id)));
    if (activeId && toRemove.has(activeId)) setActiveId(null);
  }, [notes, activeId]);

  // ----- Notebook CRUD -----
  const createNotebook = useCallback(async () => {
    const name = window.prompt(t.createPrompt, t.newNotebook);
    if (!name || !name.trim()) return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) { toast.error("Not signed in"); return; }
    const position = notebooks.length;
    const { data, error } = await supabase
      .from("notebooks")
      .insert({ user_id: u.user.id, name: name.trim(), icon: "📚", position })
      .select()
      .single();
    if (error) { toast.error(error.message); return; }
    setNotebooks((prev) => [...prev, data as Notebook]);
    setExpandedNotebooks((s) => new Set(s).add((data as Notebook).id));
  }, [notebooks, t]);

  const renameNotebook = useCallback(async (id: string, name: string) => {
    const clean = name.trim() || t.newNotebook;
    setNotebooks((prev) => prev.map((n) => n.id === id ? { ...n, name: clean } : n));
    await supabase.from("notebooks").update({ name: clean }).eq("id", id);
  }, [t]);

  const deleteNotebook = useCallback(async (id: string) => {
    if (!confirm(t.deleteNotebookConfirm)) return;
    const { error } = await supabase.from("notebooks").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    setNotebooks((prev) => prev.filter((n) => n.id !== id));
    // Pages will have notebook_id = null due to ON DELETE SET NULL
    setNotes((prev) => prev.map((n) => n.notebook_id === id ? { ...n, notebook_id: null } : n));
  }, [t]);

  const moveNoteToNotebook = useCallback((noteId: string, notebookId: string | null) => {
    updateNote(noteId, { notebook_id: notebookId });
    if (notebookId) setExpandedNotebooks((s) => new Set(s).add(notebookId));
    setMoveMenuFor(null);
  }, [updateNote]);

  const renamePage = useCallback((id: string, title: string) => {
    updateNote(id, { title });
  }, [updateNote]);

  // Block ops on active note
  const setBlocks = (updater: (blocks: Block[]) => Block[]) => {
    if (!active) return;
    const newBlocks = updater(active.content);
    updateNote(active.id, { content: newBlocks });
  };

  const onBlockChange = (blockId: string, text: string) => {
    if (!active) return;
    // Markdown shortcuts: detect at start
    const trimmed = text;
    let newType: BlockType | null = null;
    let stripLen = 0;
    if (trimmed === "# " || trimmed.startsWith("# ")) { newType = "h1"; stripLen = 2; }
    else if (trimmed.startsWith("## ")) { newType = "h2"; stripLen = 3; }
    else if (trimmed.startsWith("### ")) { newType = "h3"; stripLen = 4; }
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) { newType = "bullet"; stripLen = 2; }
    else if (trimmed.startsWith("1. ")) { newType = "numbered"; stripLen = 3; }
    else if (trimmed.startsWith("[] ") || trimmed.startsWith("[ ] ")) { newType = "todo"; stripLen = trimmed.startsWith("[] ") ? 3 : 4; }
    else if (trimmed.startsWith("> ")) { newType = "quote"; stripLen = 2; }
    else if (trimmed === "---") { newType = "divider"; stripLen = 3; }

    setBlocks((blocks) => blocks.map((b) => {
      if (b.id !== blockId) return b;
      if (newType && b.type === "text" && b.text === "") {
        // transform only when current was text & empty -> typed shortcut
        return { ...b, type: newType, text: text.slice(stripLen) };
      }
      return { ...b, text };
    }));
    // For shortcut transform, force re-render of editor to clear text
    if (newType) {
      setFocusBlockId(blockId);
    }
  };

  const onBlockEnter = (blockId: string) => {
    setBlocks((blocks) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return blocks;
      const current = blocks[idx];
      // Empty list item on Enter -> convert to text instead of new block
      if ((current.type === "bullet" || current.type === "numbered" || current.type === "todo") && !current.text) {
        const copy = [...blocks];
        copy[idx] = { ...current, type: "text" };
        return copy;
      }
      const inheritType: BlockType =
        current.type === "bullet" || current.type === "numbered" || current.type === "todo"
          ? current.type
          : "text";
      const nb: Block = { id: newId(), type: inheritType, text: "", indent: current.indent };
      setFocusBlockId(nb.id);
      const copy = [...blocks];
      copy.splice(idx + 1, 0, nb);
      return copy;
    });
  };

  const onBackspaceEmpty = (blockId: string) => {
    setBlocks((blocks) => {
      const idx = blocks.findIndex((b) => b.id === blockId);
      if (idx === -1) return blocks;
      const current = blocks[idx];
      // Non-text empty block -> convert to text
      if (current.type !== "text") {
        const copy = [...blocks];
        copy[idx] = { ...current, type: "text" };
        setFocusBlockId(current.id);
        return copy;
      }
      // Text empty -> remove and focus previous
      if (blocks.length === 1) return blocks;
      const prev = blocks[idx - 1];
      if (prev) setFocusBlockId(prev.id);
      return blocks.filter((b, i) => i !== idx);
    });
  };

  const onIndent = (blockId: string) => {
    setBlocks((blocks) => blocks.map((b) => b.id === blockId ? { ...b, indent: Math.min((b.indent ?? 0) + 1, 4) } : b));
  };
  const onOutdent = (blockId: string) => {
    setBlocks((blocks) => blocks.map((b) => b.id === blockId ? { ...b, indent: Math.max((b.indent ?? 0) - 1, 0) } : b));
  };

  const applySlashType = (type: BlockType) => {
    if (!slash) return;
    setBlocks((blocks) => blocks.map((b) => b.id === slash.blockId ? { ...b, type, text: "" } : b));
    setFocusBlockId(slash.blockId);
    setSlash(null);
  };

  const tree = useMemo(() => {
    let filtered = notes;
    if (search.trim()) {
      const q = search.toLowerCase();
      filtered = notes.filter((n) => (n.title || "").toLowerCase().includes(q));
    }
    return buildTree(filtered);
  }, [notes, search]);

  // Group root pages by notebook
  const notebookGroups = useMemo(() => {
    const filtered = search.trim()
      ? notes.filter((n) => (n.title || "").toLowerCase().includes(search.toLowerCase()))
      : notes;
    const byParent = new Map<string | null, Note[]>();
    filtered.forEach((n) => {
      const arr = byParent.get(n.parent_id) || [];
      arr.push(n);
      byParent.set(n.parent_id, arr);
    });
    const fullTree = buildTree(filtered);
    // map id -> tree node for quick lookup
    const treeMap = new Map<string, TreeNode>();
    const walk = (n: TreeNode) => { treeMap.set(n.id, n); n.children.forEach(walk); };
    fullTree.forEach(walk);

    const groups = notebooks.map((nb) => ({
      notebook: nb as Notebook | null,
      roots: filtered
        .filter((n) => n.parent_id === null && n.notebook_id === nb.id)
        .map((n) => treeMap.get(n.id)!)
        .filter(Boolean)
        .sort((a, b) => a.position - b.position),
    }));
    const unassignedRoots = filtered
      .filter((n) => n.parent_id === null && !n.notebook_id)
      .map((n) => treeMap.get(n.id)!)
      .filter(Boolean)
      .sort((a, b) => a.position - b.position);
    if (unassignedRoots.length > 0) {
      groups.push({ notebook: null, roots: unassignedRoots });
    }
    return groups;
  }, [notes, notebooks, search]);

  // Breadcrumb for active page
  const breadcrumb = useMemo(() => {
    if (!active) return [];
    const chain: Note[] = [];
    let cur: Note | null = active;
    while (cur) {
      chain.unshift(cur);
      cur = cur.parent_id ? notes.find((n) => n.id === cur!.parent_id) || null : null;
    }
    return chain;
  }, [active, notes]);

  return (
    <div className="min-h-screen w-full bg-background text-foreground flex" dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <AnimatePresence initial={false}>
        {sidebarOpen && (
          <motion.aside
            initial={{ width: 0, opacity: 0 }}
            animate={{ width: 280, opacity: 1 }}
            exit={{ width: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-r border-border bg-secondary/30 backdrop-blur-sm flex flex-col h-screen sticky top-0 overflow-hidden"
            style={{ minWidth: 0 }}
          >
            <div className="w-[280px] flex flex-col h-full">
              <div className="p-3 border-b border-border flex items-center gap-2">
                <button
                  onClick={onBack}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label={t.back}
                >
                  <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                </button>
                <span className="text-sm font-bold flex-1 truncate">{t.title}</span>
                <button
                  onClick={() => setSidebarOpen(false)}
                  className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
                  aria-label="collapse"
                >
                  <PanelLeftClose className="w-4 h-4" />
                </button>
              </div>
              <div className="p-2">
                <div className="relative">
                  <Search className={`w-3.5 h-3.5 absolute top-1/2 -translate-y-1/2 ${isRTL ? "right-2.5" : "left-2.5"} text-muted-foreground`} />
                  <input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={t.search}
                    className={`w-full h-8 ${isRTL ? "pr-8 pl-2" : "pl-8 pr-2"} rounded-md bg-card border border-border text-sm outline-none focus:border-primary/40`}
                  />
                </div>
              </div>
              <div className="flex-1 overflow-y-auto px-2 pb-2">
                {loading ? (
                  <div className="p-4 text-xs text-muted-foreground">Loading…</div>
                ) : notebooks.length === 0 && notes.length === 0 ? (
                  <div className="p-4 text-xs text-muted-foreground">{t.emptySidebar}</div>
                ) : (
                  <div className="space-y-3">
                    {notebookGroups.map((g, gi) => {
                      const nb = g.notebook;
                      const nbId = nb?.id ?? "__none";
                      const open = nb ? expandedNotebooks.has(nb.id) : true;
                      const isEditingNb = nb && editingNotebookId === nb.id;
                      return (
                        <div key={nbId}>
                          <div className="group flex items-center gap-1 rounded-md px-1 py-1.5 hover:bg-secondary/60 transition-colors">
                            <button
                              onClick={() => {
                                if (!nb) return;
                                setExpandedNotebooks((s) => { const n = new Set(s); n.has(nb.id) ? n.delete(nb.id) : n.add(nb.id); return n; });
                              }}
                              className="w-4 h-4 flex items-center justify-center shrink-0 rounded hover:bg-foreground/10"
                            >
                              {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                            </button>
                            <span className="text-base shrink-0">{nb ? nb.icon : "📥"}</span>
                            {isEditingNb ? (
                              <input
                                autoFocus
                                value={notebookDraft}
                                onChange={(e) => setNotebookDraft(e.target.value)}
                                onBlur={() => { renameNotebook(nb!.id, notebookDraft); setEditingNotebookId(null); }}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") { e.preventDefault(); renameNotebook(nb!.id, notebookDraft); setEditingNotebookId(null); }
                                  else if (e.key === "Escape") { setEditingNotebookId(null); }
                                }}
                                className="flex-1 min-w-0 text-xs font-bold uppercase tracking-wider bg-card border border-primary/40 rounded px-1 outline-none"
                              />
                            ) : (
                              <button
                                onDoubleClick={() => { if (nb) { setNotebookDraft(nb.name); setEditingNotebookId(nb.id); } }}
                                className="flex-1 text-start text-xs font-bold uppercase tracking-wider truncate text-foreground/70"
                              >
                                {nb ? nb.name : t.unassigned}
                              </button>
                            )}
                            {nb && (
                              <>
                                <button
                                  onClick={() => { setNotebookDraft(nb.name); setEditingNotebookId(nb.id); }}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-foreground/10"
                                  aria-label={t.rename}
                                  title={t.rename}
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => createNote(null, nb.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-foreground/10"
                                  aria-label={t.addPage}
                                  title={t.addPage}
                                >
                                  <Plus className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteNotebook(nb.id)}
                                  className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-destructive/20 hover:text-destructive"
                                  aria-label={t.deleteNotebook}
                                  title={t.deleteNotebook}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                          <AnimatePresence initial={false}>
                            {open && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: "auto", opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2 }}
                                style={{ overflow: "hidden" }}
                              >
                                {g.roots.length === 0 ? (
                                  <p className="text-[11px] text-muted-foreground/70 italic px-3 py-1">
                                    {language === "ar" ? "لا توجد صفحات" : "No pages"}
                                  </p>
                                ) : (
                                  g.roots.map((n) => (
                                    <TreeItem
                                      key={n.id}
                                      node={n}
                                      depth={0}
                                      activeId={activeId}
                                      expanded={expanded}
                                      onToggle={(id) => setExpanded((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; })}
                                      onSelect={setActiveId}
                                      onAddChild={(pid) => createNote(pid)}
                                      onDelete={deleteNote}
                                      onRename={renamePage}
                                      language={language}
                                    />
                                  ))
                                )}
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
              <div className="p-2 border-t border-border space-y-2">
                <button
                  onClick={createNotebook}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-card text-sm font-semibold hover:bg-secondary transition-colors"
                >
                  <FolderPlus className="w-4 h-4" />
                  {t.newNotebook}
                </button>
                <button
                  onClick={() => createNote(null)}
                  className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity"
                >
                  <Plus className="w-4 h-4" />
                  {t.newPage}
                </button>
              </div>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main */}
      <main className="flex-1 min-w-0 flex flex-col">
        {/* Top bar */}
        <div className="sticky top-0 z-30 backdrop-blur-md bg-background/70 border-b border-border h-12 flex items-center px-3 gap-2">
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground"
              aria-label="open sidebar"
            >
              <PanelLeft className="w-4 h-4" />
            </button>
          )}
          <div className="flex items-center gap-1 text-sm text-muted-foreground min-w-0 flex-1 overflow-hidden">
            {breadcrumb.length === 0 ? (
              <span>{t.title}</span>
            ) : (
              breadcrumb.map((b, i) => (
                <span key={b.id} className="inline-flex items-center gap-1 truncate">
                  {i > 0 && <ChevronRight className={`w-3 h-3 ${isRTL ? "rotate-180" : ""}`} />}
                  <span className="truncate">{b.icon} {b.title || t.untitled}</span>
                </span>
              ))
            )}
          </div>
        </div>

        {/* Content */}
        {!active ? (
          <div className="flex-1 flex items-center justify-center text-center px-6">
            <div className="max-w-md">
              <div className="w-16 h-16 rounded-2xl bg-primary/10 mx-auto flex items-center justify-center mb-4">
                <FileText className="w-8 h-8 text-primary" />
              </div>
              <p className="text-muted-foreground mb-5">{t.emptyState}</p>
              <button
                onClick={() => createNote(null)}
                className="inline-flex items-center gap-2 h-10 px-5 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-95 transition-opacity"
              >
                <Plus className="w-4 h-4" />
                {t.newPage}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-4 md:px-12 py-12 pb-40">
              {/* Notebook selector */}
              <div className="mb-4 relative">
                <button
                  onClick={() => setMoveMenuFor(moveMenuFor === active.id ? null : active.id)}
                  className="inline-flex items-center gap-2 h-8 px-3 rounded-full border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5" />
                  <span>{notebooks.find((n) => n.id === active.notebook_id)?.name ?? t.noNotebook}</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
                {moveMenuFor === active.id && (
                  <div className="absolute z-40 mt-1 w-64 max-h-72 overflow-y-auto rounded-xl bg-popover border border-border shadow-lg p-1">
                    <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t.moveTo}</p>
                    <button
                      onClick={() => moveNoteToNotebook(active.id, null)}
                      className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary text-left text-sm ${!active.notebook_id ? "text-primary" : ""}`}
                    >
                      <FolderInput className="w-4 h-4" />
                      <span className="flex-1">{t.unassigned}</span>
                      {!active.notebook_id && <Check className="w-4 h-4" />}
                    </button>
                    {notebooks.map((nb) => (
                      <button
                        key={nb.id}
                        onClick={() => moveNoteToNotebook(active.id, nb.id)}
                        className={`w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary text-left text-sm ${active.notebook_id === nb.id ? "text-primary" : ""}`}
                      >
                        <span>{nb.icon}</span>
                        <span className="flex-1 truncate">{nb.name}</span>
                        {active.notebook_id === nb.id && <Check className="w-4 h-4" />}
                      </button>
                    ))}
                    <button
                      onClick={() => { setMoveMenuFor(null); createNotebook(); }}
                      className="w-full flex items-center gap-2 px-2 py-2 rounded-lg hover:bg-secondary text-left text-sm text-muted-foreground border-t border-border mt-1"
                    >
                      <FolderPlus className="w-4 h-4" />
                      {t.newNotebook}
                    </button>
                  </div>
                )}
              </div>

              {/* Icon */}
              <div className="relative inline-block mb-3">
                <button
                  onClick={() => setIconPickerFor(iconPickerFor === active.id ? null : active.id)}
                  className="text-5xl md:text-6xl hover:bg-secondary rounded-lg px-2 py-1 transition-colors"
                  aria-label={t.pickIcon}
                >
                  {active.icon || "📄"}
                </button>
                {iconPickerFor === active.id && (
                  <div className="absolute z-40 mt-2 p-3 rounded-xl bg-popover border border-border shadow-lg grid grid-cols-9 gap-1 w-[22rem]">
                    {ICONS.map((ic) => (
                      <button
                        key={ic}
                        onClick={() => { updateNote(active.id, { icon: ic }); setIconPickerFor(null); }}
                        className="text-xl hover:bg-secondary rounded p-1.5 transition-colors"
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Title */}
              <input
                value={active.title}
                onChange={(e) => updateNote(active.id, { title: e.target.value })}
                placeholder={t.titlePlaceholder}
                className="w-full text-4xl md:text-5xl font-bold bg-transparent outline-none placeholder:text-muted-foreground/30 mb-6"
              />

              {/* Blocks */}
              <div className="space-y-0.5" onClick={(e) => { if (slash) setSlash(null); }}>
                {active.content.map((b, idx) => (
                  <BlockRow
                    key={b.id}
                    block={b}
                    language={language}
                    autoFocus={focusBlockId === b.id}
                    onChange={(text) => onBlockChange(b.id, text)}
                    onEnter={() => onBlockEnter(b.id)}
                    onBackspaceEmpty={() => onBackspaceEmpty(b.id)}
                    onIndent={() => onIndent(b.id)}
                    onOutdent={() => onOutdent(b.id)}
                    onSlash={(rect) => setSlash({ blockId: b.id, x: rect.left, y: rect.bottom + window.scrollY })}
                    onToggleCheck={() => setBlocks((blocks) => blocks.map((x) => x.id === b.id ? { ...x, checked: !x.checked } : x))}
                    onToggleCollapse={() => setBlocks((blocks) => blocks.map((x) => x.id === b.id ? { ...x, collapsed: !x.collapsed } : x))}
                  />
                ))}

                {/* Add block button */}
                <button
                  onClick={() => {
                    const nb = blankBlock();
                    setBlocks((blocks) => [...blocks, nb]);
                    setFocusBlockId(nb.id);
                  }}
                  className="mt-2 inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground rounded-md px-2 py-1 hover:bg-secondary transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {language === "ar" ? "إضافة كتلة" : "Add block"}
                </button>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Slash menu */}
      {slash && (
        <div
          className="fixed z-50 w-64 max-h-80 overflow-y-auto rounded-xl bg-popover border border-border shadow-xl p-1"
          style={{ left: Math.min(slash.x, window.innerWidth - 280), top: slash.y + 4 }}
        >
          {SLASH_OPTIONS.map((opt) => {
            const Icon = opt.Icon;
            return (
              <button
                key={opt.type}
                onClick={() => applySlashType(opt.type)}
                className="w-full flex items-center gap-3 px-2 py-2 rounded-lg hover:bg-secondary text-left transition-colors"
              >
                <div className="w-8 h-8 rounded-md bg-card border border-border flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{language === "ar" ? opt.labelAr : opt.labelEn}</p>
                  <p className="text-xs text-muted-foreground truncate">{language === "ar" ? opt.descAr : opt.descEn}</p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default Notes;