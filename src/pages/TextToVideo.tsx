import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Sparkles, Play, Download, Loader2, Video, Captions, CaptionsOff } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

type VisualType = "stat" | "percent" | "compare" | "process" | "list" | "quote";
type Visual = {
  type: VisualType;
  stat?: { value?: string; unit?: string; label?: string };
  percent?: { value?: number; label?: string };
  compare?: { left?: { label?: string; value?: string; icon?: string }; right?: { label?: string; value?: string; icon?: string } };
  process?: { label?: string; icon?: string }[];
  list?: { label?: string; icon?: string }[];
  quote?: { text?: string; author?: string };
};
type ColorName = "amber" | "sky" | "emerald" | "rose" | "violet" | "indigo";
type Scene = {
  keyword: string;
  narration: string;
  bullets: string[];
  icon?: string;
  color?: ColorName;
  visual?: Visual;
  audioBase64: string;
  mime: string;
};
type Script = { title: string; scenes: Scene[] };

const COLORS: Record<ColorName, { bg: string; bg2: string; accent: string; soft: string; ink: string }> = {
  amber:   { bg: "#fffbeb", bg2: "#fef3c7", accent: "#f59e0b", soft: "rgba(245,158,11,0.15)", ink: "#78350f" },
  sky:     { bg: "#f0f9ff", bg2: "#e0f2fe", accent: "#0ea5e9", soft: "rgba(14,165,233,0.15)", ink: "#0c4a6e" },
  emerald: { bg: "#ecfdf5", bg2: "#d1fae5", accent: "#10b981", soft: "rgba(16,185,129,0.15)", ink: "#064e3b" },
  rose:    { bg: "#fff1f2", bg2: "#ffe4e6", accent: "#f43f5e", soft: "rgba(244,63,94,0.15)",  ink: "#881337" },
  violet:  { bg: "#f5f3ff", bg2: "#ede9fe", accent: "#8b5cf6", soft: "rgba(139,92,246,0.15)", ink: "#4c1d95" },
  indigo:  { bg: "#eef2ff", bg2: "#e0e7ff", accent: "#6366f1", soft: "rgba(99,102,241,0.15)", ink: "#312e81" },
};

const PREFILL_KEY = "text_to_video_prefill_v1";

const TextToVideo = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";
  const [text, setText] = useState("");
  const [length, setLength] = useState<"short" | "medium" | "long">("medium");
  const [loading, setLoading] = useState(false);
  const [script, setScript] = useState<Script | null>(null);
  const [playing, setPlaying] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordedUrl, setRecordedUrl] = useState<string | null>(null);
  const [showCaptions, setShowCaptions] = useState(true);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const stopFlagRef = useRef(false);
  const captionsRef = useRef(true);
  useEffect(() => { captionsRef.current = showCaptions; }, [showCaptions]);

  useEffect(() => {
    try {
      const pre = localStorage.getItem(PREFILL_KEY);
      if (pre) { setText(pre); localStorage.removeItem(PREFILL_KEY); }
    } catch { /* ignore */ }
  }, []);

  const generate = async () => {
    if (text.trim().length < 10) {
      toast.error(isAr ? "اكتب نصاً أطول قليلاً" : "Write a bit more text");
      return;
    }
    setLoading(true);
    setScript(null);
    setRecordedUrl(null);
    try {
      const { data, error } = await supabase.functions.invoke("text-to-video", {
        // Don't force the UI language — let the function detect from the text itself.
        body: { text, length },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setScript(data as Script);
      toast.success(isAr ? "تم إنشاء الفيديو" : "Video ready");
    } catch (e: any) {
      toast.error(e?.message || (isAr ? "تعذّر الإنشاء" : "Failed"));
    } finally {
      setLoading(false);
    }
  };

  // --- whiteboard rendering ---
  const drawScene = (scene: Scene, sceneIndex: number, total: number, progress: number) => {
    const cvs = canvasRef.current;
    if (!cvs) return;
    const ctx = cvs.getContext("2d");
    if (!ctx) return;
    const W = cvs.width, H = cvs.height;
    // background: paper
    ctx.fillStyle = "#fffdf6";
    ctx.fillRect(0, 0, W, H);
    // subtle grid
    ctx.strokeStyle = "rgba(0,0,0,0.04)";
    ctx.lineWidth = 1;
    for (let x = 0; x < W; x += 40) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 0; y < H; y += 40) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }
    // header
    ctx.fillStyle = "#0f172a";
    ctx.font = `bold ${Math.round(H * 0.07)}px Cairo, system-ui, sans-serif`;
    ctx.textAlign = isAr ? "right" : "left";
    ctx.direction = isAr ? "rtl" : "ltr" as any;
    const titleX = isAr ? W - 60 : 60;
    const keyword = scene.keyword || "";
    // reveal characters
    const revealKw = Math.floor(progress * keyword.length * 1.2);
    ctx.fillText(keyword.slice(0, Math.min(keyword.length, revealKw)), titleX, 100);
    // underline
    ctx.strokeStyle = "#f59e0b";
    ctx.lineWidth = 4;
    const underlineLen = Math.min(1, Math.max(0, (progress - 0.15) * 1.3)) * Math.min(W * 0.55, keyword.length * 28);
    if (underlineLen > 0) {
      ctx.beginPath();
      const ux = isAr ? W - 60 - underlineLen : 60;
      ctx.moveTo(ux, 120); ctx.lineTo(ux + underlineLen, 120); ctx.stroke();
    }
    // bullets
    ctx.fillStyle = "#1f2937";
    ctx.font = `${Math.round(H * 0.045)}px Cairo, system-ui, sans-serif`;
    const bullets = scene.bullets || [];
    const startY = 200;
    bullets.forEach((b, i) => {
      const t = (progress - 0.15 - i * 0.18);
      if (t <= 0) return;
      const reveal = Math.min(1, t * 1.5);
      const visible = b.slice(0, Math.ceil(b.length * reveal));
      const y = startY + i * Math.round(H * 0.09);
      // bullet dot
      ctx.fillStyle = "#f59e0b";
      ctx.beginPath();
      const dx = isAr ? W - 70 : 70;
      ctx.arc(dx, y - 12, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = "#1f2937";
      const tx = isAr ? W - 90 : 90;
      ctx.fillText(visible, tx, y);
    });
    // footer scene progress
    ctx.fillStyle = "#94a3b8";
    ctx.font = `${Math.round(H * 0.03)}px Cairo, system-ui, sans-serif`;
    ctx.textAlign = "center";
    ctx.fillText(`${sceneIndex + 1} / ${total}`, W / 2, H - 30);
    // progress bar
    ctx.fillStyle = "rgba(245,158,11,0.2)";
    ctx.fillRect(60, H - 70, W - 120, 6);
    ctx.fillStyle = "#f59e0b";
    const overallProgress = (sceneIndex + progress) / total;
    ctx.fillRect(60, H - 70, (W - 120) * overallProgress, 6);

    // captions: render narration text at bottom, auto direction by content
    if (captionsRef.current && scene.narration) {
      const isArabicText = /[\u0600-\u06FF]/.test(scene.narration);
      const fontSize = Math.round(H * 0.038);
      ctx.font = `600 ${fontSize}px Cairo, system-ui, sans-serif`;
      ctx.direction = (isArabicText ? "rtl" : "ltr") as CanvasDirection;
      ctx.textAlign = "center";
      // word-wrap
      const maxWidth = W - 160;
      const words = scene.narration.split(/\s+/);
      const lines: string[] = [];
      let cur = "";
      for (const w of words) {
        const test = cur ? cur + " " + w : w;
        if (ctx.measureText(test).width > maxWidth && cur) {
          lines.push(cur);
          cur = w;
        } else cur = test;
      }
      if (cur) lines.push(cur);
      const lineH = fontSize * 1.35;
      const padY = 14, padX = 24;
      const boxH = lines.length * lineH + padY * 2;
      const boxW = Math.min(W - 80, Math.max(...lines.map(l => ctx.measureText(l).width)) + padX * 2);
      const boxX = (W - boxW) / 2;
      const boxY = H - 100 - boxH;
      ctx.fillStyle = "rgba(15,23,42,0.78)";
      const r = 14;
      ctx.beginPath();
      ctx.moveTo(boxX + r, boxY);
      ctx.arcTo(boxX + boxW, boxY, boxX + boxW, boxY + boxH, r);
      ctx.arcTo(boxX + boxW, boxY + boxH, boxX, boxY + boxH, r);
      ctx.arcTo(boxX, boxY + boxH, boxX, boxY, r);
      ctx.arcTo(boxX, boxY, boxX + boxW, boxY, r);
      ctx.closePath();
      ctx.fill();
      ctx.fillStyle = "#ffffff";
      lines.forEach((ln, i) => {
        ctx.fillText(ln, W / 2, boxY + padY + (i + 0.85) * lineH);
      });
      // reset
      ctx.direction = "ltr" as CanvasDirection;
      ctx.textAlign = "left";
    }
  };

  const playScript = async (record: boolean) => {
    if (!script) return;
    const cvs = canvasRef.current;
    if (!cvs) return;
    stopFlagRef.current = false;
    setPlaying(true);
    setRecordedUrl(null);

    // setup audio context for capture
    let recorder: MediaRecorder | null = null;
    const chunks: BlobPart[] = [];
    const audioCtx = record ? new AudioContext() : null;
    const dest = audioCtx ? audioCtx.createMediaStreamDestination() : null;
    if (record) {
      const canvasStream = cvs.captureStream(30);
      const tracks = [...canvasStream.getVideoTracks(), ...(dest ? dest.stream.getAudioTracks() : [])];
      const combined = new MediaStream(tracks);
      const mime = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
        ? "video/webm;codecs=vp9,opus"
        : "video/webm";
      recorder = new MediaRecorder(combined, { mimeType: mime, videoBitsPerSecond: 2_500_000 });
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunks.push(e.data); };
      recorder.start(250);
      setRecording(true);
    }

    try {
      for (let i = 0; i < script.scenes.length; i++) {
        if (stopFlagRef.current) break;
        const sc = script.scenes[i];
        const audio = new Audio();
        audioElRef.current = audio;
        audio.src = `data:${sc.mime};base64,${sc.audioBase64}`;
        audio.crossOrigin = "anonymous";
        if (audioCtx && dest) {
          const srcNode = audioCtx.createMediaElementSource(audio);
          srcNode.connect(dest);
          srcNode.connect(audioCtx.destination);
        }
        await new Promise<void>((resolve) => {
          const onMeta = () => {
            const dur = Math.max(2, isFinite(audio.duration) ? audio.duration : 4);
            const start = performance.now();
            audio.play().catch(() => { /* ignore */ });
            const tick = () => {
              if (stopFlagRef.current) { audio.pause(); resolve(); return; }
              const elapsed = (performance.now() - start) / 1000;
              const p = Math.min(1, elapsed / dur);
              drawScene(sc, i, script.scenes.length, p);
              if (p < 1) requestAnimationFrame(tick);
            };
            requestAnimationFrame(tick);
            audio.onended = () => resolve();
          };
          audio.onloadedmetadata = onMeta;
          audio.onerror = () => {
            // fall back: timed scene
            const dur = 5;
            const start = performance.now();
            const tick = () => {
              if (stopFlagRef.current) { resolve(); return; }
              const elapsed = (performance.now() - start) / 1000;
              const p = Math.min(1, elapsed / dur);
              drawScene(sc, i, script.scenes.length, p);
              if (p < 1) requestAnimationFrame(tick);
              else resolve();
            };
            requestAnimationFrame(tick);
          };
        });
        // small pause between scenes
        await new Promise((r) => setTimeout(r, 300));
      }
    } finally {
      setPlaying(false);
      if (recorder && recorder.state !== "inactive") {
        await new Promise<void>((resolve) => {
          recorder!.onstop = () => resolve();
          recorder!.stop();
        });
        const blob = new Blob(chunks, { type: "video/webm" });
        setRecordedUrl(URL.createObjectURL(blob));
      }
      setRecording(false);
      if (audioCtx) audioCtx.close().catch(() => {});
    }
  };

  const stop = () => { stopFlagRef.current = true; audioElRef.current?.pause(); };

  return (
    <main className="min-h-screen bg-background text-foreground" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto p-4 md:p-6 space-y-5">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-full border border-border hover:bg-secondary text-sm">
            <ArrowLeft className="w-4 h-4" />
            <span>{isAr ? "رجوع" : "Back"}</span>
          </button>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
            <Video className="w-6 h-6 text-primary" />
            {isAr ? "نص إلى فيديو شرح" : "Text → Explainer Video"}
          </h1>
        </div>

        {!script && (
          <div className="rounded-2xl border border-border bg-card p-4 md:p-6 space-y-4">
            <p className="text-sm text-muted-foreground">
              {isAr
                ? "الصق أي نص (درس، مقالة، فقرة) وسنحوّله إلى فيديو شرح بأسلوب السبورة مع صوت عربي."
                : "Paste any text and we'll turn it into a whiteboard explainer video with narration."}
            </p>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder={isAr ? "الصق النص هنا..." : "Paste your text here..."}
              className="w-full rounded-xl border border-border bg-background p-3 text-sm outline-none focus:border-primary/40 resize-y min-h-[180px]"
            />
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1.5 rounded-full bg-secondary p-1">
                {(["short", "medium", "long"] as const).map((l) => (
                  <button
                    key={l}
                    onClick={() => setLength(l)}
                    className={`px-3 h-8 text-xs rounded-full ${length === l ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}
                  >
                    {isAr
                      ? l === "short" ? "قصير" : l === "medium" ? "متوسط" : "طويل"
                      : l[0].toUpperCase() + l.slice(1)}
                  </button>
                ))}
              </div>
              <button
                onClick={generate}
                disabled={loading}
                className="ml-auto inline-flex items-center gap-2 h-10 px-5 rounded-full bg-primary text-primary-foreground font-semibold text-sm hover:opacity-90 disabled:opacity-60"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                <span>{loading ? (isAr ? "جارٍ الإنشاء..." : "Generating...") : (isAr ? "أنشئ الفيديو" : "Generate")}</span>
              </button>
            </div>
          </div>
        )}

        {script && (
          <div className="rounded-2xl border border-border bg-card p-3 md:p-4 space-y-3">
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <h2 className="text-lg font-semibold">{script.title}</h2>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => { setScript(null); setRecordedUrl(null); }}
                  className="h-9 px-3 rounded-full border border-border text-xs hover:bg-secondary"
                >
                  {isAr ? "نص جديد" : "New text"}
                </button>
                <button
                  onClick={() => setShowCaptions((v) => !v)}
                  title={isAr ? "ترجمة/تسميات توضيحية" : "Captions"}
                  className={`h-9 px-3 rounded-full border text-xs inline-flex items-center gap-1 ${showCaptions ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}
                >
                  {showCaptions ? <Captions className="w-3.5 h-3.5" /> : <CaptionsOff className="w-3.5 h-3.5" />}
                  <span>{isAr ? (showCaptions ? "ترجمة: تشغيل" : "ترجمة: إيقاف") : (showCaptions ? "Captions: On" : "Captions: Off")}</span>
                </button>
                {playing ? (
                  <button onClick={stop} className="h-9 px-4 rounded-full bg-destructive text-destructive-foreground text-xs font-semibold">
                    {isAr ? "إيقاف" : "Stop"}
                  </button>
                ) : (
                  <>
                    <button onClick={() => playScript(false)} className="h-9 px-4 rounded-full bg-secondary text-xs font-semibold inline-flex items-center gap-1">
                      <Play className="w-3.5 h-3.5" /> {isAr ? "تشغيل" : "Play"}
                    </button>
                    <button onClick={() => playScript(true)} className="h-9 px-4 rounded-full bg-primary text-primary-foreground text-xs font-semibold inline-flex items-center gap-1">
                      <Download className="w-3.5 h-3.5" /> {isAr ? "تسجيل وتنزيل" : "Record & Download"}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="rounded-xl overflow-hidden border border-border bg-[#fffdf6]">
              <canvas ref={canvasRef} width={1280} height={720} className="w-full h-auto block" />
            </div>
            {recording && (
              <p className="text-xs text-muted-foreground animate-pulse">{isAr ? "...جارٍ التسجيل" : "Recording..."}</p>
            )}
            {recordedUrl && (
              <a
                href={recordedUrl}
                download="explainer.webm"
                className="inline-flex items-center gap-2 h-10 px-4 rounded-full bg-primary text-primary-foreground text-sm font-semibold"
              >
                <Download className="w-4 h-4" />
                {isAr ? "تنزيل الفيديو" : "Download video"}
              </a>
            )}
            <div className="grid md:grid-cols-2 gap-2">
              {script.scenes.map((s, i) => (
                <div key={i} className="rounded-lg border border-border p-3 bg-background/60">
                  <p className="text-xs font-bold text-primary mb-1">#{i + 1} — {s.keyword}</p>
                  <p className="text-xs text-muted-foreground">{s.narration}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

export default TextToVideo;
export { PREFILL_KEY as TEXT_TO_VIDEO_PREFILL_KEY };