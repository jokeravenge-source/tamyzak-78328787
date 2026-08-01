import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Dna, FlaskConical, Sigma, Atom, FileText, ScanLine, Upload, Sparkles, ArrowLeft, Lock, Plus, Trash2, Loader2, X, ShieldCheck, Zap, ArrowRight, ImagePlus, GraduationCap, ExternalLink, Send, Youtube, ListVideo, Video, BookOpen, Languages, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import ExamPlanPanel from "@/components/ExamPlanPanel";
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
  fixedPlaylistId?: string;
  hasLectures?: boolean;
};

const COURSES: Course[] = [
  {
    id: "math",
    titleAr: "الرياضيات",
    titleEn: "Math",
    descAr: "امتحانات شاملة في الرياضيات: التفاضل، التكامل والهندسة.",
    descEn: "Comprehensive math exams: calculus, integration and geometry.",
    Icon: Sigma,
    accent: "220 85% 60%",
    cover: geometryImg,
    active: true,
  },
  {
    id: "physics",
    titleAr: "الفيزياء",
    titleEn: "Physics",
    descAr: "امتحانات في الفيزياء تغطي جميع الفصول الوزارية.",
    descEn: "Physics exams covering all ministerial chapters.",
    Icon: Atom,
    accent: "0 85% 62%",
    cover: nuclearImg,
    active: true,
    hasLectures: true,
  },
  {
    id: "chemistry",
    titleAr: "الكيمياء",
    titleEn: "Chemistry",
    descAr: "امتحانات في الكيمياء العضوية واللاعضوية.",
    descEn: "Organic and inorganic chemistry exams.",
    Icon: FlaskConical,
    accent: "150 75% 45%",
    cover: organicImg,
    active: true,
  },
  {
    id: "biology",
    titleAr: "الأحياء",
    titleEn: "Biology",
    descAr: "امتحانات في الأحياء: الخلية، الأنسجة والوراثة.",
    descEn: "Biology exams: cell, tissues and genetics.",
    Icon: Dna,
    accent: "270 85% 62%",
    cover: geneticsImg,
    active: true,
  },
];

type ExamRow = {
  id: string;
  course_id: string;
  title: string;
  exam_path: string;
  created_at: string;
  chapter: string;
};

type PlaylistRow = {
  id: string;
  course_id: string;
  title: string;
  playlist_id: string | null;
  kind?: "playlist" | "video";
  video_id?: string | null;
  created_at: string;
};

function extractPlaylistId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^(PL|UU|LL|FL|RD|OL)[A-Za-z0-9_-]{10,}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    const list = u.searchParams.get("list");
    if (list && /^[A-Za-z0-9_-]{10,}$/.test(list)) return list;
  } catch { /* */ }
  return null;
}

function extractVideoId(input: string): string | null {
  const s = input.trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s.startsWith("http") ? s : `https://${s}`);
    if (u.hostname.includes("youtu.be")) {
      const id = u.pathname.slice(1);
      if (/^[A-Za-z0-9_-]{11}$/.test(id)) return id;
    }
    const v = u.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const m = u.pathname.match(/\/(embed|shorts|live)\/([A-Za-z0-9_-]{11})/);
    if (m) return m[2];
  } catch { /* */ }
  return null;
}

const embedSrc = (pl: PlaylistRow): string =>
  pl.kind === "video" && pl.video_id
    ? `https://www.youtube-nocookie.com/embed/${encodeURIComponent(pl.video_id)}?rel=0&modestbranding=1`
    : `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(pl.playlist_id ?? "")}&rel=0&modestbranding=1`;

const OurCourses = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";
  const [isAdmin, setIsAdmin] = useState(false);
  const [counts, setCounts] = useState<Record<string, number>>({});
  const [examsByCourse, setExamsByCourse] = useState<Record<string, ExamRow[]>>({});
  const [uploadFor, setUploadFor] = useState<Course | null>(null);
  const [manageFor, setManageFor] = useState<Course | null>(null);
  const [openCourse, setOpenCourse] = useState<Course | null>(null);
  const [playlistsByCourse, setPlaylistsByCourse] = useState<Record<string, PlaylistRow[]>>({});
  const [addPlaylistFor, setAddPlaylistFor] = useState<Course | null>(null);
  const [openPlaylist, setOpenPlaylist] = useState<Course | null>(null);
  const [openPhysicsHub, setOpenPhysicsHub] = useState<Course | null>(null);
  const [openLectures, setOpenLectures] = useState<Course | null>(null);
  const [planActive, setPlanActive] = useState(true);

  const refresh = async () => {
    const { data } = await supabase
      .from("course_exams")
      .select("id, course_id, title, exam_path, created_at, chapter")
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
    const { data: pls } = await (supabase as any)
      .from("course_playlists")
      .select("id, course_id, title, playlist_id, kind, video_id, created_at")
      .order("created_at", { ascending: false });
    const plMap: Record<string, PlaylistRow[]> = {};
    ((pls ?? []) as PlaylistRow[]).forEach((p) => {
      (plMap[p.course_id] ??= []).push(p);
    });
    setPlaylistsByCourse(plMap);
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

  // Scroll to top whenever the user opens a subject / sub-view
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "auto" });
    document.documentElement.scrollTop = 0;
    document.body.scrollTop = 0;
  }, [openCourse, openPhysicsHub, openLectures, openPlaylist]);

  const deleteExam = async (exam: ExamRow) => {
    if (!confirm(isAr ? "حذف هذا الامتحان؟" : "Delete this exam?")) return;
    await supabase.storage.from("course-exams").remove([exam.exam_path, exam.answer_path]);
    const { error } = await supabase.from("course_exams").delete().eq("id", exam.id);
    if (error) { toast.error(error.message); return; }
    toast.success(isAr ? "تم الحذف" : "Deleted");
    refresh();
  };

  const deletePlaylist = async (pl: PlaylistRow) => {
    if (!confirm(isAr ? "حذف هذا العنصر؟" : "Delete this item?")) return;
    const { error } = await (supabase as any).from("course_playlists").delete().eq("id", pl.id);
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

        <ExamPlanPanel
          language={language}
          subjects={COURSES.map((c) => ({ id: c.id, titleAr: c.titleAr, titleEn: c.titleEn }))}
          onPlanStatus={setPlanActive}
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {COURSES.map((c, idx) => {
            const Icon = c.Icon;
            const examCount = counts[c.id] ?? 0;
            const isReady = !!c.fixedPlaylistId || !!c.hasLectures || examCount > 0;
            const handleStart = () => {
              if (!planActive) {
                toast.error(
                  isAr
                    ? "عذراً، لا يمكنك دخول امتحان الآن. الرجاء وضع خطتك للأيام الـ 5 القادمة."
                    : "Oops, you can't take an exam right now. Please make your plan for the next 5 days.",
                );
                window.scrollTo({ top: 0, behavior: "smooth" });
                return;
              }
              if (c.fixedPlaylistId) setOpenPlaylist(c);
              else if (c.hasLectures) setOpenPhysicsHub(c);
              else setOpenCourse(c);
            };
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

                  {!isReady && (
                    <div className={`absolute ${isAr ? "right-3" : "left-3"} top-3`}>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-white/95 text-foreground shadow-md">
                        <Sparkles className="w-3 h-3 text-primary" />
                        {isAr ? "قريباً" : "Coming soon"}
                      </span>
                    </div>
                  )}

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

                  {isReady ? (
                    <button
                      onClick={handleStart}
                      className="mt-5 w-full h-10 rounded-xl text-sm font-bold text-white inline-flex items-center justify-center gap-2 transition-transform hover:scale-[1.02]"
                      style={{
                        background: `linear-gradient(135deg, hsl(${c.accent}), hsl(${c.accent} / 0.75))`,
                        boxShadow: `0 6px 18px -6px hsl(${c.accent} / 0.6)`,
                      }}
                    >
                      <ArrowRight className="w-4 h-4" />
                      {isAr ? "ابدأ" : "Start"}
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
                    <div className="mt-2 grid grid-cols-3 gap-2">
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
                      <button
                        onClick={() => setAddPlaylistFor(c)}
                        className="h-9 rounded-lg text-xs font-bold inline-flex items-center justify-center gap-1.5 bg-secondary text-secondary-foreground hover:bg-secondary/80 transition"
                        title={isAr ? "إضافة قائمة تشغيل" : "Add YouTube playlist"}
                      >
                        <Youtube className="w-3.5 h-3.5 text-[#ff0033]" />
                        {isAr ? "قائمة" : "Playlist"}
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
          existingChapters={Array.from(new Set((examsByCourse[uploadFor.id] ?? []).map((e) => e.chapter).filter(Boolean)))}
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
          playlists={playlistsByCourse[openCourse.id] ?? []}
          isAdmin={isAdmin}
          onDeletePlaylist={deletePlaylist}
          onClose={() => setOpenCourse(null)}
        />
      )}
      {addPlaylistFor && (
        <AddPlaylistModal
          course={addPlaylistFor}
          isAr={isAr}
          onClose={() => setAddPlaylistFor(null)}
          onDone={() => { setAddPlaylistFor(null); refresh(); }}
        />
      )}
      {openPlaylist && (
        <PlaylistOnlyModal
          course={openPlaylist}
          playlistId={openPlaylist.fixedPlaylistId!}
          isAr={isAr}
          onClose={() => setOpenPlaylist(null)}
        />
      )}
      {openPhysicsHub && (
        <PhysicsHub
          course={openPhysicsHub}
          isAr={isAr}
          examCount={counts[openPhysicsHub.id] ?? 0}
          onClose={() => setOpenPhysicsHub(null)}
          onExams={() => { const c = openPhysicsHub; setOpenPhysicsHub(null); setOpenCourse(c); }}
          onLectures={() => { const c = openPhysicsHub; setOpenPhysicsHub(null); setOpenLectures(c); }}
        />
      )}
      {openLectures && (
        <PhysicsLecturesModal
          course={openLectures}
          isAr={isAr}
          playlists={playlistsByCourse[openLectures.id] ?? []}
          isAdmin={isAdmin}
          onDeletePlaylist={deletePlaylist}
          onClose={() => setOpenLectures(null)}
        />
      )}
    </main>
  );
};

function UploadModal({
  course,
  isAr,
  existingChapters,
  onClose,
  onDone,
}: {
  course: Course;
  isAr: boolean;
  existingChapters: string[];
  onClose: () => void;
  onDone: () => void;
}) {
  const [title, setTitle] = useState("");
  const [chapter, setChapter] = useState<string>(existingChapters[0] ?? "");
  const [newChapter, setNewChapter] = useState("");
  const [examFile, setExamFile] = useState<File | null>(null);
  const [ansFile, setAnsFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const examRef = useRef<HTMLInputElement>(null);
  const ansRef = useRef<HTMLInputElement>(null);

  const submit = async () => {
    const chapterFinal = (newChapter.trim() || chapter.trim() || "General");
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
        chapter: chapterFinal,
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

        <label className="block text-xs font-semibold mb-1">{isAr ? "الفصل" : "Chapter"}</label>
        {existingChapters.length > 0 && (
          <select
            value={chapter}
            onChange={(e) => setChapter(e.target.value)}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm mb-2"
          >
            {existingChapters.map((ch) => (
              <option key={ch} value={ch}>{ch}</option>
            ))}
          </select>
        )}
        <input
          value={newChapter}
          onChange={(e) => setNewChapter(e.target.value)}
          maxLength={80}
          placeholder={isAr ? "أو أضف فصلاً جديداً" : "Or add a new chapter"}
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
          <div className="space-y-4">
            {Array.from(new Set(exams.map((e) => e.chapter || "General"))).map((ch) => (
              <div key={ch}>
                <div className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-2">{ch}</div>
                <ul className="space-y-2">
                  {exams.filter((e) => (e.chapter || "General") === ch).map((e) => (
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default OurCourses;

function PlaylistOnlyModal({
  course,
  playlistId,
  isAr,
  onClose,
}: {
  course: Course;
  playlistId: string;
  isAr: boolean;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
            className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary"
          >
            <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
            {isAr ? "رجوع" : "Back"}
          </button>
          <button onClick={onClose} className="w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="mb-4">
          <div className="inline-flex items-center gap-2 text-xs uppercase tracking-widest text-primary/80 mb-1">
            <ListVideo className="w-3.5 h-3.5" />
            {isAr ? "منهج" : "Curriculum"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">{isAr ? course.titleAr : course.titleEn}</h1>
          <p className="mt-1 text-muted-foreground text-sm">{isAr ? course.descAr : course.descEn}</p>
        </div>
        <div className="rounded-2xl border border-border bg-card overflow-hidden">
          <div className="aspect-video bg-black">
            <iframe
              src={`https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&rel=0&modestbranding=1`}
              title={course.titleEn}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              referrerPolicy="strict-origin-when-cross-origin"
              className="w-full h-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}

function PhysicsHub({
  course,
  isAr,
  examCount,
  onExams,
  onLectures,
  onClose,
}: {
  course: Course;
  isAr: boolean;
  examCount: number;
  onExams: () => void;
  onLectures: () => void;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={onClose}
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
          <p className="mt-1 text-muted-foreground text-sm">
            {isAr ? "اختر ما تريد أن تبدأ به." : "Choose what you want to start with."}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <button
            onClick={onExams}
            disabled={examCount === 0}
            className="group relative rounded-2xl border border-border bg-card p-6 text-left hover:-translate-y-1 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ boxShadow: `0 12px 30px -12px hsl(${course.accent} / 0.4)` }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold mb-1">{isAr ? "الامتحانات" : "Exams"}</h3>
            <p className="text-sm text-muted-foreground">
              {examCount > 0
                ? (isAr ? `${examCount} امتحان متاح للحل والتصحيح.` : `${examCount} exams available with OCR grading.`)
                : (isAr ? "لا توجد امتحانات بعد." : "No exams available yet.")}
            </p>
            <ArrowRight className={`absolute bottom-4 ${isAr ? "left-4 rotate-180" : "right-4"} w-5 h-5 text-primary group-hover:translate-x-1 transition-transform`} />
          </button>
          <button
            onClick={onLectures}
            className="group relative rounded-2xl border border-border bg-card p-6 text-left hover:-translate-y-1 transition-all"
            style={{ boxShadow: `0 12px 30px -12px hsl(${course.accent} / 0.4)` }}
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-3">
              <Video className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-extrabold mb-1">{isAr ? "المحاضرات" : "Lectures"}</h3>
            <p className="text-sm text-muted-foreground">
              {isAr ? "محاضرات مصوّرة مقسّمة حسب الفصول." : "Video lectures organized by chapter."}
            </p>
            <ArrowRight className={`absolute bottom-4 ${isAr ? "left-4 rotate-180" : "right-4"} w-5 h-5 text-primary group-hover:translate-x-1 transition-transform`} />
          </button>
        </div>
      </div>
    </div>
  );
}

function PhysicsLecturesModal({
  course,
  isAr,
  playlists,
  isAdmin,
  onDeletePlaylist,
  onClose,
}: {
  course: Course;
  isAr: boolean;
  playlists: PlaylistRow[];
  isAdmin?: boolean;
  onDeletePlaylist?: (pl: PlaylistRow) => void;
  onClose: () => void;
}) {
  const chapters: { n: number; titleAr: string; titleEn: string; locked: boolean }[] = [
    { n: 7, titleAr: "الفصل السابع", titleEn: "Chapter 7", locked: false },
    { n: 8, titleAr: "الفصل الثامن", titleEn: "Chapter 8", locked: true },
    { n: 9, titleAr: "الفصل التاسع", titleEn: "Chapter 9", locked: true },
  ];
  const [openChapter, setOpenChapter] = useState<number | null>(null);
  return (
    <div className="fixed inset-0 z-50 bg-background overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={openChapter ? () => setOpenChapter(null) : onClose}
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
            <Video className="w-3.5 h-3.5" />
            {isAr ? "محاضرات" : "Lectures"}
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold">{isAr ? course.titleAr : course.titleEn}</h1>
        </div>
        {openChapter === null ? (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {chapters.map((ch) => (
              <button
                key={ch.n}
                onClick={() => !ch.locked && setOpenChapter(ch.n)}
                disabled={ch.locked}
                className={`relative rounded-2xl border p-6 text-left transition-all ${
                  ch.locked
                    ? "border-border bg-secondary/40 opacity-70 cursor-not-allowed"
                    : "border-border bg-card hover:-translate-y-1 cursor-pointer"
                }`}
              >
                <div className="text-5xl font-extrabold font-mono opacity-70 mb-3">
                  {String(ch.n).padStart(2, "0")}
                </div>
                <div className="text-lg font-bold mb-1">{isAr ? ch.titleAr : ch.titleEn}</div>
                {ch.locked ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-muted-foreground">
                    <Lock className="w-3.5 h-3.5" />
                    {isAr ? "قريباً" : "Coming soon"}
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                    <ArrowRight className={`w-3.5 h-3.5 ${isAr ? "rotate-180" : ""}`} />
                    {isAr ? "افتح" : "Open"}
                  </span>
                )}
              </button>
            ))}
          </div>
        ) : (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center">
                <Video className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-extrabold">
                {isAr ? `الفصل ${openChapter}` : `Chapter ${openChapter}`}
              </h3>
            </div>
            {playlists.length === 0 ? (
              <div className="rounded-2xl border border-border bg-card p-6 text-center text-sm text-muted-foreground">
                {isAr
                  ? "سيتم إضافة محاضرات هذا الفصل قريباً."
                  : "Lectures for this chapter will be added soon."}
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {playlists.map((pl) => (
                  <div key={pl.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="px-4 py-3 border-b border-border flex items-center gap-2">
                      <div className="font-bold text-sm flex-1 min-w-0 truncate">{pl.title}</div>
                      {isAdmin && onDeletePlaylist && (
                        <button
                          onClick={() => onDeletePlaylist(pl)}
                          className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center shrink-0"
                          title={isAr ? "حذف" : "Delete"}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    <div className="aspect-video w-full bg-black">
                      <iframe
                        className="w-full h-full"
                        src={embedSrc(pl)}
                        title={pl.title}
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function AddPlaylistModal({
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
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [kind, setKind] = useState<"playlist" | "video">("playlist");

  const submit = async () => {
    const pl = kind === "playlist" ? extractPlaylistId(url) : null;
    const vid = kind === "video" ? extractVideoId(url) : null;
    if (!title.trim() || (kind === "playlist" ? !pl : !vid)) {
      toast.error(
        isAr
          ? kind === "playlist" ? "أدخل عنواناً ورابط قائمة تشغيل صحيح" : "أدخل عنواناً ورابط محاضرة يوتيوب صحيح"
          : kind === "playlist" ? "Enter a title and a valid playlist URL" : "Enter a title and a valid YouTube video URL",
      );
      return;
    }
    setBusy(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      const { error } = await (supabase as any).from("course_playlists").insert({
        course_id: course.id,
        title: title.trim(),
        kind,
        playlist_id: pl,
        video_id: vid,
        created_by: user.id,
      });
      if (error) throw error;
      toast.success(isAr ? "تمت الإضافة" : "Added");
      onDone();
    } catch (e: any) {
      toast.error(e.message ?? "Failed");
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
          <h3 className="text-lg font-bold inline-flex items-center gap-2">
            <Youtube className="w-5 h-5 text-[#ff0033]" />
            {isAr ? `إضافة محتوى - ${course.titleAr}` : `Add content - ${course.titleEn}`}
          </h3>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-secondary flex items-center justify-center">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2 mb-4">
          {(["playlist", "video"] as const).map((k) => (
            <button
              key={k}
              onClick={() => setKind(k)}
              className={`h-9 rounded-lg border text-xs font-semibold transition-colors ${kind === k ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}
            >
              {k === "playlist" ? (isAr ? "قائمة تشغيل" : "Playlist") : (isAr ? "محاضرة واحدة" : "Single lecture")}
            </button>
          ))}
        </div>

        <label className="block text-xs font-semibold mb-1">{isAr ? "العنوان" : "Title"}</label>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={120}
          placeholder={isAr ? "مثال: محاضرات الفصل 1" : "e.g. Chapter 1 lectures"}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm mb-3"
        />

        <label className="block text-xs font-semibold mb-1">
          {kind === "playlist"
            ? (isAr ? "رابط قائمة تشغيل يوتيوب" : "YouTube playlist URL")
            : (isAr ? "رابط محاضرة يوتيوب" : "YouTube video URL")}
        </label>
        <input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={kind === "playlist" ? "https://youtube.com/playlist?list=PL..." : "https://youtu.be/xxxxxxxxxxx"}
          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm mb-2"
          dir="ltr"
        />
        <p className="text-[11px] text-muted-foreground mb-4">
          {isAr
            ? kind === "playlist" ? "ألصق رابط قائمة تشغيل يوتيوب أو معرّف القائمة (مثال: PLxxxxxx)." : "ألصق رابط فيديو يوتيوب أو معرّف الفيديو."
            : kind === "playlist" ? "Paste a YouTube playlist URL or ID (e.g. PLxxxxxx)." : "Paste a YouTube video URL or video ID."}
        </p>

        <button
          onClick={submit}
          disabled={busy}
          className="w-full h-10 rounded-xl bg-primary text-primary-foreground font-bold text-sm inline-flex items-center justify-center gap-2 disabled:opacity-60"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
          {isAr ? "إضافة" : "Add"}
        </button>
      </div>
    </div>
  );
}

function CourseRunner({
  course,
  isAr,
  exams,
  playlists,
  isAdmin,
  onDeletePlaylist,
  onClose,
}: {
  course: Course;
  isAr: boolean;
  exams: ExamRow[];
  playlists: PlaylistRow[];
  isAdmin: boolean;
  onDeletePlaylist: (pl: PlaylistRow) => void;
  onClose: () => void;
}) {
  const [selected, setSelected] = useState<ExamRow | null>(null);
  const [examUrl, setExamUrl] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Record<string, { score: number | null; out_of: number | null }>>({});
  const [studentImages, setStudentImages] = useState<string[]>([]);
  const [grading, setGrading] = useState(false);
  const [gradeResult, setGradeResult] = useState<any>(null);
  const [showHumanForm, setShowHumanForm] = useState(false);
  const [tgUsername, setTgUsername] = useState("");
  const [humanReason, setHumanReason] = useState("");
  const [sendingHuman, setSendingHuman] = useState(false);
  const [humanSent, setHumanSent] = useState(false);
  const [routedSubject, setRoutedSubject] = useState<string>("");
  const [groupOverride, setGroupOverride] = useState<"physics" | "chemistry" | "biology" | "math" | "">("");

  const prepareImageForGrading = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const original = String(reader.result);
      const img = new Image();
      img.onload = () => {
        const maxSide = 1600;
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const width = Math.max(1, Math.round(img.width * scale));
        const height = Math.max(1, Math.round(img.height * scale));
        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) { resolve(original); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.78) || original);
      };
      img.onerror = () => resolve(original);
      img.src = original;
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });

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

  // Which exams of this course the student already finished.
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await (supabase as any)
        .from("course_exam_completions")
        .select("exam_id, score, graded_out_of")
        .eq("user_id", user.id);
      const map: Record<string, { score: number | null; out_of: number | null }> = {};
      ((data ?? []) as any[]).forEach((r) => {
        map[r.exam_id] = { score: r.score === null ? null : Number(r.score), out_of: r.graded_out_of === null ? null : Number(r.graded_out_of) };
      });
      setCompleted(map);
    })();
  }, [course.id]);

  const handleFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    const next: string[] = [];
    for (const file of Array.from(files).slice(0, 10)) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error(isAr ? "إحدى الصور كبيرة جداً (الحد 5MB)" : "Image too large (max 5MB)");
        continue;
      }
      const dataUrl = await prepareImageForGrading(file);
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
        // Prefer the function's real JSON error over the generic "non-2xx" wrapper.
        let msg = error.message ?? "";
        try {
          const resp = (error as any)?.context?.response ?? (error as any)?.context;
          if (resp && typeof resp.json === "function") {
            const body = await resp.json();
            if (body?.error) msg = body.error;
          } else if (resp && typeof resp.text === "function") {
            const txt = await resp.text();
            if (txt) msg = txt;
          }
        } catch { /* ignore */ }
        const fallback = isAr
          ? "تعذّر استلام نتيجة التصحيح. جرّب صوراً أوضح أو عدداً أقل من الصور."
          : "Couldn't receive the grading result. Try clearer photos or fewer photos.";
        throw new Error(/non-2xx/i.test(msg) ? fallback : (msg || fallback));
      }
      if ((data as any)?.error) throw new Error((data as any).error);
      setGradeResult(data);
      // Mark this exam as completed so the student can tell it apart next time.
      const score = Number((data as any)?.total);
      const outOf = Number((data as any)?.graded_out_of) || 100;
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await (supabase as any).from("course_exam_completions").upsert(
          {
            user_id: user.id,
            exam_id: selected.id,
            course_id: course.id,
            score: Number.isFinite(score) ? score : null,
            graded_out_of: outOf,
            completed_at: new Date().toISOString(),
          },
          { onConflict: "user_id,exam_id" },
        );
        setCompleted((p) => ({ ...p, [selected.id]: { score: Number.isFinite(score) ? score : null, out_of: outOf } }));
      }
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
          subjectCode: groupOverride || course.id,
          chapter: selected.title,
          studentImages,
          answerBucket: "course-exams",
          answerPath: selected.answer_path,
          answerFilename: `${selected.title} - answer`,
          aiScore: gradeResult
            ? `${Math.round(Number(gradeResult.total) || 0)} / ${Number(gradeResult.graded_out_of) || 100}`
            : "",
          reason: humanReason.trim(),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setHumanSent(true);
      setRoutedSubject((data as any)?.routed ? String((data as any)?.subjectCode ?? "") : "");
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
          <>
            {playlists.length > 0 && (
              <section className="mb-8">
                <h2 className="text-sm font-bold uppercase tracking-widest text-primary/80 mb-3 border-b border-border pb-2 flex items-center gap-2">
                  <ListVideo className="w-4 h-4" />
                  {isAr ? "الفيديوهات وقوائم التشغيل" : "Videos & playlists"}
                </h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {playlists.map((pl) => (
                    <div key={pl.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                      <div className="flex items-center gap-2 p-3 border-b border-border">
                        <Youtube className="w-4 h-4 text-[#ff0033] shrink-0" />
                        <div className="flex-1 min-w-0 font-semibold text-sm truncate">{pl.title}</div>
                        {isAdmin && (
                          <button
                            onClick={() => onDeletePlaylist(pl)}
                            className="w-8 h-8 rounded-lg hover:bg-destructive/10 text-destructive flex items-center justify-center"
                            title={isAr ? "حذف" : "Delete"}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                      <div className="aspect-video bg-black">
                        <iframe
                          src={embedSrc(pl)}
                          title={pl.title}
                          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                          allowFullScreen
                          referrerPolicy="strict-origin-when-cross-origin"
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
            {exams.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card p-10 text-center text-muted-foreground">
              {isAr ? "لا توجد امتحانات بعد لهذه الدورة." : "No exams available for this course yet."}
            </div>
          ) : (
            <div className="space-y-6">
              {Array.from(new Set(exams.map((e) => e.chapter || "General"))).map((ch) => (
                <section key={ch}>
                  <h2 className="text-sm font-bold uppercase tracking-widest text-primary/80 mb-3 border-b border-border pb-2">
                    {ch}
                  </h2>
                  <ul className="space-y-3">
                    {exams.filter((e) => (e.chapter || "General") === ch).map((e) => (
                      <li key={e.id} className={`rounded-2xl border p-4 flex flex-wrap items-center gap-3 ${completed[e.id] ? "border-primary/40 bg-primary/5" : "border-border bg-card"}`}>
                        <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                          {completed[e.id] ? <CheckCircle2 className="w-5 h-5" /> : <FileText className="w-5 h-5" />}
                        </div>
                        <div className="flex-1 min-w-[140px]">
                          <div className="font-semibold flex items-center gap-2 flex-wrap">
                            {e.title}
                            {completed[e.id] && (
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/15 text-primary">
                                {isAr ? "مكتمل" : "Completed"}
                                {completed[e.id].score !== null ? ` · ${Math.round(completed[e.id].score as number)}/${completed[e.id].out_of ?? 100}` : ""}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-muted-foreground">
                            {new Date(e.created_at).toLocaleDateString(isAr ? "ar" : "en")}
                          </div>
                        </div>
                        <button
                          onClick={() => setSelected(e)}
                          className={`h-9 px-4 rounded-lg text-sm font-semibold inline-flex items-center gap-2 hover:opacity-90 ${completed[e.id] ? "border border-border bg-card" : "bg-primary text-primary-foreground"}`}
                        >
                          <GraduationCap className="w-4 h-4" />
                          {completed[e.id] ? (isAr ? "إعادة الحل" : "Retake") : (isAr ? "حلّ وصحّح" : "Solve & grade")}
                        </button>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>
            )}
          </>
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
                {(typeof gradeResult.ocr_confidence_avg === "number" || Number(gradeResult.review_count) > 0) && (
                  <div className="rounded-xl border border-border bg-background p-3 flex flex-wrap items-center gap-3 text-xs">
                    {typeof gradeResult.ocr_confidence_avg === "number" && (
                      <span className="text-muted-foreground">
                        {isAr ? "جودة قراءة الخط (OCR):" : "Handwriting read quality (OCR):"}{" "}
                        <span className="font-mono font-semibold text-foreground">{gradeResult.ocr_confidence_avg}%</span>
                      </span>
                    )}
                    {Number(gradeResult.review_count) > 0 && (
                      <span className="px-2 py-1 rounded-full bg-amber-500/15 text-amber-600 font-semibold">
                        {isAr
                          ? `${gradeResult.review_count} سؤال يحتاج مراجعة يدوية`
                          : `${gradeResult.review_count} question(s) flagged for manual review`}
                      </span>
                    )}
                  </div>
                )}
                {Array.isArray(gradeResult.per_question) && gradeResult.per_question.length > 0 && (
                  <div className="space-y-2">
                    {gradeResult.per_question.map((q: any) => {
                      const conf = typeof q.ocr_confidence === "number" ? q.ocr_confidence : null;
                      const confTone = conf === null ? "text-muted-foreground bg-muted"
                        : conf >= 80 ? "text-emerald-600 bg-emerald-500/15"
                        : conf >= 60 ? "text-amber-600 bg-amber-500/15"
                        : "text-destructive bg-destructive/10";
                      return (
                      <div key={q.n} className={`rounded-xl border p-3 ${q.needs_review ? "border-amber-400/60 bg-amber-500/5" : "border-border bg-background"}`}>
                        <div className="flex items-center justify-between mb-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-semibold">{isAr ? `س${q.n}` : `Q${q.n}`}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${confTone}`}>
                              {isAr ? "وضوح" : "clarity"} {conf === null ? "—" : `${conf}%`}
                            </span>
                            {q.needs_review && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-600 font-semibold">
                                {isAr ? "يحتاج مراجعة يدوية" : "needs manual review"}
                              </span>
                            )}
                          </div>
                          <div className="text-sm font-mono text-primary">{Math.round(Number(q.score) || 0)} / {Math.round(Number(q.out_of) || Number(gradeResult.per_question_max) || 20)}</div>
                        </div>
                        {q.feedback && <p className="text-sm whitespace-pre-wrap">{q.feedback}</p>}
                        {q.corrections && (
                          <p className="text-xs text-muted-foreground mt-1 whitespace-pre-wrap">{q.corrections}</p>
                        )}
                      </div>
                    );})}
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
                      <div>
                        <label className="block text-xs font-semibold mb-1">
                          {isAr ? "أرسل الاعتراض إلى كروب" : "Send objection to group"}
                        </label>
                        <select
                          value={groupOverride || (["physics","chemistry","biology","math"].includes(course.id) ? course.id : "")}
                          onChange={(e) => setGroupOverride(e.target.value as typeof groupOverride)}
                          className="w-full h-10 px-3 rounded-lg border border-border bg-background text-sm"
                          dir={isAr ? "rtl" : "ltr"}
                        >
                          <option value="">{isAr ? "— اختر الكروب —" : "— Choose group —"}</option>
                          <option value="physics">{isAr ? "الفيزياء" : "Physics"}</option>
                          <option value="chemistry">{isAr ? "الكيمياء" : "Chemistry"}</option>
                          <option value="biology">{isAr ? "الأحياء" : "Biology"}</option>
                          <option value="math">{isAr ? "الرياضيات" : "Math"}</option>
                        </select>
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
                    <div className="mt-3 rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-300">
                      <div>✓ {isAr ? "تم الإرسال. سيتواصل معك المدرّس عبر تيليغرام." : "Sent. The teacher will contact you on Telegram."}</div>
                      {routedSubject && (
                        <div className="mt-1 text-xs opacity-90">
                          {isAr
                            ? `تم توجيه الاعتراض إلى كروب ${({ physics: "الفيزياء", chemistry: "الكيمياء", biology: "الأحياء", math: "الرياضيات" } as Record<string,string>)[routedSubject] ?? routedSubject} الخاص بالمصححين.`
                            : `Your request was routed to the ${({ physics: "Physics", chemistry: "Chemistry", biology: "Biology", math: "Math" } as Record<string,string>)[routedSubject] ?? routedSubject} graders group.`}
                        </div>
                      )}
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