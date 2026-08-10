import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, GraduationCap, ChevronRight, Upload, Sparkles, Trash2, Loader2, FileText, CheckCircle2, XCircle, Plus } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import anziAsset from "@/assets/teachers/mohammed-anzi.jpg.asset.json";
import { missionsData } from "@/data/missions";
import { supabase } from "@/integrations/supabase/client";
import { extractStudyMaterial } from "@/lib/fileText";
import TeacherLectureVideos from "@/components/TeacherLectureVideos";

const t = {
  en: {
    title: "Our Teachers",
    desc: "Meet the instructors behind Tamayzak.",
    back: "Back",
    role: "Instructor",
    subjectLabel: "Subject",
    chapter: "Chapter 1",
    topics: "Lectures",
    lecture: "Lecture",
    openTopic: "Open",
    noSets: "No practice sets yet for this topic.",
    generateTitle: "Generate MCQs (Admin)",
    upload: "Upload PDF",
    change: "Change file",
    count: "Number of questions",
    generate: "Generate & Save",
    generating: "Generating…",
    extracting: "Reading PDF…",
    saved: "MCQ set saved",
    delete: "Delete",
    setTitle: "Set title (optional)",
    practice: "Practice",
    close: "Close",
    next: "Next",
    finish: "Finish",
    correct: "Correct",
    wrong: "Wrong",
    score: "Score",
    reveal: "Show answer",
    questions: "questions",
    confirmDelete: "Delete this MCQ set?",
    confirmDeleteQuestion: "Delete this question?",
    deleteQuestion: "Delete question",
    badType: "Please upload a PDF file",
    noText: "Could not read the PDF",
    tooBig: "File is too large (max 100MB)",
  },
  ar: {
    title: "مدرسينا",
    desc: "تعرّف على المدرسين المميّزين في تميّزك.",
    back: "رجوع",
    role: "مدرّس",
    subjectLabel: "المادة",
    chapter: "الفصل الأول",
    topics: "المحاضرات",
    lecture: "محاضرة",
    openTopic: "فتح",
    noSets: "لا توجد أسئلة تدريبية لهذا الموضوع بعد.",
    generateTitle: "توليد أسئلة (للمدير)",
    upload: "رفع ملف PDF",
    change: "تغيير الملف",
    count: "عدد الأسئلة",
    generate: "توليد وحفظ",
    generating: "جاري التوليد…",
    extracting: "قراءة الـPDF…",
    saved: "تم حفظ الأسئلة",
    delete: "حذف",
    setTitle: "عنوان المجموعة (اختياري)",
    practice: "تدريب",
    close: "إغلاق",
    next: "التالي",
    finish: "إنهاء",
    correct: "صحيح",
    wrong: "خطأ",
    score: "النتيجة",
    reveal: "عرض الإجابة",
    questions: "أسئلة",
    confirmDelete: "حذف مجموعة الأسئلة هذه؟",
    confirmDeleteQuestion: "حذف هذا السؤال؟",
    deleteQuestion: "حذف السؤال",
    badType: "يرجى رفع ملف PDF",
    noText: "تعذر قراءة الـPDF",
    tooBig: "الملف كبير جداً (الحد 100MB)",
  },
} as const;

type Teacher = {
  id: string;
  nameAr: string;
  nameEn: string;
  photo: string;
  subject: string; // missionsData key
  chapterKey: string; // chapter key inside subject
};

const teachers: Teacher[] = [
  {
    id: "mohammed-anzi",
    nameAr: "محمد العنزي",
    nameEn: "Mohammed Al-Anzi",
    photo: anziAsset.url,
    subject: "biology",
    chapterKey: "bio-1",
  },
];

type MCQItem = {
  question: string;
  choices: string[];
  answer_index: number;
  hint?: string;
  explanation?: string;
};

type MCQSet = {
  id: string;
  teacher_id: string;
  topic_key: string;
  title: string;
  questions: MCQItem[];
  created_at: string;
};

type View =
  | { kind: "list" }
  | { kind: "topics"; teacher: Teacher }
  | { kind: "topic"; teacher: Teacher; topicKey: string };

const Teachers = ({
  language,
  onBack,
  isAdmin,
}: {
  language: AppLanguage;
  onBack: () => void;
  isAdmin?: boolean;
}) => {
  const L = t[language];
  const isRTL = language === "ar";
  const [view, setView] = useState<View>(() => {
    if (typeof window !== "undefined") {
      const p = new URLSearchParams(window.location.search);
      if (p.get("anzi") || p.get("lec")) {
        const anzi = teachers.find((t) => t.id === "mohammed-anzi");
        if (anzi) return { kind: "topics", teacher: anzi };
      }
    }
    return { kind: "list" };
  });
  const [ownerEmail, setOwnerEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setOwnerEmail((data.user?.email ?? "").toLowerCase() || null);
    });
  }, []);
  const isOwner = ownerEmail === "majs11@gmail.com";

  const goBackTop = () => {
    if (view.kind === "topic") setView({ kind: "topics", teacher: view.teacher });
    else if (view.kind === "topics") setView({ kind: "list" });
    else onBack();
  };

  return (
    <main className="min-h-screen px-4 py-10 md:py-14 pb-32" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto">
        <button
          onClick={goBackTop}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-8"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {L.back}
        </button>

        <AnimatePresence mode="wait">
          {view.kind === "list" && (
            <motion.div
              key="list"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
            >
              <header className="mb-10 text-center">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-4">
                  <GraduationCap className="w-3.5 h-3.5 text-primary" />
                  <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                    {L.title}
                  </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-bold gradient-text leading-tight mb-3">
                  {L.title}
                </h1>
                <p className="text-muted-foreground max-w-lg mx-auto">{L.desc}</p>
              </header>

              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {teachers.map((teacher, i) => (
                  <motion.button
                    key={teacher.id}
                    onClick={() => setView({ kind: "topics", teacher })}
                    initial={{ opacity: 0, y: 24 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.08, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                    className="group relative overflow-hidden rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur shadow-lg hover:shadow-[var(--shadow-glow)] hover:-translate-y-1 transition-all duration-300 text-start"
                  >
                    <div className="aspect-square w-full overflow-hidden bg-background">
                      <img
                        src={teacher.photo}
                        alt={isRTL ? teacher.nameAr : teacher.nameEn}
                        loading="lazy"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    </div>
                    <div className="p-5">
                      <p className="text-[11px] uppercase tracking-[0.25em] text-primary mb-1">
                        {L.role}
                      </p>
                      <h3 className="text-xl font-bold text-foreground">
                        {isRTL ? teacher.nameAr : teacher.nameEn}
                      </h3>
                      <p className="text-xs text-muted-foreground mt-1">
                        {missionsData[teacher.subject]?.[language]}
                      </p>
                    </div>
                    <div
                      className="absolute bottom-0 inset-x-0 h-[2px] w-0 group-hover:w-full transition-all duration-700"
                      style={{ background: "var(--gradient-primary)" }}
                    />
                  </motion.button>
                ))}
              </section>
            </motion.div>
          )}

          {view.kind === "topics" && (
            view.teacher.id === "mohammed-anzi" ? (
              <AnziFlow key="anzi" teacher={view.teacher} isAdmin={!!isAdmin} />
            ) : (
              <TopicsView
                key="topics"
                teacher={view.teacher}
                language={language}
                L={L}
                onOpen={(topicKey) => setView({ kind: "topic", teacher: view.teacher, topicKey })}
              />
            )
          )}

          {view.kind === "topic" && (
            <TopicView
              key={`t-${view.topicKey}`}
              teacher={view.teacher}
              topicKey={view.topicKey}
              language={language}
              L={L}
              isAdmin={!!isAdmin}
            />
          )}
        </AnimatePresence>
      </div>
    </main>
  );
};

// ---------- Topics list for a teacher's chapter 1 ----------
function TopicsView({
  teacher,
  language,
  L,
  onOpen,
}: {
  teacher: Teacher;
  language: AppLanguage;
  L: Record<keyof (typeof t)["en"], string>;
  onOpen: (topicKey: string) => void;
}) {
  const subject = missionsData[teacher.subject];
  const chapter = subject?.chapters.find((c) => c.key === teacher.chapterKey);

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <header className="mb-8">
        <div className="flex items-center gap-4 mb-4">
          <img
            src={teacher.photo}
            alt={language === "ar" ? teacher.nameAr : teacher.nameEn}
            className="w-14 h-14 rounded-2xl object-cover border border-primary/30"
          />
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-primary">{L.role}</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {language === "ar" ? teacher.nameAr : teacher.nameEn}
            </h1>
            <p className="text-xs text-muted-foreground">
              {subject?.[language]} · {chapter?.[language] || L.chapter}
            </p>
          </div>
        </div>
      </header>

      <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">{L.topics}</h2>
      <ul className="grid gap-2">
        {Array.from({ length: 28 }, (_, idx) => idx + 1).map((n, i) => (
          <motion.li
            key={n}
            initial={{ opacity: 0, x: 8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.02 }}
          >
            <button
              onClick={() => onOpen(`lecture-${n}`)}
              className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/50 transition-colors text-start"
            >
              <span className="font-medium">
                {L.lecture} {n}
              </span>
              <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
            </button>
          </motion.li>
        ))}
      </ul>
    </motion.div>
  );
}

// ---------- Topic detail: list MCQ sets + admin generator ----------
function TopicView({
  teacher,
  topicKey,
  language,
  L,
  isAdmin,
}: {
  teacher: Teacher;
  topicKey: string;
  language: AppLanguage;
  L: Record<keyof (typeof t)["en"], string>;
  isAdmin: boolean;
}) {
  const subject = missionsData[teacher.subject];
  const chapter = subject?.chapters.find((c) => c.key === teacher.chapterKey);
  const lectureNum = /^lecture-(\d+)$/.exec(topicKey)?.[1];
  const lectureLabel = lectureNum ? `${L.lecture} ${lectureNum}` : topicKey;

  const [sets, setSets] = useState<MCQSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [showGen, setShowGen] = useState(false);
  const [practice, setPractice] = useState<MCQSet | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("teacher_topic_mcqs")
      .select("id, teacher_id, topic_key, title, questions, created_at")
      .eq("teacher_id", teacher.id)
      .eq("topic_key", topicKey)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      const all = (data ?? []) as unknown as MCQSet[];
      const hasArabic = (s: string) => /[\u0600-\u06FF]/.test(s || "");
      const filtered = all.filter((s) => {
        const q = s.questions?.[0]?.question || "";
        return language === "ar" ? hasArabic(q) : !hasArabic(q);
      });
      setSets(filtered);
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teacher.id, topicKey]);

  const removeSet = async (id: string) => {
    if (!confirm(L.confirmDelete)) return;
    const { error } = await supabase.from("teacher_topic_mcqs").delete().eq("id", id);
    if (error) return toast.error(error.message);
    setSets((s) => s.filter((x) => x.id !== id));
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}>
      <header className="mb-6">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary">
          {chapter?.[language]}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">
          {lectureLabel}
        </h1>
        <p className="text-xs text-muted-foreground">
          {language === "ar" ? teacher.nameAr : teacher.nameEn}
        </p>
      </header>

      {isAdmin && (
        <div className="mb-6">
          {!showGen ? (
            <button
              onClick={() => setShowGen(true)}
              className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20 transition-colors"
            >
              <Plus className="w-4 h-4" />
              {L.generateTitle}
            </button>
          ) : (
            <GeneratorPanel
              teacher={teacher}
              topicKey={topicKey}
              language={language}
              L={L}
              onCreated={(row) => {
                setSets((s) => [row, ...s]);
                setShowGen(false);
              }}
              onCancel={() => setShowGen(false)}
            />
          )}
        </div>
      )}

      <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">MCQ sets</h2>
      {loading ? (
        <div className="p-6 text-center text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin inline" />
        </div>
      ) : sets.length === 0 ? (
        <p className="text-sm text-muted-foreground">{L.noSets}</p>
      ) : (
        <ul className="grid gap-3">
          {sets.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card"
            >
              <div className="min-w-0">
                <p className="font-semibold truncate">
                  {s.title || `${s.questions.length} ${L.questions}`}
                </p>
                <p className="text-xs text-muted-foreground">
                  {s.questions.length} {L.questions} · {new Date(s.created_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setPractice(s)}
                  className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                >
                  {L.practice}
                </button>
                {isAdmin && (
                  <button
                    onClick={() => removeSet(s.id)}
                    className="h-9 w-9 grid place-items-center rounded-lg border border-border text-destructive hover:bg-destructive/10"
                    aria-label={L.delete}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {practice && (
        <PracticeModal
          set={practice}
          language={language}
          L={L}
          onClose={() => setPractice(null)}
          isAdmin={isAdmin}
          onSetUpdated={(next) => {
            if (next === null) {
              setSets((arr) => arr.filter((x) => x.id !== practice.id));
            } else {
              setSets((arr) => arr.map((x) => (x.id === next.id ? next : x)));
              setPractice(next);
            }
          }}
        />
      )}

      <TeacherLectureVideos
        teacherId={teacher.id}
        topicKey={topicKey}
        language={language}
        isAdmin={isAdmin}
      />
    </motion.div>
  );
}

// ---------- Admin generator panel ----------
function GeneratorPanel({
  teacher,
  topicKey,
  language,
  L,
  onCreated,
  onCancel,
}: {
  teacher: Teacher;
  topicKey: string;
  language: AppLanguage;
  L: Record<keyof (typeof t)["en"], string>;
  onCreated: (row: MCQSet) => void;
  onCancel: () => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [count, setCount] = useState(10);
  const [title, setTitle] = useState("");
  const [busy, setBusy] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = () => inputRef.current?.click();

  const onFile = (f: File | null) => {
    if (!f) return;
    if (f.size > 100 * 1024 * 1024) return toast.error(L.tooBig);
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") return toast.error(L.badType);
    setFile(f);
  };

  const submit = async () => {
    if (!file) return;
    setBusy(true);
    try {
      toast.loading(L.extracting, { id: "tg-ext" });
      const material = await extractStudyMaterial(file);
      toast.dismiss("tg-ext");
      if ((!material.text || material.text.trim().length < 40) && !material.pageImages?.length) {
        return toast.error(L.noText);
      }
      toast.loading(L.generating, { id: "tg-gen" });
      const { data, error } = await supabase.functions.invoke("generate-mcq", {
        body: {
          text: material.text,
          pageImages: material.pageImages,
          fileData: material.fileData,
          fileName: material.fileName,
          count,
          language,
        },
      });
      toast.dismiss("tg-gen");
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      const qs: MCQItem[] = (data?.questions || []).filter(
        (q: any) => q?.choices?.length === 4 && typeof q.answer_index === "number",
      );
      if (!qs.length) throw new Error("No questions returned");

      const { data: inserted, error: insErr } = await supabase
        .from("teacher_topic_mcqs")
        .insert({
          teacher_id: teacher.id,
          topic_key: topicKey,
          title: title.trim(),
          questions: qs as any,
        })
        .select("id, teacher_id, topic_key, title, questions, created_at")
        .single();
      if (insErr) throw insErr;
      toast.success(L.saved);
      onCreated(inserted as unknown as MCQSet);
    } catch (e: any) {
      toast.dismiss();
      toast.error(e.message || "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="p-4 rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur">
      <div className="flex items-center gap-2 mb-4">
        <Sparkles className="w-4 h-4 text-primary" />
        <h3 className="font-semibold">{L.generateTitle}</h3>
      </div>

      <div className="grid gap-3">
        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          className="hidden"
          onChange={(e) => onFile(e.target.files?.[0] ?? null)}
        />
        <button
          onClick={pick}
          type="button"
          className="flex items-center justify-center gap-2 h-11 rounded-xl border border-dashed border-primary/40 bg-background/40 text-sm hover:bg-background transition-colors"
        >
          {file ? (
            <>
              <FileText className="w-4 h-4" />
              <span className="truncate max-w-[220px]">{file.name}</span>
              <span className="text-muted-foreground">· {L.change}</span>
            </>
          ) : (
            <>
              <Upload className="w-4 h-4" />
              {L.upload}
            </>
          )}
        </button>

        <label className="text-xs text-muted-foreground">
          {L.setTitle}
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="mt-1 w-full h-10 px-3 rounded-lg bg-background border border-border text-sm"
            placeholder="—"
          />
        </label>

        <label className="text-xs text-muted-foreground">
          {L.count}: <span className="text-foreground font-semibold">{count}</span>
          <input
            type="range"
            min={5}
            max={40}
            step={1}
            value={count}
            onChange={(e) => setCount(Number(e.target.value))}
            className="mt-1 w-full"
          />
        </label>

        <div className="flex gap-2 justify-end">
          <button
            onClick={onCancel}
            className="h-10 px-4 rounded-lg border border-border text-sm hover:bg-secondary"
          >
            {L.close}
          </button>
          <button
            onClick={submit}
            disabled={!file || busy}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-50 hover:opacity-90"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
            {busy ? L.generating : L.generate}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------- Practice quiz modal ----------
function PracticeModal({
  set,
  language,
  L,
  onClose,
  isAdmin,
  onSetUpdated,
}: {
  set: MCQSet;
  language: AppLanguage;
  L: Record<keyof (typeof t)["en"], string>;
  onClose: () => void;
  isAdmin?: boolean;
  onSetUpdated?: (next: MCQSet | null) => void;
}) {
  const [i, setI] = useState(0);
  const [selected, setSelected] = useState<number | null>(null);
  const [revealed, setRevealed] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [questions, setQuestions] = useState<MCQItem[]>(set.questions);
  const [deleting, setDeleting] = useState(false);
  const q = questions[i];

  const submit = () => {
    if (selected === null) return;
    if (selected === q.answer_index) setScore((s) => s + 1);
    setRevealed(true);
  };

  const next = () => {
    if (i + 1 >= questions.length) {
      setDone(true);
      return;
    }
    setI((n) => n + 1);
    setSelected(null);
    setRevealed(false);
  };

  const deleteCurrentQuestion = async () => {
    if (!confirm(L.confirmDeleteQuestion)) return;
    setDeleting(true);
    try {
      const remaining = questions.filter((_, idx) => idx !== i);
      if (remaining.length === 0) {
        const { error } = await supabase
          .from("teacher_topic_mcqs")
          .delete()
          .eq("id", set.id);
        if (error) throw error;
        toast.success(L.delete);
        onSetUpdated?.(null);
        onClose();
        return;
      }
      const { error } = await supabase
        .from("teacher_topic_mcqs")
        .update({ questions: remaining as any })
        .eq("id", set.id);
      if (error) throw error;
      setQuestions(remaining);
      const nextIndex = Math.min(i, remaining.length - 1);
      setI(nextIndex);
      setSelected(null);
      setRevealed(false);
      onSetUpdated?.({ ...set, questions: remaining });
      toast.success(L.delete);
    } catch (e: any) {
      toast.error(e.message || "Failed");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4"
      onClick={onClose}
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-xl rounded-3xl border border-primary/30 bg-card p-6 shadow-xl"
      >
        <div className="flex items-center justify-between mb-4">
          <span className="text-xs text-muted-foreground">
            {done ? L.finish : `${i + 1} / ${questions.length}`}
          </span>
          <div className="flex items-center gap-2">
            {isAdmin && !done && (
              <button
                onClick={deleteCurrentQuestion}
                disabled={deleting}
                className="inline-flex items-center gap-1 h-8 px-2 rounded-lg border border-destructive/40 text-destructive text-xs hover:bg-destructive/10 disabled:opacity-50"
                aria-label={L.deleteQuestion}
              >
                <Trash2 className="w-3.5 h-3.5" />
                {L.deleteQuestion}
              </button>
            )}
            <button onClick={onClose} className="text-sm text-muted-foreground hover:text-foreground">
              {L.close}
            </button>
          </div>
        </div>

        {done ? (
          <div className="text-center py-6">
            <h3 className="text-2xl font-bold mb-2">{L.score}</h3>
            <p className="text-4xl font-bold text-primary">
              {score} / {questions.length}
            </p>
          </div>
        ) : (
          <>
            <h3 className="text-lg font-semibold mb-4">{q.question}</h3>
            <div className="grid gap-2 mb-4">
              {q.choices.map((c, idx) => {
                const isCorrect = revealed && idx === q.answer_index;
                const isWrong = revealed && idx === selected && selected !== q.answer_index;
                return (
                  <button
                    key={idx}
                    disabled={revealed}
                    onClick={() => setSelected(idx)}
                    className={`text-start p-3 rounded-xl border transition-colors ${
                      isCorrect
                        ? "border-emerald-500 bg-emerald-500/10"
                        : isWrong
                          ? "border-destructive bg-destructive/10"
                          : selected === idx
                            ? "border-primary bg-primary/10"
                            : "border-border hover:bg-secondary"
                    }`}
                  >
                    <span className="inline-flex items-center gap-2">
                      {isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                      {isWrong && <XCircle className="w-4 h-4 text-destructive" />}
                      {c}
                    </span>
                  </button>
                );
              })}
            </div>
            {revealed && q.explanation && (
              <p className="text-sm text-muted-foreground mb-4 p-3 rounded-lg bg-secondary/50">
                {q.explanation}
              </p>
            )}
            <div className="flex justify-end gap-2">
              {!revealed ? (
                <button
                  onClick={submit}
                  disabled={selected === null}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold disabled:opacity-50"
                >
                  {L.reveal}
                </button>
              ) : (
                <button
                  onClick={next}
                  className="h-10 px-4 rounded-lg bg-primary text-primary-foreground font-semibold"
                >
                  {i + 1 >= questions.length ? L.finish : L.next}
                </button>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}

export default Teachers;

// ================= Mohammed Al-Anzi flow =================
const ANZI_PLAYLISTS = {
  ar: "PL8aWGashaQUhrL8s3uNqTCwDQgvCu35za",
  en: "PLsYLu8VyivsT1nBmS7r8OPLYpNJXqbsAs",
} as const;

const ANZI_LECTURE_COUNT: Record<AnziLang, number> = { ar: 23, en: 22 };

type AnziLang = "ar" | "en";
type AnziStage =
  | { s: "language" }
  | { s: "lectures"; lang: AnziLang }
  | { s: "lecture"; lang: AnziLang; n: number };

// Chapter 3 is the only unlocked chapter — kept as a constant so existing
// stored MCQ / notes topic keys (anzi-<lang>-ch3-lec<N>-<mode>) still match.
const ANZI_CH = 3;

function AnziFlow({ teacher, isAdmin }: { teacher: Teacher; isAdmin: boolean }) {
  const [stage, setStage] = useState<AnziStage>({ s: "language" });

  // Deep-link support: /teachers?anzi=1&lang=ar&lec=5
  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const lang = p.get("lang");
    const lec = parseInt(p.get("lec") || "", 10);
    if (lang === "ar" || lang === "en") {
      if (lec && lec >= 1 && lec <= ANZI_LECTURE_COUNT[lang]) {
        setStage({ s: "lecture", lang, n: lec });
      } else {
        setStage({ s: "lectures", lang });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const back = () => {
    setStage((cur) => {
      switch (cur.s) {
        case "language": return cur;
        case "lectures": return { s: "language" };
        case "lecture": return { s: "lectures", lang: cur.lang };
      }
    });
  };

  const lang: AnziLang = stage.s === "language" ? "ar" : (stage as any).lang;
  const isRTL = lang === "ar";
  const tr = {
    ar: {
      pickLang: "اختر لغة المنهج",
      arabic: "المنهج العربي",
      english: "المنهج الإنجليزي",
      lectures: "المحاضرات",
      lecture: "محاضرة",
      back: "رجوع",
    },
    en: {
      pickLang: "Choose curriculum language",
      arabic: "Arabic curriculum",
      english: "English curriculum",
      lectures: "Lectures",
      lecture: "Lecture",
      back: "Back",
    },
  }[lang];

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      dir={isRTL ? "rtl" : "ltr"}
    >
      <header className="mb-8">
        <div className="flex items-center gap-4">
          <img
            src={teacher.photo}
            alt={teacher.nameEn}
            className="w-16 h-16 rounded-2xl object-cover border border-primary/30"
          />
          <div>
            <p className="text-[11px] uppercase tracking-[0.25em] text-primary">Biology</p>
            <h1 className="text-2xl md:text-3xl font-bold text-foreground">
              {isRTL ? teacher.nameAr : teacher.nameEn}
            </h1>
          </div>
        </div>
      </header>

      {stage.s !== "language" && (
        <button
          onClick={back}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} /> {tr.back}
        </button>
      )}

      {stage.s === "language" && (
        <section>
          <h2 className="text-xl font-bold mb-4">{tr.pickLang}</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            {(["ar", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => setStage({ s: "lectures", lang: l })}
                className="p-6 rounded-3xl border border-primary/40 bg-secondary/40 hover:border-primary hover:-translate-y-0.5 transition-all text-start"
                dir={l === "ar" ? "rtl" : "ltr"}
              >
                <p className="text-[11px] uppercase tracking-[0.25em] text-primary mb-2">
                  {l === "ar" ? "العربية" : "English"}
                </p>
                <h3 className="text-2xl font-bold">
                  {l === "ar" ? "المنهج العربي" : "English curriculum"}
                </h3>
              </button>
            ))}
          </div>
        </section>
      )}

      {stage.s === "lectures" && (
        <section>
          <h2 className="text-xl font-bold mb-4">{tr.lectures}</h2>
          {isAdmin && (
            <div className="mb-6">
              <AnziBulkNotesGenerator
                teacherId={teacher.id}
                lang={stage.lang}
                ch={ANZI_CH}
              />
            </div>
          )}
          <ul className="grid gap-2 sm:grid-cols-2">
            {Array.from({ length: ANZI_LECTURE_COUNT[stage.lang] }, (_, i) => i + 1).map((n) => (
              <li key={n}>
                <button
                  onClick={() =>
                    setStage({ s: "lecture", lang: stage.lang, n })
                  }
                  className="w-full flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary/40 hover:bg-secondary/50 transition-colors text-start"
                >
                  <span className="font-medium">
                    {tr.lecture} {n}
                  </span>
                  <ChevronRight className="w-4 h-4 text-muted-foreground rtl:rotate-180" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {stage.s === "lecture" && (
        <AnziLectureView
          teacher={teacher}
          lang={stage.lang}
          ch={ANZI_CH}
          n={stage.n}
          isAdmin={isAdmin}
        />
      )}
    </motion.div>
  );
}

function BookOpenIcon() {
  return (
    <span className="w-5 h-5 grid place-items-center text-primary">
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M2 4h7a3 3 0 0 1 3 3v13a2 2 0 0 0-2-2H2z" />
        <path d="M22 4h-7a3 3 0 0 0-3 3v13a2 2 0 0 1 2-2h8z" />
      </svg>
    </span>
  );
}

// ---- Bulk generator: run video-notes for every lecture in the playlist ----
function AnziBulkNotesGenerator({
  teacherId, lang, ch,
}: {
  teacherId: string;
  lang: AnziLang;
  ch: number;
}) {
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number; label: string } | null>(null);
  const [summary, setSummary] = useState<{ created: number; skipped: number; failed: number } | null>(null);
  const label = lang === "ar" ? "توليد ملاحظات لكل المحاضرات" : "Generate notes for all lectures";
  const running = lang === "ar" ? "جاري التوليد" : "Generating";
  const noFetch = lang === "ar" ? "تعذّر جلب قائمة الفيديوهات." : "Could not fetch playlist videos.";

  const run = async () => {
    if (busy) return;
    setBusy(true); setSummary(null); setProgress({ done: 0, total: 0, label: "…" });
    try {
      // Load playlist videos via the edge function (GET with ?list=...).
      const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || "";
      const supaUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
      const base = supaUrl ? `${supaUrl}/functions/v1` : (projectRef ? `https://${projectRef}.functions.supabase.co` : "");
      const res = await fetch(`${base}/youtube-playlist?list=${ANZI_PLAYLISTS[lang]}`, {
        headers: { apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "" },
      });
      const listJson = await res.json();
      const videos: { id: string; title: string }[] = Array.isArray(listJson?.videos) ? listJson.videos : [];
      if (!videos.length) { toast.error(noFetch); return; }

      // 2) Existing rows so we skip lectures that already have a video saved
      const total = Math.min(ANZI_LECTURE_COUNT[lang], videos.length);
      const topicKeys = Array.from({ length: total }, (_, i) => `anzi-${lang}-ch${ch}-lec${i + 1}-study`);
      const { data: existing } = await supabase
        .from("teacher_topic_videos")
        .select("topic_key")
        .eq("teacher_id", teacherId)
        .in("topic_key", topicKeys);
      const already = new Set((existing ?? []).map((r: any) => r.topic_key));

      const { data: u } = await supabase.auth.getUser();
      let created = 0, skipped = 0, failed = 0;
      setProgress({ done: 0, total, label: "…" });

      for (let i = 0; i < total; i++) {
        const n = i + 1;
        const topicKey = topicKeys[i];
        setProgress({ done: i, total, label: `${lang === "ar" ? "المحاضرة" : "Lecture"} ${n}` });
        if (already.has(topicKey)) { skipped++; continue; }
        const v = videos[i];
        const url = `https://www.youtube.com/watch?v=${v.id}`;
        try {
          const { data, error } = await supabase.functions.invoke("video-notes", {
            body: { url, language: lang, mode: "notes" },
          });
          if (error) throw error;
          if (data?.error) throw new Error(data.error);
          const parts = data?.parts?.length
            ? data.parts
            : (data?.notes ? [{ title: v.title || `Lecture ${n}`, notes: data.notes }] : []);
          if (!parts.length) throw new Error("empty");
          const { error: insErr } = await supabase.from("teacher_topic_videos").insert({
            teacher_id: teacherId,
            topic_key: topicKey,
            youtube_url: url,
            video_id: v.id,
            title: v.title || `Lecture ${n}`,
            transcript: data?.transcript || null,
            notes_parts: parts as any,
            approved: true,
            created_by: u.user?.id,
          });
          if (insErr) throw insErr;
          created++;
        } catch (e: any) {
          failed++;
          console.error("bulk gen failed", n, e);
        }
      }
      setProgress({ done: total, total, label: "" });
      setSummary({ created, skipped, failed });
      toast.success(
        lang === "ar"
          ? `تم: ${created} · متخطاة: ${skipped} · فاشلة: ${failed}`
          : `Done: ${created} · Skipped: ${skipped} · Failed: ${failed}`,
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mt-3 p-3 rounded-xl border border-primary/30 bg-primary/5">
      <div className="flex items-center justify-between gap-3">
        <div className="text-xs text-muted-foreground">
          {lang === "ar"
            ? "شغّل مولّد ملاحظات الفيديو لكل المحاضرات دفعة واحدة (يتجاوز أي محاضرة لها ملاحظات مسبقاً)."
            : "Run the video-to-notes generator for every lecture at once (skips lectures that already have notes)."}
        </div>
        <button
          onClick={run}
          disabled={busy}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold disabled:opacity-50 whitespace-nowrap"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
          {busy ? running : label}
        </button>
      </div>
      {progress && progress.total > 0 && (
        <div className="mt-2">
          <div className="h-1.5 w-full rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full bg-primary transition-all"
              style={{ width: `${(progress.done / progress.total) * 100}%` }}
            />
          </div>
          <div className="mt-1 text-[11px] text-muted-foreground">
            {progress.done}/{progress.total} · {progress.label}
          </div>
        </div>
      )}
      {summary && !busy && (
        <div className="mt-2 text-[11px] text-muted-foreground">
          {lang === "ar"
            ? `تم إنشاء ${summary.created} · متخطاة ${summary.skipped} · فاشلة ${summary.failed}`
            : `Created ${summary.created} · Skipped ${summary.skipped} · Failed ${summary.failed}`}
        </div>
      )}
    </div>
  );
}

function AnziLectureView({
  teacher, lang, ch, n, isAdmin,
}: {
  teacher: Teacher;
  lang: AnziLang;
  ch: number;
  n: number;
  isAdmin: boolean;
}) {
  const isRTL = lang === "ar";
  const [tab, setTab] = useState<"notes" | "exam">("notes");
  const topicKey = `anzi-${lang}-ch${ch}-lec${n}-${tab === "notes" ? "study" : "exam"}`;
  const label = lang === "ar" ? `المحاضرة ${n}` : `Lecture ${n}`;
  const playlist = ANZI_PLAYLISTS[lang];
  const L2 = t[lang];

  // MCQ state (exam mode)
  const [sets, setSets] = useState<MCQSet[]>([]);
  const [loading, setLoading] = useState(false);
  const [showGen, setShowGen] = useState(false);
  const [practice, setPractice] = useState<MCQSet | null>(null);

  useEffect(() => {
    if (tab !== "exam") return;
    // marker
    void 0;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("teacher_topic_mcqs")
        .select("id, teacher_id, topic_key, title, questions, created_at")
        .eq("teacher_id", teacher.id)
        .eq("topic_key", topicKey)
        .order("created_at", { ascending: false });
      if (error) toast.error(error.message);
      else setSets((data ?? []) as unknown as MCQSet[]);
      setLoading(false);
    })();
  }, [teacher.id, topicKey, tab]);

  // Resolve the real video for this lecture number (playlist index is unreliable)
  const [videoId, setVideoId] = useState<string | null>(null);
  useEffect(() => {
    let cancelled = false;
    setVideoId(null);
    (async () => {
      try {
        const supaUrl = (import.meta.env.VITE_SUPABASE_URL as string) || "";
        const projectRef = (import.meta.env.VITE_SUPABASE_PROJECT_ID as string) || "";
        const base = supaUrl ? `${supaUrl}/functions/v1` : (projectRef ? `https://${projectRef}.functions.supabase.co` : "");
        if (!base) return;
        const res = await fetch(`${base}/youtube-playlist?list=${playlist}`, {
          headers: { apikey: (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || "" },
        });
        const json = await res.json();
        const videos: { id: string }[] = Array.isArray(json?.videos) ? json.videos : [];
        const v = videos[n - 1];
        if (!cancelled && v?.id) setVideoId(v.id);
      } catch { /* fall back to playlist embed */ }
    })();
    return () => { cancelled = true; };
  }, [playlist, n]);

  return (
    <div dir={isRTL ? "rtl" : "ltr"}>
      <header className="mb-4">
        <p className="text-[11px] uppercase tracking-[0.25em] text-primary">
          {lang === "ar" ? `الفصل ${ch}` : `Chapter ${ch}`}
        </p>
        <h1 className="text-2xl md:text-3xl font-bold text-foreground">{label}</h1>
      </header>

      <div className="aspect-video rounded-2xl overflow-hidden border border-border bg-black mb-6">
        <iframe
          key={videoId || `pl-${n}`}
          className="w-full h-full"
          src={
            videoId
              ? `https://www.youtube.com/embed/${videoId}?rel=0`
              : `https://www.youtube.com/embed/videoseries?list=${playlist}&index=${n}`
          }
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>

      <div className="grid grid-cols-2 gap-2 mb-6">
        {(["notes", "exam"] as const).map((k) => {
          const active = tab === k;
          const label =
            k === "notes"
              ? (lang === "ar" ? "ملاحظات المحاضرة" : "Lecture notes")
              : (lang === "ar" ? "امتحن نفسك" : "Exam yourself");
          return (
            <button
              key={k}
              onClick={() => setTab(k)}
              className={`h-11 rounded-xl border text-sm font-semibold transition-all ${
                active
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-card hover:border-primary/40 hover:bg-secondary/50"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      {tab === "notes" && (
        <TeacherLectureVideos
          teacherId={teacher.id}
          topicKey={topicKey}
          language={lang}
          isAdmin={isAdmin}
        />
      )}

      {tab === "exam" && (
        <div>
          {isAdmin && (
            <div className="mb-6">
              {!showGen ? (
                <button
                  onClick={() => setShowGen(true)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-xl border border-primary/40 bg-primary/10 text-primary text-sm font-semibold hover:bg-primary/20"
                >
                  <Plus className="w-4 h-4" />
                  {L2.generateTitle}
                </button>
              ) : (
                <GeneratorPanel
                  teacher={teacher}
                  topicKey={topicKey}
                  language={lang}
                  L={L2}
                  onCreated={(row) => {
                    setSets((s) => [row, ...s]);
                    setShowGen(false);
                  }}
                  onCancel={() => setShowGen(false)}
                />
              )}
            </div>
          )}

          <h2 className="text-sm uppercase tracking-widest text-muted-foreground mb-3">MCQ sets</h2>
          {loading ? (
            <div className="p-6 text-center text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin inline" />
            </div>
          ) : sets.length === 0 ? (
            <p className="text-sm text-muted-foreground">{L2.noSets}</p>
          ) : (
            <ul className="grid gap-3">
              {sets.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">
                      {s.title || `${s.questions.length} ${L2.questions}`}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {s.questions.length} {L2.questions} · {new Date(s.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  <button
                    onClick={() => setPractice(s)}
                    className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90"
                  >
                    {L2.practice}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {practice && (
            <PracticeModal
              set={practice}
              language={lang}
              L={L2}
              onClose={() => setPractice(null)}
              isAdmin={isAdmin}
              onSetUpdated={(next) => {
                if (next === null) {
                  setSets((arr) => arr.filter((x) => x.id !== practice.id));
                } else {
                  setSets((arr) => arr.map((x) => (x.id === next.id ? next : x)));
                  setPractice(next);
                }
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}