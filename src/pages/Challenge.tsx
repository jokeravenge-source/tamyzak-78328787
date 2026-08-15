import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft, Upload, Loader2, Trophy, Timer, Check, X, Sparkles,
  Trash2, Play, ChevronRight, Medal, CalendarClock, Lock, Image as ImageIcon,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { extractStudyMaterial } from "@/lib/fileText";
import type { AppLanguage } from "@/components/LanguageGate";

const T = (lang: AppLanguage, ar: string, en: string) => (lang === "ar" ? ar : en);

type Challenge = {
  id: string;
  title: string;
  description: string | null;
  language: string;
  status: string;
  seconds_per_question: number;
  created_at: string;
  starts_at: string | null;
  image_url: string | null;
};

type Question = {
  id: string;
  question: string;
  choices: string[];
  answer_index: number;
  explanation: string | null;
  sort_order: number;
};

type Attempt = {
  id: string;
  user_id: string;
  display_name: string;
  correct_count: number;
  total_count: number;
  total_ms: number;
};

type Draft = { question: string; choices: string[]; answer_index: number; explanation?: string };

const fmtMs = (ms: number) => `${(ms / 1000).toFixed(2)}s`;

const toLocalInput = (iso: string | null) => {
  if (!iso) return "";
  const d = new Date(iso);
  const p = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
};

const useCountdown = (target: string | null) => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!target) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [target]);
  if (!target) return null;
  const ms = new Date(target).getTime() - now;
  if (Number.isNaN(ms)) return null;
  return {
    started: ms <= 0,
    days: Math.floor(Math.max(0, ms) / 86400000),
    hours: Math.floor((Math.max(0, ms) % 86400000) / 3600000),
    minutes: Math.floor((Math.max(0, ms) % 3600000) / 60000),
    seconds: Math.floor((Math.max(0, ms) % 60000) / 1000),
  };
};

const Countdown = ({ language, target, className = "" }: { language: AppLanguage; target: string | null; className?: string }) => {
  const c = useCountdown(target);
  if (!c) return null;
  if (c.started) {
    return <span className={`inline-flex items-center gap-1 text-emerald-500 font-semibold ${className}`}>
      <Play className="h-3.5 w-3.5" /> {T(language, "التحدي متاح الآن", "Live now")}
    </span>;
  }
  const p = (n: number) => String(n).padStart(2, "0");
  return (
    <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${className}`} dir="ltr">
      <CalendarClock className="h-3.5 w-3.5" />
      {c.days > 0 ? `${c.days}${T(language, "ي", "d")} ` : ""}{p(c.hours)}:{p(c.minutes)}:{p(c.seconds)}
    </span>
  );
};

const ChallengePage = ({
  language, onBack, isAdmin,
}: { language: AppLanguage; onBack: () => void; isAdmin: boolean }) => {
  const [items, setItems] = useState<Challenge[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<Challenge | null>(null);
  const [creating, setCreating] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("challenges")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setItems((data as Challenge[]) || []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const remove = async (id: string) => {
    const { error } = await supabase.from("challenges").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(T(language, "تم الحذف", "Deleted"));
    load();
  };

  const publish = async (c: Challenge) => {
    const next = c.status === "published" ? "draft" : "published";
    const { error } = await supabase.from("challenges").update({ status: next }).eq("id", c.id);
    if (error) return toast.error(error.message);
    toast.success(next === "published" ? T(language, "تم النشر", "Published") : T(language, "تم الإخفاء", "Unpublished"));
    load();
  };

  if (creating) {
    return <AdminCreate language={language} onDone={() => { setCreating(false); load(); }} />;
  }
  if (selected) {
    return <ChallengeRunner language={language} challenge={selected} onBack={() => { setSelected(null); load(); }} />;
  }

  return (
    <main className="min-h-screen bg-background pb-32" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          <ArrowLeft className="h-4 w-4" /> {T(language, "رجوع", "Back")}
        </button>
        <header className="mb-6">
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Trophy className="h-7 w-7 text-primary" />
            {T(language, "التحدي", "Challenge")}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            {T(language, "أجب على كل الأسئلة بشكل صحيح وبأقل وقت ممكن لتتصدر القائمة.", "Answer every question correctly in the least total time to top the leaderboard.")}
          </p>
        </header>
        {isAdmin && (
          <button onClick={() => setCreating(true)} className="w-full mb-6 h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2">
            <Upload className="h-4 w-4" /> {T(language, "إنشاء تحدٍ من ملف PDF", "Create challenge from PDF")}
          </button>
        )}
        {loading ? (
          <div className="py-16 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <p className="text-center text-muted-foreground py-16">{T(language, "لا توجد تحديات بعد.", "No challenges yet.")}</p>
        ) : (
          <div className="grid gap-3">
            {items.map((c) => (
              <ChallengeCard key={c.id} language={language} challenge={c} isAdmin={isAdmin}
                onOpen={() => setSelected(c)} onPublish={() => publish(c)} onRemove={() => remove(c.id)}
                onChanged={load} />
            ))}
          </div>
        )}
      </div>
    </main>
  );
};

const ChallengeCard = ({
  language, challenge: c, isAdmin, onOpen, onPublish, onRemove, onChanged,
}: {
  language: AppLanguage; challenge: Challenge; isAdmin: boolean;
  onOpen: () => void; onPublish: () => void; onRemove: () => void; onChanged: () => void;
}) => {
  const cd = useCountdown(c.starts_at);
  const locked = !!cd && !cd.started && !isAdmin;
  const [when, setWhen] = useState(() => toLocalInput(c.starts_at));
  const [saving, setSaving] = useState(false);

  const saveStart = async (value: string) => {
    setWhen(value);
    setSaving(true);
    const { error } = await supabase.from("challenges")
      .update({ starts_at: value ? new Date(value).toISOString() : null }).eq("id", c.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(T(language, "تم تحديث وقت البدء", "Start time updated"));
    onChanged();
  };

  const saveImage = async (f: File) => {
    setSaving(true);
    try {
      const ext = f.name.split(".").pop() || "jpg";
      const path = `${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("challenges").upload(path, f, { upsert: true });
      if (upErr) throw upErr;
      const url = supabase.storage.from("challenges").getPublicUrl(path).data.publicUrl;
      const { error } = await supabase.from("challenges").update({ image_url: url }).eq("id", c.id);
      if (error) throw error;
      toast.success(T(language, "تم تحديث الصورة", "Image updated"));
      onChanged();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="relative rounded-2xl border border-border overflow-hidden bg-card">
      {c.image_url && (
        <>
          <img src={c.image_url} alt={c.title} loading="lazy"
            className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-background via-background/85 to-background/50" />
        </>
      )}
      <div className="relative p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="font-bold text-lg truncate">{c.title}</p>
            {c.description && <p className="text-sm text-muted-foreground line-clamp-2">{c.description}</p>}
            <p className="text-xs text-muted-foreground mt-1 inline-flex items-center gap-1 flex-wrap">
              <Timer className="h-3 w-3" /> {c.seconds_per_question}s / {T(language, "سؤال", "question")}
              {c.status !== "published" && <span className="ms-2 px-2 py-0.5 rounded bg-amber-500/15 text-amber-600">{T(language, "مسودة", "Draft")}</span>}
            </p>
            {c.starts_at && (
              <div className="mt-2 text-xs">
                <span className="text-muted-foreground me-2">
                  {cd?.started ? "" : T(language, "يبدأ بعد", "Starts in")}
                </span>
                <Countdown language={language} target={c.starts_at} className="text-primary text-sm" />
                <p className="text-[11px] text-muted-foreground mt-1">
                  {new Date(c.starts_at).toLocaleString(language === "ar" ? "ar-IQ" : "en-GB")}
                </p>
              </div>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isAdmin && (
              <>
                <button onClick={onPublish} className="h-9 px-3 rounded-lg border border-border bg-card/70 text-xs font-medium">
                  {c.status === "published" ? T(language, "إخفاء", "Unpublish") : T(language, "نشر", "Publish")}
                </button>
                <button onClick={onRemove} className="h-9 w-9 rounded-lg border border-border bg-card/70 inline-flex items-center justify-center text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </>
            )}
            <button onClick={onOpen}
              className={`h-9 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-1 ${
                locked ? "border border-border bg-card/70 text-muted-foreground" : "bg-primary text-primary-foreground"
              }`}>
              {locked ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              {locked ? T(language, "قريباً", "Soon") : T(language, "ابدأ", "Start")}
            </button>
          </div>
        </div>
        {isAdmin && (
          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-border/60 pt-3">
            <input type="datetime-local" value={when} disabled={saving}
              onChange={(e) => saveStart(e.target.value)}
              className="h-9 px-2 rounded-lg border border-border bg-background/80 text-xs" />
            <label className="h-9 px-3 rounded-lg border border-border bg-background/80 text-xs font-medium inline-flex items-center gap-1 cursor-pointer">
              <ImageIcon className="h-3.5 w-3.5" /> {T(language, "تغيير الصورة", "Change image")}
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => { const f = e.target.files?.[0]; if (f) saveImage(f); }} />
            </label>
            {saving && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
          </div>
        )}
      </div>
    </motion.div>
  );
};

const AdminCreate = ({ language, onDone }: { language: AppLanguage; onDone: () => void }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [count, setCount] = useState(10);
  const [seconds, setSeconds] = useState(15);
  const [qLang, setQLang] = useState<AppLanguage>(language);
  const [file, setFile] = useState<File | null>(null);
  const [startsAt, setStartsAt] = useState("");
  const [image, setImage] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [drafts, setDrafts] = useState<Draft[] | null>(null);

  const generate = async () => {
    if (!file) return toast.error(T(language, "اختر ملف PDF", "Pick a PDF file"));
    if (!title.trim()) return toast.error(T(language, "اكتب عنوان التحدي", "Enter a title"));
    setBusy(true);
    try {
      const material = await extractStudyMaterial(file);
      if ((!material.text || material.text.trim().length < 40) && !material.pageImages?.length && !material.fileData) {
        throw new Error(T(language, "تعذّر قراءة الملف", "Could not read the file"));
      }
      const { data, error } = await supabase.functions.invoke("generate-mcq", {
        body: {
          text: material.text,
          pageImages: material.pageImages,
          fileData: material.fileData,
          fileName: material.fileName,
          count,
          language: qLang,
          adminGeneration: true,
        },
      });
      if (error) {
        const fallback = T(language, "تعذّر توليد الأسئلة. حاول مجدداً.", "Failed to generate questions. Please try again.");
        let message = fallback;
        const response = (error as any)?.context;
        if (response && typeof response.clone === "function") {
          try {
            const payload = await response.clone().json();
            message = String(payload?.error || payload?.message || fallback);
          } catch { /* use localized fallback */ }
        }
        throw new Error(message);
      }
      if (data?.error) throw new Error(data.error);
      const qs: Draft[] = (data?.questions || []).filter(
        (q: any) => q?.choices?.length === 4 && typeof q.answer_index === "number",
      );
      if (!qs.length) throw new Error(T(language, "لم يتم توليد أسئلة", "No questions generated"));
      setDrafts(qs);
      toast.success(T(language, "تم التوليد، راجع الأسئلة", "Generated — review the questions"));
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  const approve = async () => {
    if (!drafts?.length) return;
    setBusy(true);
    try {
      const { data: userRes } = await supabase.auth.getUser();
      let imageUrl: string | null = null;
      if (image) {
        const ext = image.name.split(".").pop() || "jpg";
        const path = `${crypto.randomUUID()}.${ext}`;
        const { error: upErr } = await supabase.storage.from("challenges").upload(path, image, { upsert: true });
        if (upErr) throw upErr;
        imageUrl = supabase.storage.from("challenges").getPublicUrl(path).data.publicUrl;
      }
      const { data: ch, error } = await supabase
        .from("challenges")
        .insert({
          title: title.trim(),
          description: description.trim() || null,
          language: qLang,
          status: "published",
          seconds_per_question: seconds,
          starts_at: startsAt ? new Date(startsAt).toISOString() : null,
          image_url: imageUrl,
          created_by: userRes.user?.id ?? null,
        })
        .select("id")
        .single();
      if (error) throw error;
      const rows = drafts.map((d, i) => ({
        challenge_id: (ch as { id: string }).id,
        question: d.question,
        choices: d.choices,
        answer_index: d.answer_index,
        explanation: d.explanation ?? null,
        sort_order: i,
      }));
      const { error: qErr } = await supabase.from("challenge_questions").insert(rows);
      if (qErr) throw qErr;
      toast.success(T(language, "تم نشر التحدي", "Challenge published"));
      onDone();
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-32" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onDone} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium mb-6">
          <ArrowLeft className="h-4 w-4" /> {T(language, "رجوع", "Back")}
        </button>
        <h1 className="text-2xl font-bold mb-5 inline-flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" /> {T(language, "تحدٍ جديد", "New challenge")}
        </h1>
        {!drafts ? (
          <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <input value={title} onChange={(e) => setTitle(e.target.value)}
              placeholder={T(language, "عنوان التحدي", "Challenge title")}
              className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm" />
            <textarea value={description} onChange={(e) => setDescription(e.target.value)}
              placeholder={T(language, "وصف / متطلبات (اختياري)", "Description / requirements (optional)")}
              className="w-full min-h-20 p-3 rounded-lg border border-border bg-background text-sm" />
            <div className="grid grid-cols-2 gap-3">
              <label className="text-sm">
                <span className="text-muted-foreground">{T(language, "عدد الأسئلة", "Questions")}</span>
                <input type="number" min={3} max={30} value={count}
                  onChange={(e) => setCount(Math.max(3, Math.min(30, parseInt(e.target.value || "10", 10))))}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-background" />
              </label>
              <label className="text-sm">
                <span className="text-muted-foreground">{T(language, "ثواني لكل سؤال", "Seconds per question")}</span>
                <input type="number" min={5} max={120} value={seconds}
                  onChange={(e) => setSeconds(Math.max(5, Math.min(120, parseInt(e.target.value || "15", 10))))}
                  className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-background" />
              </label>
            </div>
            <div className="flex gap-2">
              {(["ar", "en"] as AppLanguage[]).map((l) => (
                <button key={l} onClick={() => setQLang(l)}
                  className={`h-9 px-4 rounded-lg text-sm font-medium border ${qLang === l ? "bg-primary text-primary-foreground border-primary" : "border-border"}`}>
                  {l === "ar" ? "عربي" : "English"}
                </button>
              ))}
            </div>
            <label className="block text-sm">
              <span className="text-muted-foreground inline-flex items-center gap-1">
                <CalendarClock className="h-4 w-4" /> {T(language, "وقت وتاريخ بدء التحدي", "Challenge start date & time")}
              </span>
              <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)}
                className="mt-1 w-full h-11 px-3 rounded-lg border border-border bg-background" />
            </label>
            <label className="block rounded-xl border border-dashed border-border p-4 text-center cursor-pointer hover:bg-secondary/50">
              <input type="file" accept="image/*" className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0] ?? null;
                  setImage(f);
                  setImagePreview(f ? URL.createObjectURL(f) : null);
                }} />
              {imagePreview ? (
                <img src={imagePreview} alt="" className="mx-auto h-28 w-full object-cover rounded-lg" />
              ) : (
                <>
                  <ImageIcon className="h-5 w-5 mx-auto mb-2 text-primary" />
                  <span className="text-sm">{T(language, "صورة التحدي (خلفية البطاقة)", "Challenge image (card background)")}</span>
                </>
              )}
            </label>
            <label className="block rounded-xl border border-dashed border-border p-5 text-center cursor-pointer hover:bg-secondary/50">
              <input type="file" accept="application/pdf,.pdf,.docx,.txt" className="hidden"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              <Upload className="h-5 w-5 mx-auto mb-2 text-primary" />
              <span className="text-sm">{file ? file.name : T(language, "ارفع ملف PDF", "Upload a PDF")}</span>
            </label>
            <button onClick={generate} disabled={busy}
              className="w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              {T(language, "توليد الأسئلة", "Generate questions")}
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">{T(language, "راجع الأسئلة ثم وافق للنشر", "Review the questions then approve to publish")}</p>
            {drafts.map((d, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <p className="font-medium">{i + 1}. {d.question}</p>
                  <button onClick={() => setDrafts(drafts.filter((_, j) => j !== i))} className="text-destructive shrink-0">
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                <ul className="mt-2 space-y-1 text-sm">
                  {d.choices.map((c, ci) => (
                    <li key={ci} className={ci === d.answer_index ? "text-emerald-500 font-medium" : "text-muted-foreground"}>
                      {ci === d.answer_index ? "✓ " : "• "}{c}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div className="flex gap-3 pt-2">
              <button onClick={() => setDrafts(null)} className="flex-1 h-12 rounded-xl border border-border font-semibold">
                {T(language, "إعادة", "Redo")}
              </button>
              <button onClick={approve} disabled={busy || drafts.length === 0}
                className="flex-1 h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60">
                {busy && <Loader2 className="h-4 w-4 animate-spin" />}
                {T(language, "موافقة ونشر", "Approve & publish")}
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
};

const ChallengeRunner = ({
  language, challenge, onBack,
}: { language: AppLanguage; challenge: Challenge; onBack: () => void }) => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [phase, setPhase] = useState<"intro" | "play" | "done">("intro");
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [timedOut, setTimedOut] = useState(false);
  const [left, setLeft] = useState(challenge.seconds_per_question);
  const [correct, setCorrect] = useState(0);
  const [totalMs, setTotalMs] = useState(0);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [myAttempt, setMyAttempt] = useState<Attempt | null>(null);
  const startRef = useRef<number>(0);
  const perQ = challenge.seconds_per_question;

  const loadBoard = async () => {
    const { data } = await supabase
      .from("challenge_attempts")
      .select("id, user_id, display_name, correct_count, total_count, total_ms")
      .eq("challenge_id", challenge.id);
    const rows = (data as Attempt[]) || [];
    rows.sort((a, b) => (b.correct_count - a.correct_count) || (a.total_ms - b.total_ms));
    setAttempts(rows);
    const { data: userRes } = await supabase.auth.getUser();
    setMyAttempt(rows.find((r) => r.user_id === userRes.user?.id) ?? null);
  };

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from("challenge_questions")
        .select("id, question, choices, answer_index, explanation, sort_order")
        .eq("challenge_id", challenge.id)
        .order("sort_order", { ascending: true });
      if (error) toast.error(error.message);
      setQuestions(((data as any[]) || []).map((q) => ({ ...q, choices: (q.choices as string[]) || [] })));
      setLoading(false);
      loadBoard();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  // Refresh the leaderboard every minute (only while the tab is visible)
  useEffect(() => {
    const tick = () => {
      if (document.visibilityState === "visible") loadBoard();
    };
    const id = setInterval(tick, 60000);
    document.addEventListener("visibilitychange", tick);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", tick);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge.id]);

  useEffect(() => {
    if (phase !== "play" || picked !== null || timedOut) return;
    const id = setInterval(() => {
      setLeft((v) => {
        if (v <= 1) {
          clearInterval(id);
          setTimedOut(true);
          setTotalMs((t) => t + perQ * 1000);
          return 0;
        }
        return v - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [phase, picked, timedOut, index, perQ]);

  const begin = () => {
    if (myAttempt) {
      toast.error(T(language, "لقد شاركت في هذا التحدي مسبقًا — محاولة واحدة فقط.", "You already took this challenge — one attempt only."));
      return;
    }
    setPhase("play"); setIndex(0); setPicked(null); setTimedOut(false);
    setLeft(perQ); setCorrect(0); setTotalMs(0);
    startRef.current = Date.now();
  };

  const choose = (i: number) => {
    if (picked !== null || timedOut) return;
    const elapsed = Math.min(perQ * 1000, Date.now() - startRef.current);
    setTotalMs((t) => t + elapsed);
    setPicked(i);
    if (i === questions[index].answer_index) setCorrect((c) => c + 1);
  };

  const saveAttempt = async (finalCorrect: number, finalMs: number) => {
    try {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return;
      const { data: prof } = await supabase
        .from("profiles").select("display_name").eq("user_id", uid).maybeSingle();
      const name = (prof as { display_name?: string } | null)?.display_name || T(language, "طالب", "Student");
      const { data: existing } = await supabase
        .from("challenge_attempts")
        .select("id, correct_count, total_ms")
        .eq("challenge_id", challenge.id).eq("user_id", uid).maybeSingle();
      const payload = {
        challenge_id: challenge.id,
        user_id: uid,
        display_name: name,
        correct_count: finalCorrect,
        total_count: questions.length,
        total_ms: Math.round(finalMs),
      };
      if (!existing) {
        await supabase.from("challenge_attempts").insert(payload);
      }
      // One attempt only: an existing row is never overwritten.
      await loadBoard();
    } catch (e: any) {
      toast.error(e.message || "Failed to save result");
    }
  };

  const next = async () => {
    if (index + 1 >= questions.length) {
      setPhase("done");
      await saveAttempt(correct, totalMs);
      return;
    }
    setIndex((i) => i + 1);
    setPicked(null); setTimedOut(false); setLeft(perQ);
    startRef.current = Date.now();
  };

  const q = questions[index];
  const answered = picked !== null || timedOut;
  const isRight = picked !== null && !!q && picked === q.answer_index;
  const board = useMemo(() => attempts.slice(0, 50), [attempts]);
  const cd = useCountdown(challenge.starts_at);
  const notStarted = !!cd && !cd.started;

  if (loading) {
    return <main className="min-h-screen flex items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></main>;
  }

  return (
    <main className="min-h-screen bg-background pb-32 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium mb-6">
          <ArrowLeft className="h-4 w-4" /> {T(language, "رجوع", "Back")}
        </button>
        {phase === "intro" && (
          <div className="space-y-5">
            <div className="relative rounded-2xl border border-border bg-card p-6 text-center overflow-hidden">
              {challenge.image_url && (
                <>
                  <img src={challenge.image_url} alt={challenge.title} className="absolute inset-0 h-full w-full object-cover" />
                  <div className="absolute inset-0 bg-background/80 backdrop-blur-[2px]" />
                </>
              )}
              <div className="relative">
              <h1 className="text-2xl font-bold">{challenge.title}</h1>
              {challenge.description && <p className="text-muted-foreground mt-2 text-sm">{challenge.description}</p>}
              <p className="text-sm text-muted-foreground mt-3">
                {questions.length} {T(language, "سؤال", "questions")} · {perQ}s {T(language, "لكل سؤال", "each")}
              </p>
              {challenge.starts_at && (
                <div className="mt-4">
                  <p className="text-xs text-muted-foreground mb-1">
                    {notStarted ? T(language, "يبدأ التحدي بعد", "Challenge starts in") : T(language, "بدأ في", "Started at")}
                  </p>
                  {notStarted
                    ? <Countdown language={language} target={challenge.starts_at} className="text-2xl text-primary" />
                    : <Countdown language={language} target={challenge.starts_at} className="text-sm" />}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {new Date(challenge.starts_at).toLocaleString(language === "ar" ? "ar-IQ" : "en-GB")}
                  </p>
                </div>
              )}
              {myAttempt && (
                <p className="text-sm mt-2 text-primary font-medium">
                  {T(language, "نتيجتك", "Your result")}: {myAttempt.correct_count}/{myAttempt.total_count} · {fmtMs(myAttempt.total_ms)}
                </p>
              )}
              {myAttempt && (
                <p className="text-xs text-muted-foreground mt-1">
                  {T(language, "محاولة واحدة فقط لكل طالب.", "One attempt only per student.")}
                </p>
              )}
              <button onClick={begin} disabled={questions.length === 0 || notStarted || !!myAttempt}
                className="mt-5 h-12 px-8 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center gap-2 disabled:opacity-60">
                {notStarted || myAttempt ? <Lock className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {myAttempt
                  ? T(language, "تمت المشاركة", "Already attempted")
                  : notStarted ? T(language, "لم يبدأ بعد", "Not started yet") : T(language, "ابدأ التحدي", "Start challenge")}
              </button>
              </div>
            </div>
            <LeaderboardCard language={language} rows={board} />
          </div>
        )}
        {phase === "play" && q && (
          <div>
            <div className="flex items-center justify-between mb-3 text-sm">
              <span className="text-muted-foreground">{index + 1} / {questions.length}</span>
              <span className={`inline-flex items-center gap-1 font-semibold tabular-nums ${left <= 5 ? "text-destructive" : "text-primary"}`}>
                <Timer className="h-4 w-4" /> {left}s
              </span>
            </div>
            <div className="h-1.5 rounded-full bg-secondary overflow-hidden mb-6">
              <motion.div className="h-full bg-primary" animate={{ width: `${(left / perQ) * 100}%` }} transition={{ duration: 0.4 }} />
            </div>
            <AnimatePresence mode="wait">
              <motion.div key={q.id}
                initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}>
                <motion.div
                  animate={answered && !isRight ? { x: [0, -10, 10, -6, 6, 0] } : {}}
                  transition={{ duration: 0.4 }}
                  className="rounded-2xl border border-border bg-card p-5 mb-4">
                  <p className="text-lg font-semibold">{q.question}</p>
                </motion.div>
                <div className="grid gap-3">
                  {q.choices.map((c, i) => {
                    const isAnswer = i === q.answer_index;
                    const isPicked = i === picked;
                    let cls = "border-border bg-card hover:border-primary/50";
                    if (answered) {
                      if (isAnswer) cls = "border-emerald-500 bg-emerald-500/10";
                      else if (isPicked) cls = "border-destructive bg-destructive/10";
                      else cls = "border-border/50 bg-card/50 opacity-60";
                    }
                    return (
                      <motion.button key={i} onClick={() => choose(i)} disabled={answered}
                        whileTap={{ scale: 0.97 }}
                        animate={answered && isAnswer ? { scale: [1, 1.04, 1] } : {}}
                        className={`w-full text-start rounded-xl border p-4 transition-colors flex items-center justify-between gap-3 ${cls}`}>
                        <span>{c}</span>
                        {answered && isAnswer && <Check className="h-5 w-5 text-emerald-500 shrink-0" />}
                        {answered && isPicked && !isAnswer && <X className="h-5 w-5 text-destructive shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>
                <AnimatePresence>
                  {answered && (
                    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-5">
                      <motion.div
                        initial={{ scale: 0.85 }} animate={{ scale: 1 }}
                        className={`rounded-xl p-4 text-center font-semibold ${
                          isRight ? "bg-emerald-500/15 text-emerald-500" : "bg-destructive/15 text-destructive"
                        }`}>
                        <motion.span
                          initial={{ rotate: -12, scale: 0.6 }} animate={{ rotate: 0, scale: 1 }}
                          transition={{ type: "spring", stiffness: 400, damping: 12 }}
                          className="block text-3xl mb-1">
                          {isRight ? "🎉" : timedOut ? "⏰" : "❌"}
                        </motion.span>
                        {isRight
                          ? T(language, "إجابة صحيحة!", "Correct!")
                          : timedOut
                            ? T(language, "انتهى الوقت", "Time's up")
                            : T(language, "إجابة خاطئة", "Wrong answer")}
                        {q.explanation && (
                          <p className="mt-2 text-sm font-normal text-foreground/80">{q.explanation}</p>
                        )}
                      </motion.div>
                      <button onClick={next}
                        className="mt-4 w-full h-12 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2">
                        {index + 1 >= questions.length ? T(language, "إنهاء", "Finish") : T(language, "السؤال التالي", "Next question")}
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        {phase === "done" && (
          <div className="space-y-5">
            <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
              className="rounded-2xl border border-border bg-card p-8 text-center">
              <motion.div initial={{ rotate: -15, scale: 0.5 }} animate={{ rotate: 0, scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 12 }} className="text-5xl mb-3">
                {correct === questions.length ? "🏆" : "💪"}
              </motion.div>
              <p className="text-3xl font-bold">{correct} / {questions.length}</p>
              <p className="text-muted-foreground mt-1">{T(language, "الوقت الكلي", "Total time")}: {fmtMs(totalMs)}</p>
              <button onClick={begin} className="mt-5 h-11 px-6 rounded-xl border border-border font-semibold">
                {T(language, "حاول مرة أخرى", "Try again")}
              </button>
            </motion.div>
            <LeaderboardCard language={language} rows={board} />
          </div>
        )}
      </div>
    </main>
  );
};

const LeaderboardCard = ({ language, rows }: { language: AppLanguage; rows: Attempt[] }) => (
  <div className="rounded-2xl border border-border bg-card p-5">
    <h2 className="font-bold mb-3 inline-flex items-center gap-2">
      <Trophy className="h-5 w-5 text-primary" /> {T(language, "لوحة المتصدرين", "Leaderboard")}
    </h2>
    {rows.length === 0 ? (
      <p className="text-sm text-muted-foreground">{T(language, "لا توجد نتائج بعد. كن الأول!", "No results yet. Be the first!")}</p>
    ) : (
      <ol className="space-y-2">
        {rows.map((r, i) => (
          <li key={r.id} className="flex items-center gap-3 rounded-xl border border-border/60 p-3">
            <span className={`w-7 h-7 rounded-full inline-flex items-center justify-center text-xs font-bold ${
              i === 0 ? "bg-amber-400/20 text-amber-500"
              : i === 1 ? "bg-slate-400/20 text-slate-400"
              : i === 2 ? "bg-orange-500/20 text-orange-500"
              : "bg-secondary text-muted-foreground"
            }`}>
              {i < 3 ? <Medal className="h-4 w-4" /> : i + 1}
            </span>
            <span className="flex-1 truncate font-medium">{r.display_name}</span>
            <span className="text-sm text-muted-foreground tabular-nums">{r.correct_count}/{r.total_count}</span>
            <span className="text-sm font-semibold tabular-nums text-primary">{fmtMs(r.total_ms)}</span>
          </li>
        ))}
      </ol>
    )}
  </div>
);

export default ChallengePage;