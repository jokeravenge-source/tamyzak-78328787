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