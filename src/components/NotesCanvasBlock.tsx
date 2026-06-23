import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil, Eraser, Square, Circle as CircleIcon, Minus as LineIcon,
  MoveUpRight, Tag, Type, MousePointer2, Trash2, Maximize2, Smile, Expand, Minimize2,
  Upload, ImagePlus, Loader2, X as XIcon,
  ZoomIn, ZoomOut, RotateCcw,
  PanelLeftClose, PanelLeft,
} from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type CanvasStroke = {
  id: string; kind: "stroke"; color: string; size: number;
  points: { x: number; y: number }[];
};
export type CanvasShape = {
  id: string; kind: "shape";
  shape: "rect" | "ellipse" | "line" | "arrow";
  color: string; size: number;
  x: number; y: number; w: number; h: number;
};
export type CanvasLabel = {
  id: string; kind: "label";
  x: number; y: number; w: number; h: number;
  text: string; color: string; bg: string;
};
export type CanvasSticker = {
  id: string; kind: "sticker";
  x: number; y: number; w: number; h: number;
  emoji?: string;
  url?: string;
};
export type CanvasItem = CanvasStroke | CanvasShape | CanvasLabel | CanvasSticker;
export type CanvasData = { items: CanvasItem[]; height: number };

type Tool = "select" | "pen" | "eraser" | "rect" | "ellipse" | "line" | "arrow" | "label" | "text" | "sticker";

const PALETTE = ["#0f172a", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];
const LABEL_BGS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#e0e7ff", "#f1f5f9"];
const STICKERS = [
  "⭐", "❤️", "🔥", "✅", "❌", "❓", "❗", "💡",
  "📌", "📍", "🎯", "🏆", "👍", "👎", "🙌", "👏",
  "😀", "😎", "🤔", "😢", "😡", "🥳", "🤩", "😴",
  "📚", "✏️", "📝", "🧠", "🔬", "🧪", "🧮", "🌍",
  "🚀", "⚡", "💎", "🎨", "🎵", "☕", "🍕", "🌸",
];
const rid = () => Math.random().toString(36).slice(2, 10);

function bboxOf(it: CanvasItem) {
  if (it.kind === "stroke") {
    const xs = it.points.map(p => p.x), ys = it.points.map(p => p.y);
    return { x: Math.min(...xs), y: Math.min(...ys), w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) };
  }
  return { x: Math.min(it.x, it.x + it.w), y: Math.min(it.y, it.y + it.h), w: Math.abs(it.w), h: Math.abs(it.h) };
}

function hits(it: CanvasItem, px: number, py: number, r = 8) {
  if (it.kind === "stroke") {
    return it.points.some(p => Math.hypot(p.x - px, p.y - py) <= Math.max(r, it.size));
  }
  const b = bboxOf(it);
  return px >= b.x - r && px <= b.x + b.w + r && py >= b.y - r && py <= b.y + b.h + r;
}

const NotesCanvasBlock = ({
  data, onChange, language, expandable = false, fullscreen: fullscreenProp,
  onToggleFullscreen,
}: {
  data: CanvasData | undefined;
  onChange: (next: CanvasData) => void;
  language: "en" | "ar";
  expandable?: boolean;
  fullscreen?: boolean;
  onToggleFullscreen?: () => void;
}) => {
  const isRTL = language === "ar";
  const safe: CanvasData = useMemo(
    () => (data && Array.isArray(data.items) ? { items: data.items, height: data.height || 360 } : { items: [], height: 360 }),
    [data],
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [size, setSize] = useState<number>(3);
  const [labelBg, setLabelBg] = useState<string>(LABEL_BGS[0]);
  const [sticker, setSticker] = useState<string>(STICKERS[0]);
  const [customStickerUrl, setCustomStickerUrl] = useState<string | null>(null);
  const [userStickers, setUserStickers] = useState<{ name: string; url: string }[]>([]);
  const [uploadingSticker, setUploadingSticker] = useState(false);
  const [loadingStickers, setLoadingStickers] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const userIdRef = useRef<string | null>(null);

  const loadUserStickers = async () => {
    try {
      setLoadingStickers(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id ?? null;
      userIdRef.current = uid;
      if (!uid) { setUserStickers([]); return; }
      const { data, error } = await supabase.storage.from("stickers").list(uid, {
        limit: 100, sortBy: { column: "created_at", order: "desc" },
      });
      if (error) throw error;
      const items = (data ?? [])
        .filter(f => f.name && !f.name.startsWith("."))
        .map(f => {
          const path = `${uid}/${f.name}`;
          const { data: pub } = supabase.storage.from("stickers").getPublicUrl(path);
          return { name: f.name, url: pub.publicUrl };
        });
      setUserStickers(items);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoadingStickers(false);
    }
  };

  useEffect(() => {
    if (tool === "sticker" && userStickers.length === 0) loadUserStickers();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tool]);

  const uploadSticker = async (file: File) => {
    try {
      if (!file.type.startsWith("image/")) {
        toast.error(isRTL ? "اختر ملف صورة" : "Please pick an image file");
        return;
      }
      if (file.size > 2 * 1024 * 1024) {
        toast.error(isRTL ? "الحد الأقصى 2 ميغابايت" : "Max size is 2MB");
        return;
      }
      setUploadingSticker(true);
      const { data: u } = await supabase.auth.getUser();
      const uid = u.user?.id;
      if (!uid) {
        toast.error(isRTL ? "سجّل الدخول أولاً" : "Please sign in first");
        return;
      }
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      const path = `${uid}/${Date.now()}-${rid()}.${ext}`;
      const { error } = await supabase.storage.from("stickers").upload(path, file, {
        cacheControl: "3600", upsert: false, contentType: file.type,
      });
      if (error) throw error;
      const { data: pub } = supabase.storage.from("stickers").getPublicUrl(path);
      setUserStickers(s => [{ name: path.split("/").pop()!, url: pub.publicUrl }, ...s]);
      setCustomStickerUrl(pub.publicUrl);
      toast.success(isRTL ? "تمت الإضافة" : "Sticker added");
    } catch (e: any) {
      toast.error(e.message || "Upload failed");
    } finally {
      setUploadingSticker(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const deleteUserSticker = async (name: string) => {
    const uid = userIdRef.current;
    if (!uid) return;
    const path = `${uid}/${name}`;
    const { error } = await supabase.storage.from("stickers").remove([path]);
    if (error) { toast.error(error.message); return; }
    setUserStickers(s => s.filter(x => x.name !== name));
  };
  const [internalFullscreen, setInternalFullscreen] = useState<boolean>(false);
  const fullscreen = fullscreenProp ?? internalFullscreen;
  const toggleFullscreen = () => {
    if (onToggleFullscreen) onToggleFullscreen();
    else setInternalFullscreen(v => !v);
  };
  const [vh, setVh] = useState<number>(() => (typeof window !== "undefined" ? window.innerHeight : 720));
  useEffect(() => {
    if (!fullscreen) return;
    const onResize = () => setVh(window.innerHeight);
    onResize();
    window.addEventListener("resize", onResize);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("resize", onResize);
      document.body.style.overflow = prev;
    };
  }, [fullscreen]);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(() => {
    if (typeof window === "undefined") return true;
    return window.innerWidth >= 768;
  });
  const [draft, setDraft] = useState<CanvasItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);
  const [zoom, setZoom] = useState<number>(1);
  const [svgW, setSvgW] = useState<number>(800);
  // Infinite world dimensions (in canvas/world units, before zoom).
  const [worldW, setWorldW] = useState<number>(2400);
  const [worldH, setWorldH] = useState<number>(1600);
  useEffect(() => {
    if (!svgRef.current) return;
    const el = svgRef.current;
    const update = () => setSvgW(el.getBoundingClientRect().width || 800);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  // World caps — keep things bounded so a runaway feedback loop can't blow up coords.
  const MAX_WORLD_W = 6000;
  const MAX_WORLD_H = 6000;
  // Grow the world so it extends past the furthest item, but never above the cap.
  useEffect(() => {
    let maxX = 0, maxY = 0;
    for (const it of safe.items) {
      const b = bboxOf(it);
      const ex = b.x + b.w, ey = b.y + b.h;
      if (ex > maxX) maxX = ex;
      if (ey > maxY) maxY = ey;
    }
    const PAD = 400;
    const nextW = Math.min(MAX_WORLD_W, Math.max(worldW, maxX + PAD));
    const nextH = Math.min(MAX_WORLD_H, Math.max(worldH, maxY + PAD));
    if (nextW !== worldW) setWorldW(nextW);
    if (nextH !== worldH) setWorldH(nextH);
  }, [safe.items, worldW, worldH]);
  const zoomIn = () => setZoom(z => Math.min(4, +(z + 0.25).toFixed(2)));
  const zoomOut = () => setZoom(z => Math.max(0.25, +(z - 0.25).toFixed(2)));
  const zoomReset = () => setZoom(1);
  // Scroll back to the top-left so the user can find their work.
  const recenter = () => {
    const el = scrollRef.current;
    if (el) el.scrollTo({ left: 0, top: 0, behavior: "smooth" });
  };

  const items = draft ? [...safe.items, draft] : safe.items;

  const setItems = (updater: (arr: CanvasItem[]) => CanvasItem[]) => {
    onChange({ ...safe, items: updater(safe.items) });
  };

  const setHeight = (h: number) => onChange({ ...safe, height: Math.max(180, Math.min(1200, h)) });

  const pointAt = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    // SVG is sized worldW*zoom x worldH*zoom inside a scroll container,
    // with viewBox 0 0 worldW worldH, so screen→world is a simple divide by zoom.
    return {
      x: (e.clientX - r.left) / zoom,
      y: (e.clientY - r.top) / zoom,
    };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (editingLabel) return;
    e.preventDefault();
    (e.target as Element).setPointerCapture?.(e.pointerId);
    // Lock page scroll while drawing so the page doesn't jump around.
    document.body.style.overflow = "hidden";
    document.documentElement.style.overscrollBehavior = "contain";
    const { x, y } = pointAt(e);

    if (tool === "select") {
      // hit-test top-most
      const hit = [...safe.items].reverse().find(it => hits(it, x, y));
      setSelectedId(hit?.id ?? null);
      if (hit && hit.kind !== "stroke") {
        dragRef.current = { id: hit.id, startX: x, startY: y, origX: hit.x, origY: hit.y };
      }
      return;
    }
    if (tool === "eraser") {
      setItems(arr => arr.filter(it => !hits(it, x, y, 6)));
      return;
    }
    if (tool === "pen") {
      setDraft({ id: rid(), kind: "stroke", color, size, points: [{ x, y }] });
      return;
    }
    if (tool === "label") {
      const item: CanvasLabel = { id: rid(), kind: "label", x, y, w: 140, h: 44, text: "", color: "#0f172a", bg: labelBg };
      setItems(arr => [...arr, item]);
      setSelectedId(item.id);
      setEditingLabel(item.id);
      return;
    }
    if (tool === "text") {
      const item: CanvasLabel = { id: rid(), kind: "label", x, y, w: 160, h: 40, text: "", color, bg: "transparent" };
      setItems(arr => [...arr, item]);
      setSelectedId(item.id);
      setEditingLabel(item.id);
      return;
    }
    if (tool === "sticker") {
      const s = customStickerUrl ? 80 : 48;
      const item: CanvasSticker = customStickerUrl
        ? { id: rid(), kind: "sticker", x: x - s / 2, y: y - s / 2, w: s, h: s, url: customStickerUrl }
        : { id: rid(), kind: "sticker", x: x - s / 2, y: y - s / 2, w: s, h: s, emoji: sticker };
      setItems(arr => [...arr, item]);
      setSelectedId(item.id);
      return;
    }
    // shapes
    setDraft({ id: rid(), kind: "shape", shape: tool as any, color, size, x, y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (editingLabel) return;
    if (draft || dragRef.current || (tool === "eraser" && (e.buttons & 1))) {
      e.preventDefault();
    }
    const { x, y } = pointAt(e);
    if (dragRef.current) {
      const d = dragRef.current;
      const dx = x - d.startX, dy = y - d.startY;
      setItems(arr => arr.map(it => {
        if (it.id !== d.id || it.kind === "stroke") return it;
        return { ...it, x: d.origX + dx, y: d.origY + dy };
      }));
      return;
    }
    if (tool === "eraser" && (e.buttons & 1)) {
      setItems(arr => arr.filter(it => !hits(it, x, y, 6)));
      return;
    }
    if (!draft) return;
    if (draft.kind === "stroke") {
      setDraft({ ...draft, points: [...draft.points, { x, y }] });
    } else {
      setDraft({ ...draft, w: x - draft.x, h: y - draft.y });
    }
  };

  const onPointerUp = () => {
    document.body.style.overflow = "";
    document.documentElement.style.overscrollBehavior = "";
    if (dragRef.current) { dragRef.current = null; return; }
    if (!draft) return;
    if (draft.kind === "stroke" && draft.points.length < 2) { setDraft(null); return; }
    if (draft.kind === "shape" && Math.abs(draft.w) < 4 && Math.abs(draft.h) < 4) { setDraft(null); return; }
    setItems(arr => [...arr, draft]);
    setDraft(null);
  };

  const renderItem = (it: CanvasItem, isDraft = false) => {
    const selected = selectedId === it.id;
    const sw = (it.kind === "stroke" || it.kind === "shape") ? it.size : 0;
    if (it.kind === "stroke") {
      const d = it.points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ");
      return <path key={it.id} d={d} stroke={it.color} strokeWidth={sw} strokeLinecap="round" strokeLinejoin="round" fill="none" />;
    }
    if (it.kind === "shape") {
      const x = Math.min(it.x, it.x + it.w), y = Math.min(it.y, it.y + it.h);
      const w = Math.abs(it.w), h = Math.abs(it.h);
      if (it.shape === "rect") return <rect key={it.id} x={x} y={y} width={w} height={h} fill="none" stroke={it.color} strokeWidth={sw} rx={4} />;
      if (it.shape === "ellipse") return <ellipse key={it.id} cx={x + w / 2} cy={y + h / 2} rx={w / 2} ry={h / 2} fill="none" stroke={it.color} strokeWidth={sw} />;
      if (it.shape === "line") return <line key={it.id} x1={it.x} y1={it.y} x2={it.x + it.w} y2={it.y + it.h} stroke={it.color} strokeWidth={sw} strokeLinecap="round" />;
      if (it.shape === "arrow") {
        const ang = Math.atan2(it.h, it.w);
        const ah = 10 + sw * 1.5;
        const ex = it.x + it.w, ey = it.y + it.h;
        const p1x = ex - ah * Math.cos(ang - Math.PI / 6), p1y = ey - ah * Math.sin(ang - Math.PI / 6);
        const p2x = ex - ah * Math.cos(ang + Math.PI / 6), p2y = ey - ah * Math.sin(ang + Math.PI / 6);
        return (
          <g key={it.id}>
            <line x1={it.x} y1={it.y} x2={ex} y2={ey} stroke={it.color} strokeWidth={sw} strokeLinecap="round" />
            <polygon points={`${ex},${ey} ${p1x},${p1y} ${p2x},${p2y}`} fill={it.color} />
          </g>
        );
      }
    }
    if (it.kind === "sticker") {
      return (
        <g key={it.id}>
          {it.url ? (
            <image
              href={it.url}
              x={it.x} y={it.y} width={it.w} height={it.h}
              preserveAspectRatio="xMidYMid meet"
              style={{ pointerEvents: "none" }}
            />
          ) : (
            <text
              x={it.x + it.w / 2}
              y={it.y + it.h / 2}
              fontSize={Math.min(it.w, it.h) * 0.9}
              textAnchor="middle"
              dominantBaseline="central"
              style={{ userSelect: "none" }}
            >
              {it.emoji}
            </text>
          )}
          {selected && !isDraft && (
            <>
              <rect
                x={it.x} y={it.y} width={it.w} height={it.h}
                fill="none" stroke="#3b82f6" strokeDasharray="3 3" strokeWidth={1}
              />
              <rect
                x={it.x + it.w - 10} y={it.y + it.h - 10} width={14} height={14} rx={3}
                fill="#3b82f6"
                style={{ cursor: "nwse-resize" }}
                onPointerDown={(e) => {
                  e.stopPropagation();
                  (e.target as Element).setPointerCapture?.(e.pointerId);
                  const startX = e.clientX, startY = e.clientY;
                  const ow = it.w, oh = it.h;
                  const move = (ev: PointerEvent) => {
                    const d = Math.max(ev.clientX - startX, ev.clientY - startY);
                    const nw = Math.max(20, ow + d);
                    const nh = Math.max(20, oh + d);
                    setItems(arr => arr.map(x => x.id === it.id ? { ...x, w: nw, h: nh } as CanvasSticker : x));
                  };
                  const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                  window.addEventListener("pointermove", move);
                  window.addEventListener("pointerup", up);
                }}
              />
            </>
          )}
        </g>
      );
    }
    if (it.kind === "label") {
      const transparent = it.bg === "transparent";
      return (
        <g key={it.id}>
          <rect
            x={it.x} y={it.y} width={it.w} height={it.h} rx={8}
            fill={transparent ? "transparent" : it.bg}
            stroke={selected ? "#3b82f6" : (transparent ? "transparent" : "rgba(0,0,0,0.12)")}
            strokeWidth={selected ? 1.5 : 1}
            strokeDasharray={transparent && selected ? "3 3" : undefined}
          />
          <foreignObject x={it.x} y={it.y} width={it.w} height={it.h}>
            {editingLabel === it.id ? (
              <textarea
                autoFocus
                value={it.text}
                onChange={(e) => setItems(arr => arr.map(x => x.id === it.id ? { ...x, text: e.target.value } as CanvasLabel : x))}
                onBlur={() => setEditingLabel(null)}
                onKeyDown={(e) => { if (e.key === "Escape") { e.preventDefault(); setEditingLabel(null); } }}
                className="w-full h-full bg-transparent outline-none p-1.5 text-[13px] resize-none"
                style={{ color: it.color, fontFamily: "inherit" }}
              />
            ) : (
              <div
                onDoubleClick={(e) => { e.stopPropagation(); setEditingLabel(it.id); setSelectedId(it.id); }}
                className="w-full h-full p-1.5 text-[13px] whitespace-pre-wrap break-words cursor-text select-none overflow-hidden"
                style={{ color: it.color }}
              >
                {it.text || (language === "ar" ? "اضغط مرتين للكتابة" : "Double-click to type")}
              </div>
            )}
          </foreignObject>
          {selected && !isDraft && (
            <rect
              x={it.x + it.w - 10} y={it.y + it.h - 10} width={14} height={14} rx={3}
              fill="#3b82f6"
              style={{ cursor: "nwse-resize" }}
              onPointerDown={(e) => {
                e.stopPropagation();
                (e.target as Element).setPointerCapture?.(e.pointerId);
                const startX = e.clientX, startY = e.clientY;
                const ow = it.w, oh = it.h;
                const move = (ev: PointerEvent) => {
                  const nw = Math.max(60, ow + (ev.clientX - startX));
                  const nh = Math.max(28, oh + (ev.clientY - startY));
                  setItems(arr => arr.map(x => x.id === it.id ? { ...x, w: nw, h: nh } as CanvasLabel : x));
                };
                const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
                window.addEventListener("pointermove", move);
                window.addEventListener("pointerup", up);
              }}
            />
          )}
        </g>
      );
    }
    return null;
  };

  const tools: { id: Tool; icon: any; label: string; shortcut: string }[] = [
    { id: "select",  icon: MousePointer2, label: isRTL ? "تحديد" : "Select",   shortcut: "V" },
    { id: "pen",     icon: Pencil,        label: isRTL ? "قلم" : "Pen",        shortcut: "P" },
    { id: "eraser",  icon: Eraser,        label: isRTL ? "ممحاة" : "Eraser",   shortcut: "E" },
    { id: "rect",    icon: Square,        label: isRTL ? "مربع" : "Rect",      shortcut: "R" },
    { id: "ellipse", icon: CircleIcon,    label: isRTL ? "دائرة" : "Ellipse",  shortcut: "O" },
    { id: "line",    icon: LineIcon,      label: isRTL ? "خط" : "Line",        shortcut: "L" },
    { id: "arrow",   icon: MoveUpRight,   label: isRTL ? "سهم" : "Arrow",      shortcut: "A" },
    { id: "label",   icon: Tag,           label: isRTL ? "ملصق" : "Label",     shortcut: "T" },
    { id: "text",    icon: Type,          label: isRTL ? "نص" : "Text",        shortcut: "X" },
    { id: "sticker", icon: Smile,         label: isRTL ? "ملصقات" : "Stickers", shortcut: "S" },
  ];

  // Keyboard shortcuts (ignored while editing labels or other inputs)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (editingLabel) return;
      const t = e.target as HTMLElement | null;
      if (t && (t.isContentEditable || ["INPUT", "TEXTAREA", "SELECT"].includes(t.tagName))) return;
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      const hit = tools.find(x => x.shortcut.toLowerCase() === e.key.toLowerCase());
      if (hit) { e.preventDefault(); setTool(hit.id); }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editingLabel, tools]);

  const cursorFor = tool === "select" ? "default" : tool === "eraser" ? "cell" : tool === "label" ? "text" : "crosshair";

  // Safety: always restore scroll when this block unmounts.
  useEffect(() => {
    return () => {
      document.body.style.overflow = "";
      document.documentElement.style.overscrollBehavior = "";
    };
  }, []);

  const wrapperCls = fullscreen
    ? "fixed inset-0 z-50 bg-background flex max-w-none"
    : "my-3 rounded-xl border border-border bg-card overflow-hidden flex max-w-full";
  const drawAreaHeight = fullscreen ? vh - 8 : safe.height;

  return (
    <div className={wrapperCls} dir={isRTL ? "rtl" : "ltr"}>
      {/* Sidebar */}
      <aside
        className={`shrink-0 border-${isRTL ? "l" : "r"} border-border bg-secondary/40 flex flex-col transition-[width] duration-200 ${
          sidebarOpen ? "w-36 sm:w-44" : "w-11"
        }`}
      >
        <div className="flex items-center justify-between p-2 border-b border-border">
          {sidebarOpen && (
            <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
              {isRTL ? "الأدوات" : "Tools"}
            </span>
          )}
          <button
            onClick={() => setSidebarOpen(v => !v)}
            className="w-8 h-8 rounded-md hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground ml-auto"
            title={sidebarOpen ? (isRTL ? "طي" : "Collapse") : (isRTL ? "فتح" : "Expand")}
          >
            {sidebarOpen ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeft className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-3">
          {/* Tool buttons */}
          <TooltipProvider delayDuration={200}>
            <div className={sidebarOpen ? "grid grid-cols-2 gap-1" : "flex flex-col gap-1"}>
              {tools.map(({ id, icon: Icon, label, shortcut }) => (
                <Tooltip key={id}>
                  <TooltipTrigger asChild>
                    <button
                      onClick={() => { setTool(id); setEditingLabel(null); }}
                      aria-label={`${label} (${shortcut})`}
                      className={`h-9 rounded-md flex items-center ${sidebarOpen ? "justify-between gap-2 px-2" : "justify-center"} transition-colors ${
                        tool === id ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80"
                      }`}
                    >
                      <span className="flex items-center gap-2 min-w-0">
                        <Icon className="w-4 h-4 shrink-0" />
                        {sidebarOpen && <span className="text-xs truncate">{label}</span>}
                      </span>
                      {sidebarOpen && (
                        <kbd className={`text-[10px] font-mono px-1 rounded ${tool === id ? "bg-primary-foreground/20" : "bg-background/70 border border-border text-muted-foreground"}`}>
                          {shortcut}
                        </kbd>
                      )}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side={isRTL ? "left" : "right"} className="flex items-center gap-2">
                    <span>{label}</span>
                    <kbd className="text-[10px] font-mono px-1 rounded bg-background/20 border border-border/40">{shortcut}</kbd>
                  </TooltipContent>
                </Tooltip>
              ))}
            </div>
          </TooltipProvider>

          {/* Colors */}
          <div className="space-y-1.5">
            {sidebarOpen && (
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {isRTL ? "اللون" : "Color"}
              </p>
            )}
            <div className={sidebarOpen ? "grid grid-cols-4 gap-1.5 px-1" : "flex flex-col items-center gap-1.5"}>
              {PALETTE.map(c => (
                <button
                  key={c}
                  onClick={() => setColor(c)}
                  title={c}
                  className={`w-6 h-6 rounded-full border ${color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "border-border"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </div>

          {/* Thickness */}
          {sidebarOpen && (
            <div className="space-y-1.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                {isRTL ? "السمك" : "Thickness"} <span className="text-foreground/60">({size})</span>
              </p>
              <input
                type="range" min={1} max={16} value={size}
                onChange={(e) => setSize(Number(e.target.value))}
                className="w-full accent-primary"
              />
            </div>
          )}

          {/* Label bg */}
          {tool === "label" && (
            <div className="space-y-1.5">
              {sidebarOpen && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {isRTL ? "خلفية الملصق" : "Label bg"}
                </p>
              )}
              <div className={sidebarOpen ? "grid grid-cols-3 gap-1.5 px-1" : "flex flex-col items-center gap-1.5"}>
                {LABEL_BGS.map(c => (
                  <button
                    key={c}
                    onClick={() => setLabelBg(c)}
                    title={c}
                    className={`w-6 h-6 rounded border ${labelBg === c ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "border-border"}`}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Stickers picker */}
          {tool === "sticker" && (
            <div className="space-y-1.5">
              {sidebarOpen && (
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground px-1">
                  {isRTL ? "اختر ملصق" : "Pick sticker"}
                </p>
              )}
              <div className={sidebarOpen ? "grid grid-cols-4 gap-1 px-1" : "flex flex-col items-center gap-1"}>
                {STICKERS.map(em => (
                  <button
                    key={em}
                    onClick={() => { setSticker(em); setCustomStickerUrl(null); }}
                    className={`w-7 h-7 rounded text-base leading-none flex items-center justify-center hover:bg-secondary ${
                      sticker === em && !customStickerUrl ? "ring-2 ring-primary bg-secondary" : ""
                    }`}
                    title={em}
                  >
                    <span style={{ fontSize: 16 }}>{em}</span>
                  </button>
                ))}
              </div>

              {/* Custom uploads */}
              {sidebarOpen && (
                <>
                  <div className="flex items-center justify-between px-1 pt-2">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      {isRTL ? "ملصقاتي" : "My stickers"}
                    </p>
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={uploadingSticker}
                      className="text-[10px] inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-primary text-primary-foreground hover:opacity-90 disabled:opacity-50"
                      title={isRTL ? "رفع" : "Upload"}
                    >
                      {uploadingSticker ? <Loader2 className="w-3 h-3 animate-spin" /> : <Upload className="w-3 h-3" />}
                      {isRTL ? "رفع" : "Upload"}
                    </button>
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) uploadSticker(f);
                    }}
                  />
                  <div className="grid grid-cols-3 gap-1 px-1">
                    {loadingStickers && (
                      <div className="col-span-3 flex justify-center py-2 text-muted-foreground">
                        <Loader2 className="w-3 h-3 animate-spin" />
                      </div>
                    )}
                    {!loadingStickers && userStickers.length === 0 && (
                      <div className="col-span-3 text-[10px] text-muted-foreground text-center py-2 border border-dashed border-border rounded">
                        <ImagePlus className="w-4 h-4 mx-auto mb-0.5 opacity-60" />
                        {isRTL ? "ارفع صورتك الأولى" : "Upload your first"}
                      </div>
                    )}
                    {userStickers.map(s => (
                      <div key={s.name} className="relative group">
                        <button
                          onClick={() => setCustomStickerUrl(s.url)}
                          className={`w-full aspect-square rounded border bg-background overflow-hidden flex items-center justify-center hover:border-primary ${
                            customStickerUrl === s.url ? "ring-2 ring-primary border-primary" : "border-border"
                          }`}
                          title={isRTL ? "اختر ثم اضغط على اللوحة" : "Select then click canvas"}
                        >
                          <img src={s.url} alt="" className="w-full h-full object-contain" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteUserSticker(s.name); if (customStickerUrl === s.url) setCustomStickerUrl(null); }}
                          className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive text-destructive-foreground opacity-0 group-hover:opacity-100 flex items-center justify-center"
                          title={isRTL ? "حذف" : "Delete"}
                        >
                          <XIcon className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </>
              )}

              {sidebarOpen && (
                <p className="text-[10px] text-muted-foreground px-1">
                  {customStickerUrl
                    ? (isRTL ? "اضغط على اللوحة لوضع صورتك" : "Click canvas to place image")
                    : (isRTL ? "اضغط على اللوحة لإضافته" : "Click on canvas to place")}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="p-2 border-t border-border space-y-1">
          {selectedId && (
            <button
              onClick={() => { setItems(arr => arr.filter(i => i.id !== selectedId)); setSelectedId(null); setEditingLabel(null); }}
              className={`w-full h-8 rounded-md text-xs inline-flex items-center ${sidebarOpen ? "justify-start gap-2 px-2" : "justify-center"} hover:bg-destructive/10 text-destructive`}
              title={isRTL ? "حذف العنصر" : "Delete item"}
            >
              <Trash2 className="w-3.5 h-3.5 shrink-0" />
              {sidebarOpen && <span>{isRTL ? "حذف" : "Delete"}</span>}
            </button>
          )}
          <button
            onClick={() => { if (confirm(isRTL ? "مسح اللوحة؟" : "Clear canvas?")) setItems(() => []); }}
            className={`w-full h-8 rounded-md text-xs inline-flex items-center ${sidebarOpen ? "justify-start gap-2 px-2" : "justify-center"} hover:bg-secondary text-muted-foreground`}
            title={isRTL ? "مسح الكل" : "Clear all"}
          >
            <Eraser className="w-3.5 h-3.5 shrink-0" />
            {sidebarOpen && <span>{isRTL ? "مسح الكل" : "Clear all"}</span>}
          </button>
        </div>
      </aside>

      {/* Drawing area (infinite scrollable paper) */}
      <div className="relative flex-1 min-w-0" style={{ height: drawAreaHeight }}>
        <div
          ref={scrollRef}
          className="absolute inset-0 overflow-auto bg-[radial-gradient(circle,_rgba(0,0,0,0.06)_1px,_transparent_1px)] [background-size:18px_18px]"
          style={{ touchAction: "none", overscrollBehavior: "contain" }}
        >
          <svg
          ref={svgRef}
          width={worldW * zoom}
          height={worldH * zoom}
          viewBox={`0 0 ${worldW} ${worldH}`}
          preserveAspectRatio="xMinYMin meet"
          style={{ cursor: cursorFor, touchAction: "none", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {items.map(it => renderItem(it, draft?.id === it.id))}
        </svg>
        </div>
        {/* Zoom controls */}
        <div className={`absolute bottom-1 ${isRTL ? "right-1" : "left-1"} flex items-center gap-1 bg-secondary/80 backdrop-blur rounded-md px-1 py-0.5 shadow-sm z-10`}>
          <button
            onClick={zoomOut}
            className="w-6 h-6 rounded hover:bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
            title={isRTL ? "تصغير" : "Zoom out"}
            aria-label={isRTL ? "تصغير" : "Zoom out"}
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={zoomReset}
            className="text-[10px] font-mono w-9 text-center text-muted-foreground hover:text-foreground"
            title={isRTL ? "إعادة" : "Reset"}
          >
            {Math.round(zoom * 100)}%
          </button>
          <button
            onClick={zoomIn}
            className="w-6 h-6 rounded hover:bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
            title={isRTL ? "تكبير" : "Zoom in"}
            aria-label={isRTL ? "تكبير" : "Zoom in"}
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          {zoom !== 1 && (
            <button
              onClick={zoomReset}
              className="w-6 h-6 rounded hover:bg-background/60 flex items-center justify-center text-muted-foreground hover:text-foreground"
              title={isRTL ? "إعادة" : "Reset"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
        {/* Expand / Fullscreen */}
        {(expandable || onToggleFullscreen || fullscreen) && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-1 right-1 w-8 h-8 rounded-md bg-secondary/80 hover:bg-secondary flex items-center justify-center text-muted-foreground hover:text-foreground shadow-sm"
            title={fullscreen ? (isRTL ? "إغلاق ملء الشاشة" : "Exit fullscreen") : (isRTL ? "ملء الشاشة" : "Fullscreen")}
          >
            {fullscreen ? <Minimize2 className="w-4 h-4" /> : <Expand className="w-4 h-4" />}
          </button>
        )}
        {/* Resize handle (hidden in fullscreen) */}
        {!fullscreen && (
          <button
            onPointerDown={(e) => {
              e.preventDefault();
              (e.target as Element).setPointerCapture?.(e.pointerId);
              const startY = e.clientY;
              const startH = safe.height;
              const move = (ev: PointerEvent) => setHeight(startH + (ev.clientY - startY));
              const up = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", up); };
              window.addEventListener("pointermove", move);
              window.addEventListener("pointerup", up);
            }}
            className="absolute bottom-1 right-1 w-6 h-6 rounded bg-secondary/70 hover:bg-secondary flex items-center justify-center text-muted-foreground"
            title={isRTL ? "تغيير الارتفاع" : "Resize"}
          >
            <Maximize2 className="w-3 h-3" />
          </button>
        )}
      </div>
    </div>
  );
};

export default NotesCanvasBlock;