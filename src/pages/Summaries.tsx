import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Upload, Heart, FileText, X, Loader2, Hash, Download, Sparkles, Bell, Clock, Check, Eye } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";

export const SUMMARY_SUBJECTS = [
  { code: "physics", en: "Physics", ar: "الفيزياء", tag: "#Physics" },
  { code: "chemistry", en: "Chemistry", ar: "الكيمياء", tag: "#Chemistry" },
  { code: "biology", en: "Biology", ar: "الأحياء", tag: "#Biology" },
  { code: "math", en: "Math", ar: "الرياضيات", tag: "#Math" },
  { code: "english", en: "English", ar: "الإنجليزية", tag: "#English" },
  { code: "french", en: "French", ar: "الفرنسية", tag: "#French" },
  { code: "arabic", en: "Arabic", ar: "العربية", tag: "#Arabic" },
  { code: "islamic", en: "Islamic", ar: "التربية الإسلامية", tag: "#Islamic" },
  { code: "saitoo", en: "Saitoo", ar: "سايتو", tag: "#saitoo" },
  { code: "success_keys", en: "Success Keys", ar: "مفاتيح النجاح", tag: "#مفاتيح_النجاح" },
] as const;

type SubjectCode = typeof SUMMARY_SUBJECTS[number]["code"];
const MAX_BYTES = 100 * 1024 * 1024;

type SummaryRow = {
  id: string;
  user_id: string;
  name: string;
  description: string | null;
  subject: string;
  file_path: string;
  approved: boolean;
  created_at: string;
};

const Summaries = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";
  const [rows, setRows] = useState<SummaryRow[]>([]);
  const [likes, setLikes] = useState<Record<string, number>>({});
  const [myLikes, setMyLikes] = useState<Set<string>>(new Set());
  const [userId, setUserId] = useState<string | null>(null);
  const [filter, setFilter] = useState<SubjectCode | "all">("all");
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [pending, setPending] = useState<SummaryRow[]>([]);
  const [preview, setPreview] = useState<{ url: string; name: string; mime: string } | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const uploadPanelRef = useRef<HTMLElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Upload form
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [subject, setSubject] = useState<SubjectCode>("physics");
  const [uploading, setUploading] = useState(false);

  const t = (en: string, ar: string) => (isAr ? ar : en);

  const revealUploadPanel = () => {
    uploadPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.setTimeout(() => fileInputRef.current?.focus(), 350);
  };

  const pickFromUploadButton = (f: File | null) => {
    onPickFile(f);
    revealUploadPanel();
  };

  const fetchAll = async () => {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setUserId(user?.id ?? null);
    let admin = false;
    if (user) {
      const { data: r } = await supabase
        .from("user_roles")
        .select("role")
        .eq("user_id", user.id)
        .eq("role", "admin")
        .maybeSingle();
      admin = !!r;
      setIsAdmin(admin);
      const { data: pend } = await supabase
        .from("summaries")
        .select("*")
        .eq("approved", false)
        .order("created_at", { ascending: false });
      // RLS already restricts: admins see all pending; users see their own.
      setPending(((pend ?? []) as SummaryRow[]));
    } else {
      setPending([]);
    }
    const { data: sums } = await supabase
      .from("summaries")
      .select("*")
      .eq("approved", true)
      .order("created_at", { ascending: false });
    const list = (sums ?? []) as SummaryRow[];
    setRows(list);
    if (list.length) {
      const ids = list.map((r) => r.id);
      const { data: lk } = await supabase
        .from("summary_likes")
        .select("summary_id, user_id")
        .in("summary_id", ids);
      const counts: Record<string, number> = {};
      const mine = new Set<string>();
      (lk ?? []).forEach((l: any) => {
        counts[l.summary_id] = (counts[l.summary_id] ?? 0) + 1;
        if (user && l.user_id === user.id) mine.add(l.summary_id);
      });
      setLikes(counts);
      setMyLikes(mine);
    } else {
      setLikes({});
      setMyLikes(new Set());
    }
    setLoading(false);
  };

  useEffect(() => { fetchAll(); }, []);

  const approve = async (id: string) => {
    const { error } = await supabase.from("summaries").update({ approved: true }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Approved", "تمت الموافقة"));
    fetchAll();
  };
  const rejectPending = async (id: string, path: string) => {
    if (!confirm(t("Delete this submission?", "حذف هذا الطلب؟"))) return;
    await supabase.storage.from("summaries").remove([path]);
    const { error } = await supabase.from("summaries").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(t("Removed", "تم الحذف"));
    fetchAll();
  };

  const sorted = useMemo(() => {
    const filtered = filter === "all" ? rows : rows.filter((r) => r.subject === filter);
    return [...filtered].sort((a, b) => (likes[b.id] ?? 0) - (likes[a.id] ?? 0));
  }, [rows, likes, filter]);

  const toggleLike = async (id: string) => {
    if (!userId) return;
    if (myLikes.has(id)) {
      const { error } = await supabase.from("summary_likes").delete().eq("user_id", userId).eq("summary_id", id);
      if (error) return toast.error(error.message);
      setMyLikes((s) => { const n = new Set(s); n.delete(id); return n; });
      setLikes((c) => ({ ...c, [id]: Math.max(0, (c[id] ?? 1) - 1) }));
    } else {
      const { error } = await supabase.from("summary_likes").insert({ user_id: userId, summary_id: id });
      if (error) return toast.error(error.message);
      setMyLikes((s) => new Set(s).add(id));
      setLikes((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
    }
  };

  const download = async (path: string, name: string) => {
    try {
      const ext = path.split(".").pop();
      const filename = /\.[^./]+$/.test(name) || !ext ? name : `${name}.${ext}`;
      // Try direct download blob first
      let blobUrl: string | null = null;
      try {
        const { data, error } = await supabase.storage.from("summaries").download(path);
        if (error || !data) throw error ?? new Error("no-data");
        blobUrl = URL.createObjectURL(data);
      } catch {
        // Fallback to signed URL with download flag
        const { data: signed, error: sErr } = await supabase
          .storage.from("summaries")
          .createSignedUrl(path, 300, { download: filename });
        if (sErr || !signed?.signedUrl) throw sErr ?? new Error("Failed to get URL");
        blobUrl = signed.signedUrl;
      }
      const a = document.createElement("a");
      a.href = blobUrl;
      a.download = filename;
      a.rel = "noopener";
      a.target = "_blank";
      document.body.appendChild(a);
      a.click();
      a.remove();
      if (blobUrl.startsWith("blob:")) setTimeout(() => URL.revokeObjectURL(blobUrl!), 2000);
    } catch (e: any) {
      toast.error(e?.message ?? "Download failed");
    }
  };

  const openPreview = async (path: string, name: string) => {
    setPreviewLoading(true);
    try {
      const { data, error } = await supabase.storage.from("summaries").createSignedUrl(path, 600);
      if (error || !data?.signedUrl) throw error ?? new Error("Failed");
      const ext = (path.split(".").pop() ?? "").toLowerCase();
      const mime = ext === "pdf" ? "application/pdf"
        : ["png","jpg","jpeg","gif","webp"].includes(ext) ? `image/${ext === "jpg" ? "jpeg" : ext}`
        : "";
      setPreview({ url: data.signedUrl, name, mime });
    } catch (e: any) {
      toast.error(e?.message ?? "Preview failed");
    } finally {
      setPreviewLoading(false);
    }
  };

  const onPickFile = (f: File | null) => {
    if (!f) { setFile(null); return; }
    if (f.size > MAX_BYTES) { toast.error(t("File exceeds 100 MB", "الملف يتجاوز 100 ميجابايت")); return; }
    setFile(f);
    if (!name) setName(f.name.replace(/\.[^.]+$/, ""));
  };

  const submitUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return toast.error(t("Please choose a file", "الرجاء اختيار ملف"));
    if (!userId) return toast.error(t("Please sign in to upload", "الرجاء تسجيل الدخول للرفع"));
    if (!name.trim()) return toast.error(t("Name is required", "الاسم مطلوب"));
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "bin";
      const path = `${userId}/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("summaries").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      const { error: insErr } = await supabase.from("summaries").insert({
        user_id: userId,
        name: name.trim(),
        description: description.trim() || null,
        subject,
        file_path: path,
        file_size: file.size,
        mime_type: file.type,
        approved: false,
      });
      if (insErr) throw insErr;
      toast.success(t("Submitted — waiting for admin approval", "تم الإرسال — بانتظار موافقة المسؤول"));
      setFile(null); setName(""); setDescription("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally { setUploading(false); }
  };

  const subjLabel = (code: string) => {
    const s = SUMMARY_SUBJECTS.find((x) => x.code === code);
    return s ? (isAr ? s.ar : s.en) : code;
  };
  const subjTag = (code: string) => SUMMARY_SUBJECTS.find((x) => x.code === code)?.tag ?? `#${code}`;

  return (
    <main className="min-h-screen px-4 py-12 md:py-16 pb-[calc(env(safe-area-inset-bottom)+9rem)] relative overflow-hidden" dir={isAr ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button onClick={onBack} className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all">
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t("Summaries", "ملخصات")}</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text leading-[1.1] mb-3">{t("Community Summaries", "ملخصات الطلاب")}</h1>
        <p className="text-muted-foreground md:text-lg">{t("Share PDF summaries and like the best ones. Top likes rise to the top.", "شارك ملخصاتك مع زملائك وادعم الأفضل. الأكثر إعجاباً يتصدر.")}</p>
      </header>

      <section ref={uploadPanelRef} className="max-w-3xl mx-auto mt-8 relative z-20 scroll-mt-8">
        <form onSubmit={submitUpload} className="rounded-3xl border-2 border-primary/40 bg-card/95 shadow-2xl shadow-primary/10 p-5 md:p-6 space-y-4 animate-fade-up">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
                <Upload className="w-6 h-6 text-primary" />
                {t("Upload files", "رفع الملفات")}
              </h2>
              <p className="text-sm text-muted-foreground mt-1">{t("Choose your file directly here — no popup needed.", "اختر ملفك من هنا مباشرة — بدون نافذة منبثقة.")}</p>
            </div>
          </div>

          <div className="rounded-2xl border-2 border-dashed border-primary/50 bg-primary/10 p-4 space-y-3">
            <label htmlFor="summary-file-input" className="block text-sm font-bold text-foreground">
              {t("1. Choose file", "١. اختر الملف")}
            </label>
            <input
              id="summary-file-input"
              ref={fileInputRef}
              type="file"
              required
              className="block w-full min-h-14 cursor-pointer rounded-2xl border-2 border-primary/40 bg-background p-3 text-base font-semibold text-foreground file:mr-4 file:cursor-pointer file:rounded-xl file:border-0 file:bg-primary file:px-5 file:py-3 file:text-sm file:font-bold file:text-primary-foreground hover:border-primary focus:outline-none focus:ring-4 focus:ring-primary/20"
              onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
              onChange={(e) => onPickFile(e.target.files?.[0] ?? null)}
            />
            <div className="flex items-center gap-3 text-sm">
              <span className="w-11 h-11 rounded-xl bg-primary/15 text-primary flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold text-foreground truncate">
                  {file ? file.name : t("No file selected yet", "لم يتم اختيار ملف بعد")}
                </span>
                <span className="block text-xs text-muted-foreground mt-0.5">
                  {file ? `${(file.size / 1024 / 1024).toFixed(1)} MB` : t("Tap the file chooser above", "اضغط على اختيار الملف بالأعلى")}
                </span>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("2. Name *", "٢. الاسم *")}</label>
              <input required value={name} onChange={(e) => setName(e.target.value)} maxLength={120} className="mt-1 w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/60 outline-none text-sm" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">{t("3. Subject *", "٣. المادة *")}</label>
              <select value={subject} onChange={(e) => setSubject(e.target.value as SubjectCode)} className="mt-1 w-full h-12 px-4 rounded-xl bg-background border border-border focus:border-primary/60 outline-none text-sm">
                {SUMMARY_SUBJECTS.map((s) => <option key={s.code} value={s.code}>{isAr ? s.ar : s.en} — {s.tag}</option>)}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs font-semibold text-muted-foreground">{t("Description (optional)", "الوصف (اختياري)")}</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} maxLength={500} className="mt-1 w-full px-4 py-3 rounded-xl bg-background border border-border focus:border-primary/60 outline-none text-sm" />
          </div>

          <button type="submit" disabled={uploading || !file} className="w-full h-12 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold disabled:opacity-60 inline-flex items-center justify-center gap-2 shadow-lg shadow-primary/25">
            {uploading ? <><Loader2 className="w-4 h-4 animate-spin" /> {t("Uploading…", "جارٍ الرفع…")}</> : <><Upload className="w-4 h-4" /> {t("Submit for approval", "إرسال للموافقة")}</>}
          </button>
          <p className="text-xs text-muted-foreground text-center">{t("An admin will review your file before it appears.", "سيراجع المسؤول الملف قبل ظهوره.")}</p>
        </form>
      </section>

      {pending.length > 0 && (
        <div className="max-w-3xl mx-auto mt-8 space-y-2 relative z-10">
          <div className="flex items-center gap-2 text-sm text-primary font-semibold">
            <Bell className="w-4 h-4" />
            {isAdmin
              ? t(`${pending.length} pending submission(s) waiting for approval`, `${pending.length} ملخص بانتظار الموافقة`)
              : t(`You have ${pending.length} pending submission(s)`, `لديك ${pending.length} ملخص قيد المراجعة`)}
          </div>
          {pending.map((p) => (
            <div key={p.id} className="flex items-start gap-3 rounded-2xl p-3 border border-primary/40 bg-primary/10 backdrop-blur animate-fade-up">
              <Clock className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">{p.name}</p>
                <p className="text-xs text-muted-foreground">{subjLabel(p.subject)} · {subjTag(p.subject)}</p>
              </div>
              {isAdmin ? (
                <div className="flex items-center gap-1.5 shrink-0">
                  <button onClick={() => download(p.file_path, p.name)} title={t("Download", "تحميل")} className="w-8 h-8 rounded-lg border border-white/10 bg-background/40 hover:border-primary/40 flex items-center justify-center text-muted-foreground hover:text-foreground">
                    <Download className="w-4 h-4" />
                  </button>
                  <button onClick={() => approve(p.id)} title={t("Approve", "موافقة")} className="w-8 h-8 rounded-lg bg-primary text-primary-foreground hover:opacity-90 flex items-center justify-center">
                    <Check className="w-4 h-4" />
                  </button>
                  <button onClick={() => rejectPending(p.id, p.file_path)} title={t("Reject", "رفض")} className="w-8 h-8 rounded-lg border border-red-500/40 bg-red-500/10 text-red-400 hover:bg-red-500/20 flex items-center justify-center">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ) : (
                <span className="text-xs text-muted-foreground shrink-0">{t("Pending", "قيد المراجعة")}</span>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="max-w-6xl mx-auto mt-10 flex flex-wrap items-center justify-between gap-3 relative z-10">
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setFilter("all")} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${filter === "all" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"}`}>
            <Hash className="w-3 h-3 inline mr-1" />{t("All", "الكل")}
          </button>
          {SUMMARY_SUBJECTS.map((s) => (
            <button key={s.code} onClick={() => setFilter(s.code)} className={`px-3 py-1.5 rounded-full text-xs border transition-all ${filter === s.code ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"}`}>
              {s.tag}
            </button>
          ))}
        </div>
        <label className="relative overflow-hidden inline-flex items-center gap-2 px-5 h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-bold shadow-lg shadow-primary/30 cursor-pointer">
          <Upload className="w-4 h-4" /> {t("Upload files", "رفع الملفات")}
          <input
            type="file"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            aria-label={t("Upload files", "رفع الملفات")}
            onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
            onChange={(e) => pickFromUploadButton(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {/* Floating upload CTA is a real native file input so tapping it opens the picker directly */}
      <label
        className="fixed z-[90] bottom-[calc(env(safe-area-inset-bottom)+6.5rem)] right-4 rtl:right-auto rtl:left-4 overflow-hidden inline-flex items-center gap-2 px-5 h-12 rounded-full bg-primary text-primary-foreground shadow-2xl shadow-primary/40 hover:bg-primary/90 text-sm font-bold cursor-pointer"
        aria-label={t("Upload files", "رفع الملفات")}
      >
        <Upload className="w-5 h-5" /> {t("Upload files", "رفع الملفات")}
        <input
          type="file"
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
          aria-label={t("Upload files", "رفع الملفات")}
          onClick={(e) => { (e.currentTarget as HTMLInputElement).value = ""; }}
          onChange={(e) => pickFromUploadButton(e.target.files?.[0] ?? null)}
        />
      </label>

      <section className="max-w-6xl mx-auto mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 relative z-10">
        {loading ? (
          <div className="col-span-full flex justify-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : sorted.length === 0 ? (
          <p className="col-span-full text-center text-muted-foreground py-16">{t("No summaries yet. Be the first to upload!", "لا توجد ملخصات بعد. كن أول من يرفع!")}</p>
        ) : sorted.map((r, i) => (
          <article key={r.id} className="rounded-3xl p-5 border border-white/10 bg-secondary/40 backdrop-blur flex flex-col gap-3 animate-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
            <div className="flex items-start justify-between gap-3">
              <div className="w-11 h-11 rounded-2xl bg-primary/15 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <span className="text-xs px-2 py-1 rounded-full border border-primary/30 text-primary">{subjTag(r.subject)}</span>
            </div>
            <div>
              <h3 className="font-semibold text-lg leading-snug">{r.name}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{subjLabel(r.subject)}</p>
              {r.description && <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{r.description}</p>}
            </div>
            <div className="mt-auto flex items-center justify-between pt-2">
              <button onClick={() => toggleLike(r.id)} className={`inline-flex items-center gap-1.5 text-sm transition-colors ${myLikes.has(r.id) ? "text-red-400" : "text-muted-foreground hover:text-foreground"}`}>
                <Heart className={`w-4 h-4 ${myLikes.has(r.id) ? "fill-current" : ""}`} /> {likes[r.id] ?? 0}
              </button>
              <div className="flex items-center gap-3">
                <button onClick={() => openPreview(r.file_path, r.name)} className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
                  <Eye className="w-4 h-4" /> {t("Preview", "معاينة")}
                </button>
                <button onClick={() => download(r.file_path, r.name)} className="inline-flex items-center gap-1.5 text-sm text-primary hover:underline">
                  <Download className="w-4 h-4" /> {t("Download", "تحميل")}
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>

      {(preview || previewLoading) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onClick={() => setPreview(null)}>
          <div className="w-full max-w-5xl h-[85vh] rounded-2xl border border-white/10 bg-secondary overflow-hidden flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
              <p className="font-semibold truncate">{preview?.name ?? t("Loading…", "جارٍ التحميل…")}</p>
              <div className="flex items-center gap-2">
                {preview && (
                  <a href={preview.url} target="_blank" rel="noopener" className="text-xs text-muted-foreground hover:text-foreground">{t("Open in new tab", "فتح في تبويب جديد")}</a>
                )}
                <button onClick={() => setPreview(null)} className="w-8 h-8 rounded-lg hover:bg-background/40 flex items-center justify-center"><X className="w-4 h-4" /></button>
              </div>
            </div>
            <div className="flex-1 bg-background/60">
              {previewLoading || !preview ? (
                <div className="w-full h-full flex items-center justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
              ) : preview.mime === "application/pdf" ? (
                <iframe src={preview.url} title={preview.name} className="w-full h-full" />
              ) : preview.mime.startsWith("image/") ? (
                <div className="w-full h-full flex items-center justify-center overflow-auto p-4">
                  <img src={preview.url} alt={preview.name} className="max-w-full max-h-full object-contain" />
                </div>
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-3 text-center px-6">
                  <FileText className="w-10 h-10 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">{t("Preview not available for this file type.", "المعاينة غير متاحة لهذا النوع من الملفات.")}</p>
                  <a href={preview.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 px-4 h-10 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"><Download className="w-4 h-4" /> {t("Open file", "فتح الملف")}</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </main>
  );
};

export default Summaries;