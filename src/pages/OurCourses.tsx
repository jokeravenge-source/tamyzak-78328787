import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dna, FlaskConical, Box, Atom, FileText, ScanLine, Upload, Sparkles, ArrowLeft, Lock, Plus, Trash2, Loader2, X, ShieldCheck, Zap, ArrowRight, ImagePlus, GraduationCap, ExternalLink, Send } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import geneticsImg from "@/assets/course-genetics.jpg";
import organicImg from "@/assets/course-organic.jpg";
import geometryImg from "@/assets/course-geometry.jpg";
import nuclearImg from "@/assets/course-nuclear.jpg";
import laserImg from "@/assets/course-laser.jpg";

type Course = {
  id: string;
  titleAr: string;
  titleEn: string;
  descAr: string;
  descEn: string;
  Icon: React.ComponentType<{ className?: string }>;
  accent: string;
  cover: string;
  active?: boolean;
};

const COURSES: Course[] = [
  {
    id: "genetics",
    titleAr: "علم الوراثة",
    titleEn: "Genetics",
    descAr: "امتحانات مركّزة على الحمض النووي، الطفرات وقوانين الوراثة.",
    descEn: "Focused exams on DNA, mutations and laws of inheritance.",
    Icon: Dna,
    accent: "270 85% 62%",
    cover: geneticsImg,
  },
  {
    id: "organic",
    titleAr: "الكيمياء العضوية",
    titleEn: "Organic Chemistry",
    descAr: "امتحانات على الهيدروكربونات، المجاميع الوظيفية والتفاعلات.",
    descEn: "Exams on hydrocarbons, functional groups and reactions.",
    Icon: FlaskConical,
    accent: "150 75% 45%",
    cover: organicImg,
  },
  {
    id: "space-geometry",
    titleAr: "الهندسة الفضائية",
    titleEn: "Space Geometry",
    descAr: "امتحانات في المستويات، المجسمات والمسافات ثلاثية الأبعاد.",
    descEn: "Exams on planes, solids and 3D distances.",
    Icon: Box,
    accent: "30 95% 55%",
    cover: geometryImg,
  },
  {
    id: "nuclear",
    titleAr: "الفيزياء النووية",
    titleEn: "Nuclear Physics",
    descAr: "امتحانات على النواة، الاضمحلال الإشعاعي، الانشطار والاندماج.",
    descEn: "Exams on the nucleus, radioactive decay, fission and fusion.",
    Icon: Atom,
    accent: "0 85% 62%",
    cover: nuclearImg,
  },
  {
    id: "laser",
    titleAr: "الليزر (فيزياء)",
    titleEn: "Physics: Laser",
    descAr: "امتحانات على الليزر: الانبعاث المحفز، التوزيع المعكوس، المرنان وتطبيقات الليزر.",
    descEn: "Exams on laser: stimulated emission, population inversion, resonators and applications.",
    Icon: Zap,
    accent: "330 90% 60%",
    cover: laserImg,
    active: true,
  },
];

type ExamRow = {
  id: string;
  course_id: string;
  title: string;
  exam_path: string;
  answer_path: string;
  created_at: string;
};

const OurCourses = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";
  const [isAdmin, setIsAdmin] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [examsByCourse, setExamsByCourse] = useState<Record<string, ExamRow[]>>({});
  const [uploadFor, setUploadFor] = useState<Course | null>(null);
  const [manageFor, setManageFor] = useState<Course | null>(null);
  const [openCourse, setOpenCourse] = useState<Course | null>(null);

  const refresh = async () => {
    const { data } = await supabase
      .from("course_exams")
      .select("id, course_id, title, exam_path, answer_path, created_at")
      .order("created_at", { ascending: false });
    const rows = (data ?? []) as ExamRow[];
    const cMap: Record<string, number> = {};
    const byCourse: Record<string, ExamRow[]> = {};
    rows.forEach((r) => {
      cMap[r.course_id] = (cMap[r.course_id] ?? 0) + 1;
      (byCourse[r.course_id] ??= []).push(r);
    });
    setCounts(cMap);
    setExamsByCourse(byCourse);
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data: r } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", user.id)
          .eq("role", "admin")
          .maybeSingle();
        setIsAdmin(!!r);
      }
      refresh();
    })();
  }, []);

  const deleteExam = async (exam: ExamRow) => {
    if (!confirm(isAr ? "حذف هذا الامتحان؟" : "Delete this exam?")) return;
    await supabase.storage.from("course-exams").remove([exam.exam_path, exam.answer_path]);
    const { error } = await supabase.from("course_exams").delete().eq("id", exam.id);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? "تم الحذف" : "Deleted");
    refresh();
  };

  return (
    <main className="min-h-screen bg-background pb-32" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          {isAr ? "رجوع" : "Back"}
        </button>

        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight bg-gradient-to-r from-foreground to-foreground/60 bg-clip-text text-transparent">
            {isAr ? "دوراتنا" : "Our Courses"}
          </h1>
          <p className="mt-2 text-muted-foreground text-sm sm:text-base max-w-2xl">
            {isAr
              ? "دورات مبنية على الامتحانات. حلّ الامتحان على ورقة، صوّرها وارفعها، ونقوم بتصحيحها تلقائياً بتقنية التعرف الضوئي على الحروف (OCR)."
              : "Exam-based courses. Solve on paper, upload a photo of your answers, and we grade them automatically using OCR."}
          </p>

          {/* How it works ribbon */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {[
              { Icon: FileText, ar: "اختر الامتحان", en: "Pick an exam" },
              { Icon: Upload, ar: "ارفع ورقتك", en: "Upload your paper" },
              { Icon: ScanLine, ar: "تصحيح فوري بالـ OCR", en: "Instant OCR grading" },
            ].map((s, i) => (
              <div
                key={i}
                className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-card border border-border/60"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center shrink-0">
                  <s.Icon className="w-4 h-4" />
                </div>
                <span className="text-sm font-medium">{isAr ? s.ar : s.en}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {COURSES.map((c, idx) => {
            const Icon = c.Icon;
            const examCount = counts[c.id] ?? 0;
            return (
              <motion.article
                key={c.id}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: idx * 0.08, ease: [0.22, 1, 0.36, 1] }}
                whileHover={{ y: -4 }}
                className="group relative flex flex-col rounded-2xl bg-card overflow-hidden border border-border/60 transition-all duration-300"
                style={{
                  boxShadow: `0 12px 30px -12px hsl(${c.accent} / 0.35), 0 2px 6px -2px hsl(${c.accent} / 0.15)`,
                }}
              >
                <div
                  className="absolute inset-x-0 top-0 h-1 z-10"
                  style={{ background: `linear-gradient(90deg, hsl(${c.accent}), hsl(${c.accent} / 0.4))` }}
                />

                {/* Cover: photo + dark scrim + coming-soon badge */}
                <div className="relative h-40 overflow-hidden">
                  <img
                    src={c.cover}
                    alt={isAr ? c.titleAr : c.titleEn}
                    loading="lazy"
                    width={1024}
                    height={768}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent" />
                  <div
                    className="absolute inset-0 mix-blend-overlay opacity-40"
                    style={{ background: `linear-gradient(135deg, hsl(${c.accent} / 0.6), transparent 60%)` }}
                  />

                  {/* Icon badge */}
                  <div
                    className={`absolute ${isAr ? "left-3" : "right-3"} top-3 w-11 h-11 rounded-xl flex items-center justify-center backdrop-blur-md bg-white/20 border border-white/40 shadow-lg transition-all duration-300 group-hover:bg-white/35`}
                  >
                    <Icon className="w-5 h-5 text-white drop-shadow" />
                  </div>

                  {/* Coming soon pill */}
                  <div className={`absolute ${isAr ? "right-3" : "left-3"} top-3`}>
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/95 text-foreground shadow-md">
                      <Sparkles className="w-3 h-3 text-primary" />
                      {isAr ? "قريباً" : "Coming soon"}
                    </span>
                  </div>

                  {/* Title on cover */}
                  <div className="absolute inset-x-0 bottom-0 p-4">
                    <h3 className="text-lg font-extrabold leading-tight text-white drop-shadow-lg">
                      {isAr ? c.titleAr : c.titleEn}
                    </h3>
                  </div>
                </div>

                {/* Body */}
                <div className="flex flex-col flex-1 p-4">
                  <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed min-h-[2.5rem]">
                    {isAr ? c.descAr : c.descEn}
                  </p>

                  <div className="flex flex-wrap gap-1.5 mt-3">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                      <FileText className="w-3 h-3" />
                      {examCount} {isAr ? "امتحان" : "exams"}
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-secondary text-secondary-foreground">
                      <ScanLine className="w-3 h-3" />
                      {isAr ? "تصحيح OCR" : "OCR grading"}
                    </span>
                  </div>

                  {c.active ? (
                    <button
                      onClick={() => setOpenCourse(c)}
                      className="mt-5 w-full h-10 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, hsl(${c.accent}), hsl(${c.accent} / 0.75))`,
                        boxShadow: `0 6px 18px -6px hsl(${c.accent} / 0.6)`,
                      }}
                    >
                      <ArrowRight className="w-4 h-4" />
                      {isAr ? "افتح الدورة" : "Open course"}
                    </button>
                  ) : (
                    <button
                      disabled
                      aria-disabled="true"
                      className="mt-5 w-full h-10 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 cursor-not-allowed opacity-90"
                      style={{
                        background: `linear-gradient(135deg, hsl(${c.accent} / 0.55), hsl(${c.accent} / 0.35))`,
                      }}
                    >
                      <Lock className="w-4 h-4" />
                      {isAr ? "قريباً" : "Coming soon"}
                    </button>
                  )}

                  {isAdmin && (
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => setUploadFor(c)}
                        className="h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-primary text-primary-foreground hover:opacity-90 transition"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        {isAr ? "رفع امتحان" : "Add exam"}
                      </button>
                      <button
                        onClick={() => setManageFor(c)}
                        className="h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
                      >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {isAr ? "إدارة" : "Manage"} ({examCount})
                      </button>
                    </div>
                  )}
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>

      {uploadFor && (
        <UploadModal
          course={uploadFor}
          isAr={isAr}
          onClose={() => setUploadFor(null)}
          onDone={() => { setUploadFor(null); refresh(); }}
        />
      )}
      {manageFor && (
        <ManageModal
          course={manageFor}
          isAr={isAr}
          exams={examsByCourse[manageFor.id] ?? []}
          onClose={() => setManageFor(null)}
          onDelete={deleteExam}
        />
      )}
      {openCourse && (
        <CourseRunner
          course={openCourse}
          isAr={isAr}
          exams={examsByCourse[openCourse.id] ?? []}
          onClose={() => setOpenCourse(null)}
        />
      )}
    </main>
  );
};

function UploadModal({
  course,
  isAr,
  onClose,
  onDone,
}: {
  course: Course;
  isAr: boolean;
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [examFile, setExamFile] = useState<File | null>(null);
  const [ansFile, setAnsFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const examRef = useRef<HTMLInputElement>(null);
  const ansRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    if (!title.trim() || !examFile || !ansFile) {
      toast.error(isAr ? "أكمل جميع الحقول" : "Fill all fields");
      return;
    }
    if (examFile.type !== "application/pdf" || ansFile.type !== "application/pdf") {
      toast.error(isAr ? "الملفات يجب أن تكون PDF" : "Files must be PDFs");
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const stamp = Date.now();
      const examPath = `${course.id}/${stamp}-exam.pdf`;
      const ansPath = `${course.id}/${stamp}-answer.pdf`;
      const up1 = await supabase.storage.from("course-exams").upload(examPath, examFile, { contentType: "application/pdf" });
      if (up1.error) throw up1.error;
      const up2 = await supabase.storage.from("course-exams").upload(ansPath, ansFile, { contentType: "application/pdf" });
      if (up2.error) throw up2.error;
      const { error } = await supabase.from("course_exams").insert({
        course_id: course.id,
        title: title.trim(),
        exam_path: examPath,
        answer_path: ansPath,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success(isAr ? "تم رفع الامتحان" : "Exam uploaded");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Upload failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        dir={isAr ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-5"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {isAr ? `رفع امتحان - ${course.titleAr}` : `Add exam - ${course.titleEn}`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <label className="block text-xs font-semibold mb-1">{isAr ? "عنوان الامتحان" : "Exam title"}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={isAr ? "مثال: امتحان الفصل 1" : "e.g. Chapter 1 exam"}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm mb-3"
        />

        <label className="block text-xs font-semibold mb-1">{isAr ? "ملف الامتحان (PDF)" : "Exam PDF"}</label>
        <button
          type="button"
          onClick={() => examRef.current?.click()}
          className="w-full h-10 px-3 rounded-lg border border-dashed border-border bg-background text-sm flex items-center gap-2 mb-3 hover:bg-secondary/40"
        >
          <Upload className="w-4 h-4" />
          <span className="truncate">{examFile?.name ?? (isAr ? "اختر ملف PDF" : "Choose PDF")}</span>
        </button>
        <input ref={examRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setExamFile(e.target.files?.[0] ?? null)} />

        <label className="block text-xs font-semibold mb-1">{isAr ? "ورقة الإجابة الصحيحة (PDF)" : "Answer key PDF"}</label>
        <button
          type="button"
          onClick={() => ansRef.current?.click()}
          className="w-full h-10 px-3 rounded-lg border border-dashed border-border bg-background text-sm flex items-center gap-2 mb-4 hover:bg-secondary/40"
        >
          <Upload className="w-4 h-4" />
          <span className="truncate">{ansFile?.name ?? (isAr ? "اختر ملف PDF" : "Choose PDF")}</span>
        </button>
        <input ref={ansRef} type="file" accept="application/pdf" className="hidden" onChange={(e) => setAnsFile(e.target.files?.[0] ?? null)} />

        <p className="text-[11px] text-muted-foreground mb-3">
          {isAr
            ? "سيستخدم الذكاء الاصطناعي ورقة الإجابة كمرجع لتصحيح أوراق الطلاب تلقائياً."
            : "AI will use the answer key as reference for automatic grading."}
        </p>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isAr ? "رفع" : "Upload"}
        </button>
      </div>
    </div>
  );
}

function ManageModal({
  course,
  isAr,
  exams,
  onClose,
  onDelete,
}: {
  course: Course;
  isAr: boolean;
  exams: ExamRow[];
  onClose: () => void;
  onDelete: (e: ExamRow) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <div
        dir={isAr ? "rtl" : "ltr"}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl p-5 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold">
            {isAr ? `امتحانات ${course.titleAr}` : `${course.titleEn} exams`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        {exams.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            {isAr ? "لا توجد امتحانات بعد" : "No exams yet"}
          </p>
        ) : (
          <ul className="space-y-2">
            {exams.map((e) => (
              <li key={e.id} className="flex items-center gap-2 p-3 rounded-lg border border-border bg-background">
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <span className="flex-1 text-sm font-medium truncate">{e.title}</span>
                <button
                  onClick={() => onDelete(e)}
                  className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center"
                  title={isAr ? "حذف" : "Delete"}
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default OurCourses;

function CourseRunner({
  course,
  isAr,
  exams,
  onClose,
}: {
  course: Course;
  isAr: boolean;
  exams: ExamRow[];
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ExamRow | null>(null);
  const [examUrl, setExamUrl] = useState<string | null>(null);
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [showHumanForm, setShowHumanForm] = useState(false);
  const [tgUsername, setTgUsername] = useState("");
  const [humanReason, setHumanReason] = useState("");
  const [sendingHuman, setSendingHuman] = useState(false);
  const [humanSent, setHumanSent] = useState(false);

  useEffect(() => {
    if (!selected) { setExamUrl(null); return; }
    (async () => {
      const { data } = await supabase.storage.from("course-exams").createSignedUrl(selected.exam_path, 3600);
      setExamUrl(data?.signedUrl ?? null);
    })();
    setStudentImages([]);
    setGradeResult(null);
    setShowHumanForm(false);
    setHumanSent(false);
  }, [selected]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(isAr ? "إحدى الصور كبيرة جداً (الحد 5MB)" : "Image too large (max 5MB)");
        continue;
      }
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const r = new FileReader();
        r.onload = () => resolve(String(r.result));
        r.onerror = () => reject(r.error);
        r.readAsDataURL(file);
      });
      next.push(dataUrl);
    }
    setStudentImages((prev) => [...prev, ...next].slice(0, 10));
  };

  const grade = async () => {
    if (!selected) return;
    if (!studentImages.length) {
      toast.error(isAr ? "ارفع صور ورقتك أولاً" : "Upload photos of your answer first");
      return;
    }
    setGrading(true);
    setGradeResult(null);
    setShowHumanForm(false);
    setHumanSent(false);
    try {
      const { data, error } = await supabase.functions.invoke("grade-course-exam", {
        body: {
          examPath: selected.exam_path,
          answerPath: selected.answer_path,
          studentImages,
          examTitle: selected.title,
          language: isAr ? "ar" : "en",
        },
      });
      if (error) {
        // supabase.functions.invoke throws a generic "non-2xx" error and loses the body.
        // Try to read the real JSON error message from the response.
        let msg = error.message ?? "";
        try {
          const resp = (error as any)?.context?.response;
          if (resp && typeof resp.json === "function") {
            const body = await resp.json();
            if (body?.error) msg = body.error;
          } else if (resp && typeof resp.text === "function") {
            const txt = await resp.text();
            if (txt) msg = txt;
          }
        } catch { /* ignore */ }
        throw new Error(msg || (isAr ? "تعذّر التصحيح" : "Grading failed"));
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setGradeResult(data);
    } catch (e: any) {
      toast.error(e?.message ?? (isAr ? "تعذّر التصحيح" : "Grading failed"));
    } finally {
      setGrading(false);
    }
  };

  const sendToHuman = async () => {
    if (!selected) return;
    const uname = tgUsername.trim().replace(/^@+/, "");
    if (!/^[A-Za-z0-9_]{4,32}$/.test(uname)) {
      toast.error(isAr ? "اسم مستخدم تيليغرام غير صالح" : "Invalid Telegram username");
      return;
    }
    setSendingHuman(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-to-human-grader", {
        body: {
          telegramUsername: uname,
          subject: isAr ? `دورة الليزر - ${course.titleAr}` : `Laser course - ${course.titleEn}`,
          chapter: selected.title,
          studentImages,
          aiScore: gradeResult
            ? `${Math.round(Number(gradeResult.total) || 0)} / ${Number(gradeResult.graded_out_of) || 100}`
            : "",
          reason: humanReason.trim(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setHumanSent(true);
      toast.success(isAr ? "تم الإرسال إلى المدرّس" : "Sent to the human grader");
    } catch (e: any) {
      toast.error(e?.message ?? (isAr ? "تعذّر الإرسال" : "Send failed"));
    } finally {
      setSendingHuman(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={selected ? () => setSelected(null) : onClose}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
          >
            <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            {isAr ? "رجوع" : "Back"}
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mb-6">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 mb-1">
            <Zap className="w-3.5 h-3.5" />
            {isAr ? "دورة" : "Course"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">{isAr ? course.titleAr : course.titleEn}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{isAr ? course.descAr : course.descEn}</p>
        </div>

        {!selected ? (
          exams.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
              {isAr ? "لا توجد امتحانات بعد لهذه الدورة." : "No exams available for this course yet."}
            </div>
          ) : (
            <ul className="space-y-3">
              {exams.map((e) => (
                <li key={e.id} className="rounded-2xl border border-border bg-card p-4 flex flex-wrap items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5" />
                  </div>
                  <div className="flex-1 min-w-[140px]">
                    <div className="font-semibold">{e.title}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(e.created_at).toLocaleDateString(isAr ? "ar" : "en")}
                    </div>
                  </div>
                  <button
                    onClick={() => setSelected(e)}
                    className="h-9 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90"
                  >
                    <GraduationCap className="w-4 h-4" />
                    {isAr ? "حلّ وصحّح" : "Solve & grade"}
                  </button>
                </li>
              ))}
            </ul>
          )
        ) : (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-border">
                <FileText className="w-5 h-5 text-primary shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{selected.title}</div>
                  <div className="text-xs text-muted-foreground">
                    {isAr ? "اقرأ الامتحان أدناه، حلّه على ورقة، ثم ارفع الصور." : "Read the exam below, solve on paper, then upload photos."}
                  </div>
                </div>
                {examUrl && (
                  <button
                    onClick={async () => {
                      try {
                        const { data, error } = await supabase.storage
                          .from("course-exams")
                          .download(selected.exam_path);
                        if (error || !data) throw error ?? new Error("download failed");
                        const url = URL.createObjectURL(data);
                        const a = document.createElement("a");
                        a.href = url;
                        a.download = `${selected.title}.pdf`;
                        document.body.appendChild(a);
                        a.click();
                        a.remove();
                        setTimeout(() => URL.revokeObjectURL(url), 1000);
                      } catch (e: any) {
                        toast.error(e?.message ?? (isAr ? "تعذّر التحميل" : "Download failed"));
                      }
                    }}
                    className="h-9 px-3 rounded-lg border border-border bg-secondary text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-secondary/70"
                  >
                    <ExternalLink className="w-4 h-4" />
                    {isAr ? "تحميل PDF" : "Download PDF"}
                  </button>
                )}
              </div>
              {examUrl ? (
                <object data={examUrl} type="application/pdf" className="w-full h-[70vh] bg-muted">
                  <iframe src={examUrl} title={selected.title} className="w-full h-[70vh]" />
                </object>
              ) : (
                <div className="h-40 flex items-center justify-center text-sm text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  {isAr ? "جاري تحميل الامتحان..." : "Loading exam..."}
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <Upload className="w-5 h-5" />
                </div>
                <div>
                  <div className="font-semibold">{isAr ? "ارفع صور إجابتك" : "Upload your answer photos"}</div>
                  <div className="text-xs text-muted-foreground">{isAr ? "حتى 10 صور، 5MB لكل صورة." : "Up to 10 photos, 5MB each."}</div>
                </div>
              </div>

              {studentImages.length > 0 && (
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {studentImages.map((src, i) => (
                    <div key={i} className="relative group aspect-square rounded-lg overflow-hidden border border-border">
                      <img src={src} alt={`answer ${i + 1}`} className="w-full h-full object-cover" />
                      <button
                        onClick={() => setStudentImages((prev) => prev.filter((_, idx) => idx !== i))}
                        className="absolute top-1 right-1 w-7 h-7 rounded-full bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex flex-col sm:flex-row gap-2">
                <label className="flex-1 h-11 rounded-xl border border-dashed border-border bg-background hover:bg-secondary/40 inline-flex items-center justify-center gap-2 cursor-pointer text-sm font-medium">
                  <ImagePlus className="w-4 h-4" />
                  {isAr ? "إضافة صور" : "Add photos"}
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={(e) => {
                      handleFiles(e.target.files);
                      e.currentTarget.value = "";
                    }}
                  />
                </label>
                <button
                  onClick={grade}
                  disabled={grading}
                  className="flex-1 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90 disabled:opacity-60"
                >
                  {grading ? <Loader2 className="w-4 h-4 animate-spin" /> : <GraduationCap className="w-4 h-4" />}
                  {grading ? (isAr ? "جاري التصحيح..." : "Grading...") : (isAr ? "صحّح إجابتي" : "Grade my answer")}
                </button>
              </div>
            </div>

            {gradeResult && (
              <div className="rounded-2xl border border-border bg-card p-5 space-y-5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-bold">{isAr ? "نتيجة التصحيح" : "Grading result"}</h3>
                  <div className="text-right">
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">{isAr ? "المجموع" : "Total"}</div>
                    <div className="text-3xl font-bold text-primary">
                      {Math.round(Number(gradeResult.total) || 0)} / {Number(gradeResult.graded_out_of) || 100}
                    </div>
                  </div>
                </div>
                {gradeResult.overall_feedback && (
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{gradeResult.overall_feedback}</p>
                )}
                {Array.isArray(gradeResult.per_question) && gradeResult.per_question.length > 0 && (
                  <div className="space-y-2">
                    {gradeResult.per_question.map((q: any) => (
                      <div key={q.n} className="rounded-xl border border-border bg-background p-3">
                        <div className="flex items-center justify-between mb-1">
                          <div className="font-semibold">{isAr ? `س${q.n}` : `Q${q.n}`}</div>
                          <div className="text-sm font-mono text-primary">{Math.round(Number(q.score) || 0)} / 20</div>
                        </div>
                        {q.feedback && <p className="text-sm whitespace-pre-wrap">{q.feedback}</p>}
                        {q.corrections && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{q.corrections}</p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg bg-amber-400/20 text-amber-500 flex items-center justify-center shrink-0">
                      <Sparkles className="w-4 h-4" />
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{isAr ? "غير راضٍ عن التصحيح؟" : "Not satisfied with the AI grading?"}</div>
                      <div className="text-xs text-muted-foreground">{isAr ? "أرسل ورقتك لمدرّس حقيقي عبر تيليغرام." : "Send your paper to a real teacher via Telegram."}</div>
                    </div>
                    {!showHumanForm && !humanSent && (
                      <button
                        onClick={() => setShowHumanForm(true)}
                        className="h-9 px-3 rounded-lg text-xs font-semibold bg-amber-400 text-black hover:bg-amber-300"
                      >
                        {isAr ? "أرسل لمدرّس" : "Send to teacher"}
                      </button>
                    )}
                  </div>

                  {showHumanForm && !humanSent && (
                    <div className="mt-4 space-y-3">
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {isAr ? "اسم مستخدم تيليغرام (بدون @)" : "Telegram username (without @)"}
                        </label>
                        <div className="flex items-center gap-2">
                          <span className="text-muted-foreground text-sm">@</span>
                          <input
                            value={tgUsername}
                            onChange={(e) => setTgUsername(e.target.value)}
                            placeholder="ali_2007"
                            maxLength={32}
                            dir="ltr"
                            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {isAr ? "ملاحظة اختيارية" : "Optional note"}
                        </label>
                        <Textarea
                          value={humanReason}
                          onChange={(e) => setHumanReason(e.target.value)}
                          maxLength={500}
                          className="min-h-[70px] rounded-lg text-sm"
                          dir={isAr ? "rtl" : "ltr"}
                        />
                      </div>
                      <button
                        onClick={sendToHuman}
                        disabled={sendingHuman}
                        className="w-full h-11 rounded-xl bg-amber-400 text-black font-semibold hover:bg-amber-300 inline-flex items-center justify-center gap-2 disabled:opacity-60"
                      >
                        {sendingHuman ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                        {sendingHuman ? (isAr ? "جاري الإرسال..." : "Sending...") : (isAr ? "إرسال" : "Send")}
                      </button>
                    </div>
                  )}

                  {humanSent && (
                    <div className="mt-3 text-sm text-emerald-500">
                      ✓ {isAr ? "تم الإرسال. سيتواصل معك المدرّس عبر تيليغرام." : "Sent. The teacher will contact you on Telegram."}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}