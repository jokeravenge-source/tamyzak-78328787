import { useEffect, useMemo, useRef, useState } from "react";
import {
  Pencil, Eraser, Square, Circle as CircleIcon, Minus as LineIcon,
  MoveUpRight, Tag, MousePointer2, Trash2, Maximize2,
  PanelLeftClose, PanelLeft,
} from "lucide-react";

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
export type CanvasItem = CanvasStroke | CanvasShape | CanvasLabel;
export type CanvasData = { items: CanvasItem[]; height: number };

type Tool = "select" | "pen" | "eraser" | "rect" | "ellipse" | "line" | "arrow" | "label";

const PALETTE = ["#0f172a", "#ef4444", "#f59e0b", "#10b981", "#3b82f6", "#8b5cf6", "#ec4899", "#ffffff"];
const LABEL_BGS = ["#fef3c7", "#dbeafe", "#dcfce7", "#fce7f3", "#e0e7ff", "#f1f5f9"];
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
  data, onChange, language,
}: {
  data: CanvasData | undefined;
  onChange: (next: CanvasData) => void;
  language: "en" | "ar";
}) => {
  const isRTL = language === "ar";
  const safe: CanvasData = useMemo(
    () => (data && Array.isArray(data.items) ? { items: data.items, height: data.height || 360 } : { items: [], height: 360 }),
    [data],
  );
  const svgRef = useRef<SVGSVGElement>(null);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [size, setSize] = useState<number>(3);
  const [labelBg, setLabelBg] = useState<string>(LABEL_BGS[0]);
  const [draft, setDraft] = useState<CanvasItem | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editingLabel, setEditingLabel] = useState<string | null>(null);
  const dragRef = useRef<{ id: string; startX: number; startY: number; origX: number; origY: number } | null>(null);

  const items = draft ? [...safe.items, draft] : safe.items;

  const setItems = (updater: (arr: CanvasItem[]) => CanvasItem[]) => {
    onChange({ ...safe, items: updater(safe.items) });
  };

  const setHeight = (h: number) => onChange({ ...safe, height: Math.max(180, Math.min(1200, h)) });

  const pointAt = (e: React.PointerEvent) => {
    const r = svgRef.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  };

  const onPointerDown = (e: React.PointerEvent) => {
    if (editingLabel) return;
    (e.target as Element).setPointerCapture?.(e.pointerId);
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
    // shapes
    setDraft({ id: rid(), kind: "shape", shape: tool as any, color, size, x, y, w: 0, h: 0 });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (editingLabel) return;
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
    if (dragRef.current) { dragRef.current = null; return; }
    if (!draft) return;
    if (draft.kind === "stroke" && draft.points.length < 2) { setDraft(null); return; }
    if (draft.kind === "shape" && Math.abs(draft.w) < 4 && Math.abs(draft.h) < 4) { setDraft(null); return; }
    setItems(arr => [...arr, draft]);
    setDraft(null);
  };

  const renderItem = (it: CanvasItem, isDraft = false) => {
    const selected = selectedId === it.id;
    const sw = it.kind === "label" ? 0 : it.size;
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
    if (it.kind === "label") {
      return (
        <g key={it.id}>
          <rect
            x={it.x} y={it.y} width={it.w} height={it.h} rx={8}
            fill={it.bg}
            stroke={selected ? "#3b82f6" : "rgba(0,0,0,0.12)"}
            strokeWidth={selected ? 1.5 : 1}
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

  const tools: { id: Tool; icon: any; label: string }[] = [
    { id: "select", icon: MousePointer2, label: isRTL ? "تحديد" : "Select" },
    { id: "pen", icon: Pencil, label: isRTL ? "قلم" : "Pen" },
    { id: "eraser", icon: Eraser, label: isRTL ? "ممحاة" : "Eraser" },
    { id: "rect", icon: Square, label: isRTL ? "مربع" : "Rect" },
    { id: "ellipse", icon: CircleIcon, label: isRTL ? "دائرة" : "Ellipse" },
    { id: "line", icon: LineIcon, label: isRTL ? "خط" : "Line" },
    { id: "arrow", icon: MoveUpRight, label: isRTL ? "سهم" : "Arrow" },
    { id: "label", icon: Tag, label: isRTL ? "ملصق" : "Label" },
  ];

  const cursorFor = tool === "select" ? "default" : tool === "eraser" ? "cell" : tool === "label" ? "text" : "crosshair";

  return (
    <div className="my-3 rounded-xl border border-border bg-card overflow-hidden">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 p-2 border-b border-border bg-secondary/40">
        {tools.map(({ id, icon: Icon, label }) => (
          <button
            key={id}
            onClick={() => { setTool(id); setEditingLabel(null); }}
            title={label}
            className={`w-8 h-8 rounded-md flex items-center justify-center transition-colors ${
              tool === id ? "bg-primary text-primary-foreground" : "hover:bg-secondary text-foreground/80"
            }`}
          >
            <Icon className="w-4 h-4" />
          </button>
        ))}
        <span className="w-px h-6 bg-border mx-1" />
        {/* Color palette */}
        <div className="flex items-center gap-1">
          {PALETTE.map(c => (
            <button
              key={c}
              onClick={() => setColor(c)}
              title={c}
              className={`w-5 h-5 rounded-full border ${color === c ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "border-border"}`}
              style={{ background: c }}
            />
          ))}
        </div>
        <span className="w-px h-6 bg-border mx-1" />
        {/* Size */}
        <input
          type="range" min={1} max={16} value={size}
          onChange={(e) => setSize(Number(e.target.value))}
          className="w-20 accent-primary"
          title={isRTL ? "السمك" : "Thickness"}
        />
        {tool === "label" && (
          <>
            <span className="w-px h-6 bg-border mx-1" />
            <div className="flex items-center gap-1">
              {LABEL_BGS.map(c => (
                <button
                  key={c}
                  onClick={() => setLabelBg(c)}
                  title={c}
                  className={`w-5 h-5 rounded border ${labelBg === c ? "ring-2 ring-primary ring-offset-1 ring-offset-card" : "border-border"}`}
                  style={{ background: c }}
                />
              ))}
            </div>
          </>
        )}
        <div className="ml-auto flex items-center gap-1">
          {selectedId && (
            <button
              onClick={() => { setItems(arr => arr.filter(i => i.id !== selectedId)); setSelectedId(null); setEditingLabel(null); }}
              className="px-2 h-8 rounded-md text-xs inline-flex items-center gap-1 hover:bg-destructive/10 text-destructive"
              title={isRTL ? "حذف العنصر" : "Delete item"}
            >
              <Trash2 className="w-3.5 h-3.5" /> {isRTL ? "حذف" : "Delete"}
            </button>
          )}
          <button
            onClick={() => { if (confirm(isRTL ? "مسح اللوحة؟" : "Clear canvas?")) setItems(() => []); }}
            className="px-2 h-8 rounded-md text-xs hover:bg-secondary text-muted-foreground"
          >
            {isRTL ? "مسح الكل" : "Clear"}
          </button>
        </div>
      </div>

      {/* Drawing area */}
      <div className="relative bg-[radial-gradient(circle,_rgba(0,0,0,0.06)_1px,_transparent_1px)] [background-size:18px_18px]">
        <svg
          ref={svgRef}
          width="100%"
          height={safe.height}
          style={{ cursor: cursorFor, touchAction: "none", display: "block" }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerLeave={onPointerUp}
        >
          {items.map(it => renderItem(it, draft?.id === it.id))}
        </svg>
        {/* Resize handle */}
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
      </div>
    </div>
  );
};

export default NotesCanvasBlock;