import { useCallback, useEffect, useRef, useState } from "react";
import {
  ReactFlow,
  ReactFlowProvider,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  useReactFlow,
  Handle,
  Position,
  type Node,
  type Edge,
  type NodeProps,
} from "@xyflow/react";
import "@xyflow/react/dist/style.css";
import { flextree } from "d3-flextree";
import { ArrowLeft, Loader2, Sparkles, Upload, ZoomIn, ZoomOut, Maximize2, Wand2, X } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromFile } from "@/lib/fileText";
import { toast } from "sonner";

type MindNode = {
  id: string;
  type: string;
  label: string;
  parentId?: string | null;
};

const NODE_W = 200;
const NODE_H = 64;

function MindmapNode({ data }: NodeProps) {
  const isRoot = (data as { isRoot?: boolean }).isRoot;
  const label = (data as { label: string }).label;
  return (
    <div
      className={
        isRoot
          ? "px-5 py-3 rounded-xl border-2 border-primary bg-primary/10 backdrop-blur shadow-md text-foreground text-sm font-bold tracking-tight text-center max-w-[200px]"
          : "px-4 py-2.5 rounded-xl border border-border bg-background shadow-sm text-foreground text-xs font-medium text-center max-w-[200px]"
      }
    >
      <Handle type="target" position={Position.Left} style={{ opacity: 0 }} />
      <span className="leading-snug break-words">{label}</span>
      <Handle type="source" position={Position.Right} style={{ opacity: 0 }} />
    </div>
  );
}

const nodeTypes = { mindmapNode: MindmapNode };

function layoutTree(raw: MindNode[]): { nodes: Node[]; edges: Edge[] } {
  if (!raw.length) return { nodes: [], edges: [] };
  type TreeNode = MindNode & { children: TreeNode[] };
  const byId = new Map<string, TreeNode>();
  raw.forEach((n) => byId.set(n.id, { ...n, children: [] }));
  let root: TreeNode | undefined;
  byId.forEach((n) => {
    if (n.parentId && byId.has(n.parentId)) {
      byId.get(n.parentId)!.children.push(n as TreeNode);
    } else if (!root) {
      root = n;
    }
  });
  if (!root) root = byId.values().next().value as typeof root;

  const layout = flextree({
    nodeSize: (n: { data: { label: string } }) => {
      const lines = Math.max(1, Math.ceil(n.data.label.length / 22));
      return [NODE_H + (lines - 1) * 16 + 24, NODE_W + 60];
    },
    spacing: 24,
  });
  const hierarchy = layout.hierarchy(root!);
  layout(hierarchy);

  const nodes: Node[] = [];
  const edges: Edge[] = [];
  hierarchy.each((d: any) => {
    const isRoot = d.depth === 0;
    nodes.push({
      id: d.data.id,
      type: "mindmapNode",
      position: { x: d.y, y: d.x },
      data: { label: d.data.label, isRoot },
    });
    if (d.parent) {
      edges.push({
        id: `${d.parent.data.id}->${d.data.id}`,
        source: d.parent.data.id,
        target: d.data.id,
        type: "smoothstep",
        animated: false,
        style: { stroke: "hsl(var(--primary) / 0.5)", strokeWidth: 1.5 },
      });
    }
  });
  return { nodes, edges };
}

const copy = {
  en: {
    title: "AI Mind Map",
    subtitle: "Type a topic, optionally upload a file, and Gemini will build a clean mind map.",
    topic: "Topic or question",
    placeholder: "e.g. The cell cycle and mitosis",
    upload: "Upload file (optional)",
    file: "Choose file (PDF, DOCX, TXT)",
    generate: "Generate Mind Map",
    generating: "Generating…",
    empty: "Your mind map will appear here",
    back: "Back",
    remove: "Remove",
  },
  ar: {
    title: "خريطة ذهنية بالذكاء",
    subtitle: "اكتب موضوعاً وارفع ملفاً اختيارياً، وسيبني جيميناي خريطة ذهنية أنيقة.",
    topic: "الموضوع أو السؤال",
    placeholder: "مثال: الانقسام الخلوي",
    upload: "ارفع ملف (اختياري)",
    file: "اختر ملف (PDF، DOCX، TXT)",
    generate: "أنشئ الخريطة",
    generating: "جارٍ الإنشاء…",
    empty: "ستظهر خريطتك هنا",
    back: "رجوع",
    remove: "إزالة",
  },
} as const;

function Canvas({
  nodes,
  edges,
  onNodesChange,
  onEdgesChange,
  flash,
}: {
  nodes: Node[];
  edges: Edge[];
  onNodesChange: any;
  onEdgesChange: any;
  flash: number;
}) {
  const { zoomIn, zoomOut, fitView } = useReactFlow();
  useEffect(() => {
    if (nodes.length) {
      const t = setTimeout(() => fitView({ padding: 0.2, duration: 600 }), 50);
      return () => clearTimeout(t);
    }
  }, [flash, nodes.length, fitView]);

  return (
    <div className="relative w-full h-full">
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        nodeTypes={nodeTypes}
        fitView
        minZoom={0.2}
        maxZoom={2}
        proOptions={{ hideAttribution: true }}
      >
        <Background gap={24} size={1} color="hsl(var(--muted-foreground) / 0.15)" />
        <MiniMap pannable zoomable className="!bg-secondary/60 !border !border-border rounded-lg" maskColor="hsl(var(--background) / 0.6)" />
      </ReactFlow>
      <div className="absolute bottom-4 right-4 flex flex-col gap-2 z-10">
        <button onClick={() => zoomIn({ duration: 200 })} className="w-10 h-10 rounded-xl border border-border bg-background/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-accent transition" aria-label="Zoom in">
          <ZoomIn className="w-4 h-4" />
        </button>
        <button onClick={() => zoomOut({ duration: 200 })} className="w-10 h-10 rounded-xl border border-border bg-background/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-accent transition" aria-label="Zoom out">
          <ZoomOut className="w-4 h-4" />
        </button>
        <button onClick={() => fitView({ padding: 0.2, duration: 500 })} className="w-10 h-10 rounded-xl border border-border bg-background/90 backdrop-blur shadow-sm flex items-center justify-center hover:bg-accent transition" aria-label="Fit view">
          <Maximize2 className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

const MindMap = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [nodes, setNodes, onNodesChange] = useNodesState<Node>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);
  const [flash, setFlash] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const generate = useCallback(async () => {
    if (!topic.trim()) {
      toast.error(language === "ar" ? "اكتب موضوعاً" : "Enter a topic");
      return;
    }
    setLoading(true);
    try {
      let context = "";
      if (file) {
        try {
          context = await extractTextFromFile(file);
        } catch {
          toast.error(language === "ar" ? "تعذّر قراءة الملف" : "Could not read file");
        }
      }
      const { data, error } = await supabase.functions.invoke("generate-mindmap", {
        body: { topic: topic.trim(), context },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      const raw = ((data as any)?.nodes ?? []) as MindNode[];
      if (!raw.length) throw new Error("Empty mind map");
      const { nodes: ln, edges: le } = layoutTree(raw);
      setNodes(ln);
      setEdges(le);
      setFlash((f) => f + 1);
    } catch (e: any) {
      toast.error(e?.message || "Failed to generate");
    } finally {
      setLoading(false);
    }
  }, [topic, file, language, setNodes, setEdges]);

  return (
    <main className="min-h-screen flex flex-col" dir={language === "ar" ? "rtl" : "ltr"}>
      <header className="px-4 py-4 border-b border-border bg-background/80 backdrop-blur sticky top-0 z-20">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <button onClick={onBack} className="w-10 h-10 rounded-full border border-border bg-secondary/60 flex items-center justify-center hover:bg-accent transition" aria-label={t.back}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-[0.25em] text-muted-foreground">
              <Sparkles className="w-3 h-3 text-primary" /> {t.title}
            </div>
            <p className="text-sm text-muted-foreground truncate">{t.subtitle}</p>
          </div>
        </div>
        <div className="max-w-6xl mx-auto mt-3 flex flex-col md:flex-row gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !loading) generate(); }}
            placeholder={t.placeholder}
            className="flex-1 h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <input ref={inputRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          <button
            onClick={() => inputRef.current?.click()}
            className="h-11 px-4 rounded-xl border border-border bg-background text-sm hover:bg-accent transition inline-flex items-center gap-2"
          >
            <Upload className="w-4 h-4" />
            <span className="max-w-[160px] truncate">{file ? file.name : t.file}</span>
            {file && (
              <X
                className="w-3.5 h-3.5 opacity-60 hover:opacity-100"
                onClick={(e) => { e.stopPropagation(); setFile(null); if (inputRef.current) inputRef.current.value = ""; }}
              />
            )}
          </button>
          <button
            onClick={generate}
            disabled={loading}
            className="h-11 px-5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition inline-flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Wand2 className="w-4 h-4" />}
            {loading ? t.generating : t.generate}
          </button>
        </div>
      </header>

      <div className="relative bg-secondary/20 w-full h-[calc(100vh-180px)]">
        {nodes.length === 0 && !loading && (
          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm pointer-events-none">
            {t.empty}
          </div>
        )}
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-background/40 backdrop-blur-sm">
            <div className="flex items-center gap-3 px-5 py-3 rounded-xl border border-border bg-background shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
              <span className="text-sm">{t.generating}</span>
            </div>
          </div>
        )}
        <ReactFlowProvider>
          <Canvas nodes={nodes} edges={edges} onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} flash={flash} />
        </ReactFlowProvider>
      </div>
    </main>
  );
};

export default MindMap;