import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import {
  Youtube, Plus, Loader2, Sparkles, CheckCircle2, Trash2, X,
  BookOpen, Download, ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

type NotePart = { title: string; notes: string };
type LectureVideo = {
  id: string;
  teacher_id: string;
  topic_key: string;
  youtube_url: string;
  video_id: string | null;
  title: string | null;
  transcript: string | null;
  notes_parts: NotePart[];
  approved: boolean;
  created_at: string;
};

type PrettyBlock = {
  type: "h1" | "h2" | "h3" | "text" | "bullet" | "numbered" | "todo" | "quote" | "divider";
  text: string;
};
type PrettyImage = { prompt: string; dataUrl: string };

const L = {
  en: {
    videos: "Video Lectures",
    addVideo: "Add YouTube lecture",
    ytUrl: "YouTube URL",
    optionalTitle: "Title (optional)",
    generate: "Generate notes",
    generating: "Generating notes…",
    preview: "Preview & approve",
    approve: "Approve & publish",
    saving: "Saving…",
    discard: "Discard",
    noVideos: "No lectures yet.",
    watch: "Watch",
    openNotes: "Open notes",
    delete: "Delete",
    confirmDelete: "Delete this video?",
    pending: "Pending approval",
    close: "Close",
    badUrl: "Please enter a valid YouTube URL",
    saved: "Lecture published",
    makePretty: "Beautiful notes",
    prettyIntro: "Generate a beautifully designed version with illustrations, then export as PDF.",
    prettyGenerate: "Generate beautiful notes",
    prettyGenerating: "Designing…",
    exportPdf: "Download PDF",
    illustrations: "Illustrations",
  },
  ar: {
    videos: "محاضرات فيديو",
    addVideo: "إضافة محاضرة يوتيوب",
    ytUrl: "رابط اليوتيوب",
    optionalTitle: "العنوان (اختياري)",
    generate: "توليد الملاحظات",
    generating: "جاري توليد الملاحظات…",
    preview: "معاينة واعتماد",
    approve: "اعتماد ونشر",
    saving: "جاري الحفظ…",
    discard: "إلغاء",
    noVideos: "لا توجد محاضرات بعد.",
    watch: "مشاهدة",
    openNotes: "فتح الملاحظات",
    delete: "حذف",
    confirmDelete: "حذف هذا الفيديو؟",
    pending: "بانتظار الاعتماد",
    close: "إغلاق",
    badUrl: "أدخل رابط يوتيوب صحيح",
    saved: "تم نشر المحاضرة",
    makePretty: "ملاحظات مصممة",
    prettyIntro: "أنشئ نسخة أنيقة مع رسوم توضيحية، ثم صدّرها كملف PDF.",
    prettyGenerate: "توليد ملاحظات مصممة",
    prettyGenerating: "جاري التصميم…",
    exportPdf: "تحميل PDF",
    illustrations: "رسوم توضيحية",
  },
} as const;

function extractYouTubeId(url: string) {
  try {
    const u = new URL(url.trim());
    if (u.hostname === "youtu.be") return u.pathname.slice(1);
    if (u.searchParams.get("v")) return u.searchParams.get("v")!;
    const m = u.pathname.match(/\/(embed|shorts)\/([\w-]+)/);
    if (m) return m[2];
    return null;
  } catch { return null; }
}

async function getFunctionError(error: any, fallback: string) {
  const response = error?.context;
  if (response && typeof response.clone === "function") {
    try {
      const payload = await response.clone().json();
      return String(payload?.error || payload?.message || fallback);
    } catch { /* use fallback below */ }
  }
  return /non-2xx/i.test(String(error?.message || "")) ? fallback : String(error?.message || fallback);
}

// ---- Tiny markdown-ish renderer for the raw notes text -----------------
function renderMd(md: string, isRTL: boolean) {
  const lines = md.split(/\r?\n/);
  const out: JSX.Element[] = [];
  let buf: string[] = [];
  const flush = (key: string) => {
    if (!buf.length) return;
    out.push(<p key={key} className="text-sm leading-7 my-2 whitespace-pre-wrap">{buf.join("\n")}</p>);
    buf = [];
  };
  lines.forEach((raw, i) => {
    const line = raw.replace(/\s+$/,"");
    if (/^#\s+/.test(line)) { flush(`p${i}`); out.push(<h2 key={i} className="text-2xl font-bold mt-6 mb-2 gradient-text">{line.replace(/^#\s+/,"")}</h2>); }
    else if (/^##\s+/.test(line)) { flush(`p${i}`); out.push(<h3 key={i} className="text-xl font-semibold mt-5 mb-2 text-primary">{line.replace(/^##\s+/,"")}</h3>); }
    else if (/^###\s+/.test(line)) { flush(`p${i}`); out.push(<h4 key={i} className="text-base font-semibold mt-4 mb-1">{line.replace(/^###\s+/,"")}</h4>); }
    else if (/^---+$/.test(line)) { flush(`p${i}`); out.push(<hr key={i} className="my-4 border-border" />); }
    else if (/^[-*•]\s+/.test(line)) { flush(`p${i}`); out.push(<li key={i} className="ml-6 list-disc text-sm leading-7">{line.replace(/^[-*•]\s+/,"")}</li>); }
    else if (/^\d+\.\s+/.test(line)) { flush(`p${i}`); out.push(<li key={i} className="ml-6 list-decimal text-sm leading-7">{line.replace(/^\d+\.\s+/,"")}</li>); }
    else if (!line.trim()) flush(`p${i}`);
    else buf.push(line);
  });
  flush("p-end");
  return <div dir={isRTL ? "rtl" : "ltr"}>{out}</div>;
}

// ---- Main component ----------------------------------------------------
export default function TeacherLectureVideos({
  teacherId, topicKey, language, isAdmin,
}: {
  teacherId: string;
  topicKey: string;
  language: AppLanguage;
  isAdmin: boolean;
}) {
  const T = L[language];
  const isRTL = language === "ar";
  const [videos, setVideos] = useState<LectureVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [openVideo, setOpenVideo] = useState<LectureVideo | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teacher_topic_videos")
      .select("*")
      .eq("teacher_id", teacherId)
      .eq("topic_key", topicKey)
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    else setVideos((data ?? []) as unknown as LectureVideo[]);
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [teacherId, topicKey]);

  const remove = async (id: string) => {
    if (!confirm(T.confirmDelete)) return;
    const { error } = await supabase.from("teacher_topic_videos").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setVideos((v) => v.filter((x) => x.id !== id));
  };

  return (
    <section className="mt-8" dir={isRTL ? "rtl" : "ltr"}>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-sm uppercase tracking-widest text-muted-foreground flex items-center gap-2">
          <Youtube className="w-4 h-4 text-red-500" /> {T.videos}
        </h2>
        {isAdmin && !showAdd && (
          <button
            onClick={() => setShowAdd(true)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-primary/40 bg-primary/10 text-primary text-xs font-semibold hover:bg-primary/20"
          >
            <Plus className="w-3.5 h-3.5" /> {T.addVideo}
          </button>
        )}
      </div>

      {isAdmin && showAdd && (
        <AdminAddVideo
          teacherId={teacherId} topicKey={topicKey} language={language} T={T}
          onCancel={() => setShowAdd(false)}
          onSaved={(row) => { setVideos((v) => [row, ...v]); setShowAdd(false); }}
        />
      )}

      {loading ? (
        <div className="p-6 text-center text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin inline" /></div>
      ) : videos.length === 0 ? (
        <p className="text-sm text-muted-foreground">{T.noVideos}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {videos.map((v) => (
            <li key={v.id} className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="relative aspect-video bg-black">
                {v.video_id && (
                  <img
                    src={`https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`}
                    alt={v.title || ""}
                    className="w-full h-full object-cover opacity-90"
                    loading="lazy"
                  />
                )}
                {!v.approved && (
                  <span className="absolute top-2 start-2 text-[10px] uppercase tracking-widest px-2 py-1 rounded bg-yellow-500/90 text-black font-semibold">
                    {T.pending}
                  </span>
                )}
              </div>
              <div className="p-3">
                <p className="font-semibold text-sm truncate">{v.title || v.youtube_url}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setOpenVideo(v)}
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold hover:opacity-90"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> {T.openNotes}
                  </button>
                  <a
                    href={v.youtube_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1 h-8 px-3 rounded-lg border border-border text-xs hover:bg-secondary"
                  >
                    <Youtube className="w-3.5 h-3.5 text-red-500" /> {T.watch}
                  </a>
                  {isAdmin && (
                    <button
                      onClick={() => remove(v.id)}
                      className="ms-auto h-8 w-8 grid place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                      aria-label={T.delete}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <AnimatePresence>
        {openVideo && (
          <VideoNotesModal
            video={openVideo}
            language={language}
            T={T}
            onClose={() => setOpenVideo(null)}
          />
        )}
      </AnimatePresence>
    </section>
  );
}

// ---- Admin add + generate ---------------------------------------------
function AdminAddVideo({
  teacherId, topicKey, language, T, onCancel, onSaved,
}: {
  teacherId: string;
  topicKey: string;
  language: AppLanguage;
  T: (typeof L)[AppLanguage];
  onCancel: () => void;
  onSaved: (v: LectureVideo) => void;
}) {
  const [url, setUrl] = useState("");
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState<"idle" | "gen" | "save">("idle");
  const [parts, setParts] = useState<NotePart[] | null>(null);
  const [transcript, setTranscript] = useState("");

  const generate = async () => {
    const vid = extractYouTubeId(url);
    if (!vid) return toast.error(T.badUrl);
    setBusy("gen");
    try {
      const { data, error } = await supabase.functions.invoke("video-notes", {
        body: { url, language, mode: "notes", adminGeneration: true },
      });
      if (error) throw new Error(await getFunctionError(error, language === "ar" ? "تعذّر توليد الملاحظات. حاول مجدداً." : "Failed to generate notes. Please try again."));
      if (data?.error) throw new Error(data.error);
      const p: NotePart[] = data?.parts || (data?.notes ? [{ title: T.videos, notes: data.notes }] : []);
      if (!p.length) throw new Error("No notes generated");
      setParts(p);
      setTranscript(data?.transcript || "");
    } catch (e: any) {
      toast.error(e.message || "Failed to generate");
    } finally { setBusy("idle"); }
  };

  const approve = async () => {
    if (!parts) return;
    const vid = extractYouTubeId(url);
    setBusy("save");
    try {
      const { data: u } = await supabase.auth.getUser();
      const { data, error } = await supabase
        .from("teacher_topic_videos")
        .insert({
          teacher_id: teacherId,
          topic_key: topicKey,
          youtube_url: url.trim(),
          video_id: vid,
          title: title.trim() || parts[0]?.title || null,
          transcript: transcript || null,
          notes_parts: parts as any,
          approved: true,
          created_by: u.user?.id,
        })
        .select("*")
        .single();
      if (error) throw error;
      toast.success(T.saved);
      onSaved(data as unknown as LectureVideo);
    } catch (e: any) {
      toast.error(e.message || "Failed to save");
    } finally { setBusy("idle"); }
  };

  return (
    <div className="mb-4 p-4 rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur">
      <div className="grid gap-3">
        <label className="text-xs text-muted-foreground">
          {T.ytUrl}
          <input
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=…"
            className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
          />
        </label>
        <label className="text-xs text-muted-foreground">
          {T.optionalTitle}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
          />
        </label>

        {!parts ? (
          <div className="flex gap-2 justify-end">
            <button onClick={onCancel} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-secondary">{T.discard}</button>
            <button
              onClick={generate}
              disabled={!url || busy !== "idle"}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50"
            >
              {busy === "gen" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {busy === "gen" ? T.generating : T.generate}
            </button>
          </div>
        ) : (
          <>
            <div className="text-xs uppercase tracking-widest text-muted-foreground pt-2">{T.preview}</div>
            <div className="max-h-64 overflow-auto rounded-xl border border-border p-3 bg-background/50">
              {parts.map((p, i) => (
                <div key={i} className="mb-4">
                  <h4 className="text-sm font-bold text-primary mb-1">{p.title}</h4>
                  {renderMd(p.notes, language === "ar")}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => { setParts(null); setTranscript(""); }} className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-secondary">{T.discard}</button>
              <button
                onClick={approve}
                disabled={busy === "save"}
                className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50 hover:opacity-90"
              >
                {busy === "save" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {busy === "save" ? T.saving : T.approve}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// ---- Notes viewer + beautiful/PDF export ------------------------------
function VideoNotesModal({
  video, language, T, onClose,
}: {
  video: LectureVideo;
  language: AppLanguage;
  T: (typeof L)[AppLanguage];
  onClose: () => void;
}) {
  const isRTL = language === "ar";
  const [pretty, setPretty] = useState<{ blocks: PrettyBlock[]; images: PrettyImage[] } | null>(null);
  const [busy, setBusy] = useState(false);
  const [exporting, setExporting] = useState(false);
  const prettyRef = useRef<HTMLDivElement>(null);

  const rawText = useMemo(
    () => video.notes_parts.map((p) => `# ${p.title}\n\n${p.notes}`).join("\n\n---\n\n"),
    [video],
  );

  const generatePretty = async () => {
    setBusy(true);
    try {
      const source = (video.transcript?.trim() || rawText).slice(0, 7500);
      const { data, error } = await supabase.functions.invoke("ai-notes-generate", {
        body: { topic: source, language },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      setPretty({ blocks: data.blocks || [], images: data.images || [] });
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally { setBusy(false); }
  };

  const exportPdf = async () => {
    const node = prettyRef.current;
    if (!node) return;
    setExporting(true);
    try {
      const canvas = await html2canvas(node, {
        backgroundColor: "#ffffff",
        scale: 2,
        useCORS: true,
        windowWidth: node.scrollWidth,
      });
      const imgData = canvas.toDataURL("image/jpeg", 0.92);
      const pdf = new jsPDF({ orientation: "p", unit: "pt", format: "a4" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const imgW = pageW - 40;
      const imgH = (canvas.height * imgW) / canvas.width;
      let heightLeft = imgH;
      let position = 20;
      pdf.addImage(imgData, "JPEG", 20, position, imgW, imgH);
      heightLeft -= pageH - 40;
      while (heightLeft > 0) {
        pdf.addPage();
        position = 20 - (imgH - heightLeft);
        pdf.addImage(imgData, "JPEG", 20, position, imgW, imgH);
        heightLeft -= pageH - 40;
      }
      pdf.save(`${video.title || "lecture"}.pdf`);
    } catch (e: any) {
      toast.error(e.message || "Export failed");
    } finally { setExporting(false); }
  };

  return (
    <motion.div
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-background/85 backdrop-blur-sm p-4 overflow-y-auto"
      onClick={onClose}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="max-w-4xl mx-auto my-6 rounded-3xl border border-primary/30 bg-card shadow-2xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-border">
          <h3 className="font-semibold truncate">{video.title || T.videos}</h3>
          <button onClick={onClose} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-secondary">
            <X className="w-4 h-4" />
          </button>
        </div>

        {video.video_id && (
          <div className="aspect-video bg-black">
            <iframe
              className="w-full h-full"
              src={`https://www.youtube.com/embed/${video.video_id}`}
              title={video.title || ""}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            />
          </div>
        )}

        <div className="p-5">
          <div className="flex items-center gap-2 mb-3 flex-wrap">
            {!pretty ? (
              <button
                onClick={generatePretty}
                disabled={busy}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-gradient-to-r from-fuchsia-500 to-primary text-white text-sm font-semibold disabled:opacity-50"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                {busy ? T.prettyGenerating : T.prettyGenerate}
              </button>
            ) : (
              <button
                onClick={exportPdf}
                disabled={exporting}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-lg bg-emerald-500 text-white text-sm font-semibold disabled:opacity-50"
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
                {T.exportPdf}
              </button>
            )}
            {!pretty && (
              <span className="text-xs text-muted-foreground">{T.prettyIntro}</span>
            )}
          </div>

          {pretty ? (
            <div
              ref={prettyRef}
              dir={isRTL ? "rtl" : "ltr"}
              className="p-8 rounded-2xl bg-white text-gray-900"
              style={{ fontFamily: "system-ui, -apple-system, 'Segoe UI', sans-serif" }}
            >
              <PrettyBlocks blocks={pretty.blocks} images={pretty.images} title={video.title || ""} T={T} />
            </div>
          ) : (
            <article className="prose prose-invert max-w-none">
              {video.notes_parts.map((p, i) => (
                <div key={i} className="mb-6">
                  <h3 className="text-lg font-bold text-primary mb-2">{p.title}</h3>
                  {renderMd(p.notes, isRTL)}
                </div>
              ))}
            </article>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}

function PrettyBlocks({
  blocks, images, title, T,
}: { blocks: PrettyBlock[]; images: PrettyImage[]; title: string; T: (typeof L)[AppLanguage] }) {
  return (
    <div>
      <div className="mb-6 pb-4 border-b-4 border-fuchsia-500">
        <h1 className="text-3xl font-black bg-gradient-to-r from-fuchsia-600 to-indigo-600 bg-clip-text text-transparent">
          {title || "Study Notes"}
        </h1>
      </div>
      {blocks.map((b, i) => {
        switch (b.type) {
          case "h1": return <h1 key={i} className="text-2xl font-black mt-6 mb-3 text-indigo-700">{b.text}</h1>;
          case "h2": return <h2 key={i} className="text-xl font-bold mt-5 mb-2 text-fuchsia-700 border-s-4 border-fuchsia-500 ps-3">{b.text}</h2>;
          case "h3": return <h3 key={i} className="text-lg font-bold mt-4 mb-2 text-gray-800">{b.text}</h3>;
          case "text": return <p key={i} className="text-[15px] leading-8 my-2 text-gray-800">{b.text}</p>;
          case "bullet": return <li key={i} className="ms-6 list-disc text-[15px] leading-8 text-gray-800">{b.text}</li>;
          case "numbered": return <li key={i} className="ms-6 list-decimal text-[15px] leading-8 text-gray-800">{b.text}</li>;
          case "todo": return <li key={i} className="ms-6 list-none text-[15px] leading-8 text-gray-800">☐ {b.text}</li>;
          case "quote": return (
            <blockquote key={i} className="my-4 p-4 rounded-xl border-s-4 border-amber-500 bg-amber-50 text-amber-900 text-[15px] leading-7">
              💡 {b.text}
            </blockquote>
          );
          case "divider": return <hr key={i} className="my-5 border-gray-200" />;
          default: return null;
        }
      })}

      {images.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-bold mb-3 flex items-center gap-2 text-fuchsia-700">
            <ImageIcon className="w-5 h-5" /> {T.illustrations}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {images.map((im, i) => (
              <figure key={i} className="rounded-xl overflow-hidden border border-gray-200 bg-gray-50">
                <img src={im.dataUrl} alt={im.prompt} className="w-full h-auto" />
                <figcaption className="text-xs p-2 text-gray-600">{im.prompt}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}