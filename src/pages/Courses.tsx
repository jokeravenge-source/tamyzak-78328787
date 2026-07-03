import { useEffect, useMemo, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { ArrowLeft, GraduationCap, Lock, Play, Plus, Settings, Trash2, Upload, Users, X, CheckCircle2, Circle, Loader2, Pencil } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

type Course = {
  id: string;
  slug: string;
  title_ar: string;
  title_en: string;
  description_ar: string | null;
  description_en: string | null;
  cover_url: string | null;
  is_published: boolean;
};

type Chapter = { id: string; course_id: string; title: string; sort_order: number };
type Video = {
  id: string;
  chapter_id: string;
  course_id: string;
  title: string;
  description: string | null;
  duration_sec: number | null;
  bunny_library_id: string;
  bunny_video_guid: string;
  thumbnail_url: string | null;
  sort_order: number;
  is_published: boolean;
};

const fmtDuration = (s: number | null) => {
  if (!s || s <= 0) return "";
  const m = Math.floor(s / 60);
  const sec = Math.round(s % 60);
  return `${m}:${sec.toString().padStart(2, "0")}`;
};

const Courses = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const ar = language === "ar";
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<Course[]>([]);
  const [userId, setUserId] = useState<string | null>(null);
  const [enrolledIds, setEnrolledIds] = useState<Set<string>>(new Set());
  const [teacherIds, setTeacherIds] = useState<Set<string>>(new Set());
  const [isGlobalAdmin, setIsGlobalAdmin] = useState(false);

  const [view, setView] = useState<"list" | "detail" | "player" | "admin">("list");
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    const { data: userRes } = await supabase.auth.getUser();
    const uid = userRes?.user?.id ?? null;
    setUserId(uid);

    const [{ data: c }, { data: en }, { data: tc }, { data: ad }] = await Promise.all([
      supabase.from("courses").select("*").order("title_en"),
      uid ? supabase.from("course_enrollments").select("course_id").eq("user_id", uid) : Promise.resolve({ data: [] as any }),
      uid ? supabase.from("course_teachers").select("course_id").eq("user_id", uid) : Promise.resolve({ data: [] as any }),
      uid ? supabase.from("user_roles").select("role").eq("user_id", uid).eq("role", "admin").maybeSingle() : Promise.resolve({ data: null as any }),
    ]);
    setCourses((c ?? []) as Course[]);
    setEnrolledIds(new Set(((en ?? []) as any[]).map((r) => r.course_id)));
    setTeacherIds(new Set(((tc ?? []) as any[]).map((r) => r.course_id)));
    setIsGlobalAdmin(!!ad);
    setLoading(false);
  };

  useEffect(() => { refresh(); }, []);

  const activeCourse = courses.find((c) => c.id === activeCourseId) ?? null;
  const canTeach = (id: string) => teacherIds.has(id) || isGlobalAdmin;
  const isEnrolled = (id: string) => enrolledIds.has(id) || canTeach(id);

  // ---------------- LIST ----------------
  if (view === "list") {
    return (
      <main className="min-h-screen bg-background text-foreground pb-32" dir={ar ? "rtl" : "ltr"}>
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
          <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
            <ArrowLeft className="w-4 h-4" />
            {ar ? "رجوع" : "Back"}
          </button>
          <div className="flex items-center gap-3 mb-6">
            <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center">
              <GraduationCap className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold">{ar ? "الدورات" : "Courses"}</h1>
              <p className="text-sm text-muted-foreground">{ar ? "اختر دورة لبدء المشاهدة" : "Pick a course to start watching"}</p>
            </div>
          </div>

          {loading ? (
            <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
          ) : courses.length === 0 ? (
            <div className="text-center text-muted-foreground py-16">{ar ? "لا توجد دورات بعد" : "No courses yet"}</div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2">
              {courses.map((c) => {
                const enrolled = isEnrolled(c.id);
                const teacher = canTeach(c.id);
                return (
                  <div key={c.id} className="rounded-2xl border border-border bg-card overflow-hidden">
                    <div className="aspect-video bg-gradient-to-br from-primary/20 to-primary/5 grid place-items-center">
                      {c.cover_url ? (
                        <img src={c.cover_url} alt={ar ? c.title_ar : c.title_en} className="w-full h-full object-cover" />
                      ) : (
                        <GraduationCap className="w-14 h-14 text-primary/60" />
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="font-bold text-lg">{ar ? c.title_ar : c.title_en}</h3>
                      {(ar ? c.description_ar : c.description_en) && (
                        <p className="text-sm text-muted-foreground mt-1">{ar ? c.description_ar : c.description_en}</p>
                      )}
                      <div className="flex items-center gap-2 mt-4">
                        {enrolled ? (
                          <button
                            onClick={() => { setActiveCourseId(c.id); setView("detail"); }}
                            className="flex-1 h-10 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center justify-center gap-2 hover:opacity-90"
                          >
                            <Play className="w-4 h-4" />
                            {ar ? "افتح" : "Open"}
                          </button>
                        ) : (
                          <div className="flex-1 h-10 rounded-lg bg-muted text-muted-foreground text-sm font-medium inline-flex items-center justify-center gap-2">
                            <Lock className="w-4 h-4" />
                            {ar ? "غير مسجّل" : "Not enrolled"}
                          </div>
                        )}
                        {teacher && (
                          <button
                            onClick={() => { setActiveCourseId(c.id); setView("admin"); }}
                            className="h-10 px-3 rounded-lg border border-border bg-card text-sm font-semibold inline-flex items-center gap-1.5 hover:bg-secondary"
                            title={ar ? "لوحة المدرس" : "Teacher dashboard"}
                          >
                            <Settings className="w-4 h-4" />
                            {ar ? "إدارة" : "Manage"}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </main>
    );
  }

  // ---------------- DETAIL ----------------
  if (view === "detail" && activeCourse) {
    return (
      <CourseDetail
        language={language}
        course={activeCourse}
        canTeach={canTeach(activeCourse.id)}
        onBack={() => setView("list")}
        onPlay={(vid) => { setActiveVideoId(vid); setView("player"); }}
      />
    );
  }

  // ---------------- PLAYER ----------------
  if (view === "player" && activeCourse && activeVideoId) {
    return (
      <CoursePlayer
        language={language}
        courseId={activeCourse.id}
        videoId={activeVideoId}
        onBack={() => setView("detail")}
      />
    );
  }

  // ---------------- ADMIN ----------------
  if (view === "admin" && activeCourse) {
    return (
      <CourseAdmin
        language={language}
        course={activeCourse}
        isGlobalAdmin={isGlobalAdmin}
        onBack={() => setView("list")}
      />
    );
  }

  return null;
};

/* ============================================================ */

const CourseDetail = ({ language, course, canTeach, onBack, onPlay }: {
  language: AppLanguage; course: Course; canTeach: boolean; onBack: () => void; onPlay: (videoId: string) => void;
}) => {
  const ar = language === "ar";
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [views, setViews] = useState<Map<string, { max_percent: number; completed: boolean }>>(new Map());
  const [loading, setLoading] = useState(true);
  const [openChapter, setOpenChapter] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes?.user?.id;
      const [{ data: ch }, { data: vids }, { data: vw }] = await Promise.all([
        supabase.from("course_chapters").select("*").eq("course_id", course.id).order("sort_order"),
        supabase.from("course_videos").select("*").eq("course_id", course.id).order("sort_order"),
        uid ? supabase.from("course_video_views").select("video_id, max_percent, completed").eq("user_id", uid) : Promise.resolve({ data: [] as any }),
      ]);
      const chList = (ch ?? []) as Chapter[];
      setChapters(chList);
      setVideos((vids ?? []) as Video[]);
      const map = new Map<string, { max_percent: number; completed: boolean }>();
      ((vw ?? []) as any[]).forEach((r) => map.set(r.video_id, { max_percent: r.max_percent, completed: r.completed }));
      setViews(map);
      if (chList.length > 0) setOpenChapter(chList[0].id);
      setLoading(false);
    })();
  }, [course.id]);

  return (
    <main className="min-h-screen bg-background text-foreground pb-32" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          {ar ? "رجوع" : "Back"}
        </button>
        <h1 className="text-2xl font-bold mb-1">{ar ? course.title_ar : course.title_en}</h1>
        {(ar ? course.description_ar : course.description_en) && (
          <p className="text-sm text-muted-foreground mb-6">{ar ? course.description_ar : course.description_en}</p>
        )}

        {loading ? (
          <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : chapters.length === 0 ? (
          <div className="text-center text-muted-foreground py-16">{ar ? "لا توجد فصول بعد" : "No chapters yet"}</div>
        ) : (
          <div className="space-y-3">
            {chapters.map((ch) => {
              const chVideos = videos.filter((v) => v.chapter_id === ch.id && v.is_published);
              const isOpen = openChapter === ch.id;
              const completedCount = chVideos.filter((v) => views.get(v.id)?.completed).length;
              return (
                <div key={ch.id} className="rounded-xl border border-border bg-card overflow-hidden">
                  <button
                    onClick={() => setOpenChapter(isOpen ? null : ch.id)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-secondary/40 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center text-sm font-bold">
                        {ch.sort_order || "•"}
                      </div>
                      <div className="text-start">
                        <div className="font-semibold">{ch.title}</div>
                        <div className="text-xs text-muted-foreground">
                          {chVideos.length} {ar ? "فيديو" : "videos"}
                          {chVideos.length > 0 && ` • ${completedCount}/${chVideos.length} ${ar ? "مكتمل" : "done"}`}
                        </div>
                      </div>
                    </div>
                    <span className={`transition-transform ${isOpen ? "rotate-90" : ""}`}>›</span>
                  </button>
                  {isOpen && (
                    <div className="border-t border-border">
                      {chVideos.length === 0 ? (
                        <div className="p-4 text-sm text-muted-foreground text-center">{ar ? "لا توجد فيديوهات" : "No videos"}</div>
                      ) : chVideos.map((v) => {
                        const view = views.get(v.id);
                        return (
                          <button
                            key={v.id}
                            onClick={() => onPlay(v.id)}
                            className="w-full flex items-center gap-3 px-4 py-3 border-b border-border last:border-b-0 hover:bg-secondary/40 transition-colors"
                          >
                            {view?.completed ? (
                              <CheckCircle2 className="w-5 h-5 text-primary shrink-0" />
                            ) : view ? (
                              <div className="w-5 h-5 rounded-full border-2 border-primary shrink-0 grid place-items-center text-[9px] font-bold text-primary">
                                {view.max_percent}%
                              </div>
                            ) : (
                              <Circle className="w-5 h-5 text-muted-foreground shrink-0" />
                            )}
                            <div className="flex-1 text-start">
                              <div className="text-sm font-medium">{v.title}</div>
                              {v.duration_sec && <div className="text-xs text-muted-foreground">{fmtDuration(v.duration_sec)}</div>}
                            </div>
                            <Play className="w-4 h-4 text-muted-foreground" />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
};

/* ============================================================ */

const CoursePlayer = ({ language, courseId, videoId, onBack }: {
  language: AppLanguage; courseId: string; videoId: string; onBack: () => void;
}) => {
  const ar = language === "ar";
  const [video, setVideo] = useState<Video | null>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const percentRef = useRef(0);

  useEffect(() => {
    supabase.from("course_videos").select("*").eq("id", videoId).maybeSingle()
      .then(({ data }) => setVideo(data as Video | null));
  }, [videoId]);

  // Track view: on mount send 0 (opened); then poll iframe via postMessage listen
  useEffect(() => {
    const send = async (percent: number) => {
      try {
        await supabase.functions.invoke("course-track-view", { body: { video_id: videoId, percent } });
      } catch { /* ignore */ }
    };
    send(0); // opened

    // Listen for Bunny player.js postMessage events (timeupdate)
    const onMsg = (e: MessageEvent) => {
      const d: any = e.data;
      if (!d || typeof d !== "object") return;
      // Bunny embeds forward player.js events: { event, value }
      if (d.event === "timeupdate" && d.duration && d.seconds != null) {
        const p = Math.max(0, Math.min(100, Math.round((d.seconds / d.duration) * 100)));
        if (p > percentRef.current) percentRef.current = p;
      }
    };
    window.addEventListener("message", onMsg);

    // Periodic flush + on unload
    const flush = () => { if (percentRef.current > 0) send(percentRef.current); };
    const iv = window.setInterval(flush, 15000);
    window.addEventListener("pagehide", flush);

    return () => {
      window.removeEventListener("message", onMsg);
      window.removeEventListener("pagehide", flush);
      window.clearInterval(iv);
      flush();
    };
  }, [videoId]);

  return (
    <main className="min-h-screen bg-background text-foreground pb-32" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          {ar ? "رجوع" : "Back"}
        </button>
        {!video ? (
          <div className="grid place-items-center py-20"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
        ) : (
          <>
            <h1 className="text-xl font-bold mb-3">{video.title}</h1>
            <div className="aspect-video w-full rounded-xl overflow-hidden bg-black border border-border">
              <iframe
                ref={iframeRef}
                src={`https://iframe.mediadelivery.net/embed/${video.bunny_library_id}/${video.bunny_video_guid}?autoplay=false`}
                loading="lazy"
                allow="accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture"
                allowFullScreen
                className="w-full h-full"
              />
            </div>
            {video.description && <p className="text-sm text-muted-foreground mt-4 whitespace-pre-wrap">{video.description}</p>}
          </>
        )}
      </div>
    </main>
  );
};

/* ============================================================ */

const CourseAdmin = ({ language, course, isGlobalAdmin, onBack }: {
  language: AppLanguage; course: Course; isGlobalAdmin: boolean; onBack: () => void;
}) => {
  const ar = language === "ar";
  const [tab, setTab] = useState<"students" | "chapters" | "videos" | "teachers">("students");

  return (
    <main className="min-h-screen bg-background text-foreground pb-32" dir={ar ? "rtl" : "ltr"}>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-6">
        <button onClick={onBack} className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6">
          <ArrowLeft className="w-4 h-4" />
          {ar ? "رجوع" : "Back"}
        </button>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary grid place-items-center"><Settings className="w-6 h-6" /></div>
          <div>
            <h1 className="text-2xl font-bold">{ar ? "لوحة المدرس" : "Teacher dashboard"}</h1>
            <p className="text-sm text-muted-foreground">{ar ? course.title_ar : course.title_en}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 mb-6 overflow-x-auto no-scrollbar">
          {(["students","chapters","videos", ...(isGlobalAdmin ? ["teachers" as const] : [])] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`h-9 px-4 rounded-lg text-sm font-semibold whitespace-nowrap transition-colors ${
                tab === t ? "bg-primary text-primary-foreground" : "bg-card border border-border text-foreground hover:bg-secondary"
              }`}
            >
              {t === "students" ? (ar ? "الطلاب" : "Students") :
               t === "chapters" ? (ar ? "الفصول" : "Chapters") :
               t === "videos" ? (ar ? "الفيديوهات" : "Videos") : (ar ? "المدرسون" : "Teachers")}
            </button>
          ))}
        </div>

        {tab === "students" && <AdminStudents language={language} course={course} />}
        {tab === "chapters" && <AdminChapters language={language} course={course} />}
        {tab === "videos" && <AdminVideos language={language} course={course} />}
        {tab === "teachers" && isGlobalAdmin && <AdminTeachers language={language} course={course} />}
      </div>
    </main>
  );
};

/* ---------- Admin: Students ---------- */

const AdminStudents = ({ language, course }: { language: AppLanguage; course: Course }) => {
  const ar = language === "ar";
  const [rows, setRows] = useState<{ user_id: string; enrolled_at: string; display_name: string | null }[]>([]);
  const [loading, setLoading] = useState(true);
  const [email, setEmail] = useState("");
  const [adding, setAdding] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data: enr } = await supabase.from("course_enrollments").select("user_id, enrolled_at").eq("course_id", course.id).order("enrolled_at", { ascending: false });
    const list = (enr ?? []) as { user_id: string; enrolled_at: string }[];
    const ids = list.map((r) => r.user_id);
    let names = new Map<string, string | null>();
    if (ids.length) {
      const { data: profs } = await supabase.from("profiles").select("user_id, display_name").in("user_id", ids);
      ((profs ?? []) as any[]).forEach((p) => names.set(p.user_id, p.display_name));
    }
    setRows(list.map((r) => ({ ...r, display_name: names.get(r.user_id) ?? null })));
    setLoading(false);
  };
  useEffect(() => { load(); }, [course.id]);

  const addByEmail = async () => {
    const em = email.trim().toLowerCase();
    if (!em) return;
    setAdding(true);
    try {
      // Look up user via profiles.display_name is not enough — profiles table doesn't have email.
      // Instead check profiles has 'email' or use auth. We'll try profiles.email; fall back to error.
      const { data: prof } = await supabase.from("profiles").select("user_id").ilike("display_name", em).limit(1).maybeSingle();
      let uid: string | null = (prof as any)?.user_id ?? null;
      if (!uid) {
        // fallback: search by user_id if pasted
        if (/^[0-9a-f-]{36}$/i.test(em)) uid = em;
      }
      if (!uid) {
        toast.error(ar ? "لم يتم العثور على مستخدم بهذا الاسم" : "No user found with that name");
        return;
      }
      const { data: userRes } = await supabase.auth.getUser();
      const { error } = await supabase.from("course_enrollments").insert({ course_id: course.id, user_id: uid, enrolled_by: userRes?.user?.id ?? null });
      if (error) throw error;
      toast.success(ar ? "تمت الإضافة" : "Added");
      setEmail("");
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Error");
    } finally { setAdding(false); }
  };

  const remove = async (uid: string) => {
    if (!confirm(ar ? "إزالة الطالب؟" : "Remove student?")) return;
    const { error } = await supabase.from("course_enrollments").delete().eq("course_id", course.id).eq("user_id", uid);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Users className="w-4 h-4 text-primary" />
          <h3 className="font-semibold">{ar ? `الطلاب المسجّلون: ${rows.length}` : `Enrolled: ${rows.length}`}</h3>
        </div>
        <div className="flex gap-2">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={ar ? "اسم المستخدم أو User ID" : "Username or User ID"}
            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40"
          />
          <button onClick={addByEmail} disabled={adding} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5 disabled:opacity-50">
            {adding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            {ar ? "إضافة" : "Add"}
          </button>
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {loading ? <div className="p-6 grid place-items-center"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div> :
          rows.length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">{ar ? "لا يوجد طلاب" : "No students"}</div> :
          rows.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
              <div>
                <div className="text-sm font-medium">{r.display_name ?? r.user_id.slice(0, 8)}</div>
                <div className="text-xs text-muted-foreground">{new Date(r.enrolled_at).toLocaleDateString()}</div>
              </div>
              <button onClick={() => remove(r.user_id)} className="h-8 px-2 rounded-lg text-destructive hover:bg-destructive/10 text-sm inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> {ar ? "إزالة" : "Remove"}
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
};

/* ---------- Admin: Chapters ---------- */

const AdminChapters = ({ language, course }: { language: AppLanguage; course: Course }) => {
  const ar = language === "ar";
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const load = async () => {
    const { data } = await supabase.from("course_chapters").select("*").eq("course_id", course.id).order("sort_order");
    setChapters((data ?? []) as Chapter[]);
  };
  useEffect(() => { load(); }, [course.id]);

  const add = async () => {
    const t = title.trim();
    if (!t) return;
    const next = (chapters[chapters.length - 1]?.sort_order ?? 0) + 1;
    const { error } = await supabase.from("course_chapters").insert({ course_id: course.id, title: t, sort_order: next });
    if (error) { toast.error(error.message); return; }
    setTitle("");
    await load();
  };
  const save = async (id: string) => {
    const { error } = await supabase.from("course_chapters").update({ title: editingTitle }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    setEditing(null);
    await load();
  };
  const remove = async (id: string) => {
    if (!confirm(ar ? "حذف الفصل وكل فيديوهاته؟" : "Delete chapter and all its videos?")) return;
    const { error } = await supabase.from("course_chapters").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex gap-2">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder={ar ? "اسم الفصل" : "Chapter name"}
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <button onClick={add} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {ar ? "إضافة فصل" : "Add chapter"}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {chapters.length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">{ar ? "لا توجد فصول" : "No chapters"}</div> :
          chapters.map((ch) => (
            <div key={ch.id} className="flex items-center gap-2 px-4 py-3 border-b border-border last:border-b-0">
              <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary grid place-items-center text-sm font-bold">{ch.sort_order}</div>
              {editing === ch.id ? (
                <>
                  <input value={editingTitle} onChange={(e) => setEditingTitle(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-lg border border-border bg-background text-sm" />
                  <button onClick={() => save(ch.id)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm">{ar ? "حفظ" : "Save"}</button>
                  <button onClick={() => setEditing(null)} className="h-9 px-3 rounded-lg border border-border text-sm">{ar ? "إلغاء" : "Cancel"}</button>
                </>
              ) : (
                <>
                  <div className="flex-1 text-sm font-medium">{ch.title}</div>
                  <button onClick={() => { setEditing(ch.id); setEditingTitle(ch.title); }} className="h-8 w-8 grid place-items-center rounded-lg hover:bg-secondary"><Pencil className="w-4 h-4" /></button>
                  <button onClick={() => remove(ch.id)} className="h-8 w-8 grid place-items-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                </>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
};

/* ---------- Admin: Videos ---------- */

const AdminVideos = ({ language, course }: { language: AppLanguage; course: Course }) => {
  const ar = language === "ar";
  const [chapters, setChapters] = useState<Chapter[]>([]);
  const [videos, setVideos] = useState<Video[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewersOpen, setViewersOpen] = useState<string | null>(null);

  const load = async () => {
    setLoading(true);
    const [{ data: ch }, { data: vids }] = await Promise.all([
      supabase.from("course_chapters").select("*").eq("course_id", course.id).order("sort_order"),
      supabase.from("course_videos").select("*").eq("course_id", course.id).order("sort_order"),
    ]);
    setChapters((ch ?? []) as Chapter[]);
    setVideos((vids ?? []) as Video[]);
    setLoading(false);
  };
  useEffect(() => { load(); }, [course.id]);

  const remove = async (id: string) => {
    if (!confirm(ar ? "حذف الفيديو؟" : "Delete video?")) return;
    const { error } = await supabase.from("course_videos").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  if (loading) return <div className="grid place-items-center py-16"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  if (chapters.length === 0) return <div className="text-center text-muted-foreground py-10">{ar ? "أضف فصلاً أولاً" : "Add a chapter first"}</div>;

  return (
    <div className="space-y-4">
      {chapters.map((ch) => {
        const chVideos = videos.filter((v) => v.chapter_id === ch.id);
        return (
          <div key={ch.id} className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/20">
              <h3 className="font-semibold">{ch.title}</h3>
              <UploadVideoButton language={language} chapterId={ch.id} onUploaded={load} />
            </div>
            {chVideos.length === 0 ? (
              <div className="p-4 text-sm text-muted-foreground text-center">{ar ? "لا توجد فيديوهات" : "No videos"}</div>
            ) : chVideos.map((v) => (
              <div key={v.id} className="px-4 py-3 border-b border-border last:border-b-0">
                <div className="flex items-center gap-3">
                  <div className="flex-1">
                    <div className="text-sm font-medium">{v.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {v.is_published ? (ar ? "منشور" : "Published") : (ar ? "قيد الرفع" : "Uploading")}
                      {v.duration_sec ? ` • ${fmtDuration(v.duration_sec)}` : ""}
                    </div>
                  </div>
                  <button onClick={() => setViewersOpen(viewersOpen === v.id ? null : v.id)} className="h-8 px-2 rounded-lg border border-border text-sm inline-flex items-center gap-1 hover:bg-secondary">
                    <Users className="w-3.5 h-3.5" /> {ar ? "المشاهدون" : "Viewers"}
                  </button>
                  <button onClick={() => remove(v.id)} className="h-8 w-8 grid place-items-center rounded-lg text-destructive hover:bg-destructive/10"><Trash2 className="w-4 h-4" /></button>
                </div>
                {viewersOpen === v.id && <ViewersPanel language={language} courseId={course.id} videoId={v.id} />}
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
};

const UploadVideoButton = ({ language, chapterId, onUploaded }: { language: AppLanguage; chapterId: string; onUploaded: () => void }) => {
  const ar = language === "ar";
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [progress, setProgress] = useState(0);
  const [busy, setBusy] = useState(false);

  const doUpload = async () => {
    if (!title.trim() || !file) return;
    setBusy(true);
    setProgress(0);
    try {
      const { data, error } = await supabase.functions.invoke("bunny-create-video", { body: { chapter_id: chapterId, title: title.trim() } });
      if (error) throw error;
      const { video, upload_url, upload_headers } = data as any;

      // Direct PUT to Bunny with progress via XHR
      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", upload_url, true);
        Object.entries(upload_headers).forEach(([k, v]) => xhr.setRequestHeader(k, String(v)));
        xhr.upload.onprogress = (e) => {
          if (e.lengthComputable) setProgress(Math.round((e.loaded / e.total) * 100));
        };
        xhr.onload = () => (xhr.status >= 200 && xhr.status < 300) ? resolve() : reject(new Error(`Bunny PUT ${xhr.status}`));
        xhr.onerror = () => reject(new Error("Upload failed"));
        xhr.send(file);
      });

      // Finalize
      const { error: finErr } = await supabase.functions.invoke("bunny-finalize-video", { body: { video_id: video.id } });
      if (finErr) throw finErr;

      toast.success(ar ? "تم رفع الفيديو" : "Video uploaded");
      setOpen(false);
      setTitle(""); setFile(null); setProgress(0);
      onUploaded();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload error");
    } finally { setBusy(false); }
  };

  if (!open) return (
    <button onClick={() => setOpen(true)} className="h-9 px-3 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5">
      <Upload className="w-4 h-4" /> {ar ? "رفع فيديو" : "Upload video"}
    </button>
  );
  return (
    <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold">{ar ? "رفع فيديو" : "Upload video"}</h3>
          <button onClick={() => !busy && setOpen(false)} className="p-1 rounded-md hover:bg-secondary"><X className="w-4 h-4" /></button>
        </div>
        <label className="block text-sm font-medium mb-1">{ar ? "اسم الدرس" : "Lecture title"}</label>
        <input value={title} onChange={(e) => setTitle(e.target.value)} disabled={busy}
          className="w-full h-10 px-3 mb-3 rounded-lg border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-primary/40" />
        <label className="block text-sm font-medium mb-1">{ar ? "ملف الفيديو" : "Video file"}</label>
        <input type="file" accept="video/*" disabled={busy} onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          className="w-full text-sm mb-3 file:mr-3 file:py-1.5 file:px-3 file:rounded-md file:border-0 file:bg-secondary file:text-foreground" />
        {busy && (
          <div className="mb-3">
            <div className="text-xs text-muted-foreground mb-1">{ar ? `جارٍ الرفع: ${progress}%` : `Uploading: ${progress}%`}</div>
            <div className="h-2 rounded-full bg-secondary overflow-hidden"><div className="h-full bg-primary transition-all" style={{ width: `${progress}%` }} /></div>
          </div>
        )}
        <button onClick={doUpload} disabled={busy || !title.trim() || !file}
          className="w-full h-10 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50">
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {ar ? "بدء الرفع" : "Start upload"}
        </button>
      </div>
    </div>
  );
};

const ViewersPanel = ({ language, courseId, videoId }: { language: AppLanguage; courseId: string; videoId: string }) => {
  const ar = language === "ar";
  const [rows, setRows] = useState<{ user_id: string; display_name: string | null; max_percent: number; completed: boolean; opened_at: string }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      setLoading(true);
      const { data: enr } = await supabase.from("course_enrollments").select("user_id").eq("course_id", courseId);
      const enrolled = ((enr ?? []) as any[]).map((r) => r.user_id);
      const { data: views } = await supabase.from("course_video_views").select("user_id, max_percent, completed, opened_at").eq("video_id", videoId);
      const viewMap = new Map<string, any>();
      ((views ?? []) as any[]).forEach((v) => viewMap.set(v.user_id, v));
      const { data: profs } = enrolled.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", enrolled) : { data: [] as any };
      const nameMap = new Map<string, string | null>();
      ((profs ?? []) as any[]).forEach((p) => nameMap.set(p.user_id, p.display_name));
      setRows(enrolled.map((uid) => ({
        user_id: uid,
        display_name: nameMap.get(uid) ?? null,
        max_percent: viewMap.get(uid)?.max_percent ?? 0,
        completed: viewMap.get(uid)?.completed ?? false,
        opened_at: viewMap.get(uid)?.opened_at ?? "",
      })));
      setLoading(false);
    })();
  }, [courseId, videoId]);

  if (loading) return <div className="mt-3 p-3 rounded-lg bg-secondary/30 grid place-items-center"><Loader2 className="w-4 h-4 animate-spin text-primary" /></div>;
  const watched = rows.filter((r) => r.max_percent > 0).length;
  return (
    <div className="mt-3 rounded-lg bg-secondary/30 border border-border overflow-hidden">
      <div className="px-3 py-2 text-xs text-muted-foreground">
        {ar ? `شاهد ${watched} من ${rows.length}` : `${watched} of ${rows.length} watched`}
      </div>
      <div className="max-h-72 overflow-y-auto">
        {rows.length === 0 ? <div className="p-3 text-xs text-muted-foreground text-center">{ar ? "لا يوجد طلاب" : "No students"}</div> :
          rows.map((r) => (
            <div key={r.user_id} className="flex items-center gap-2 px-3 py-2 border-t border-border text-sm">
              <div className="flex-1 truncate">{r.display_name ?? r.user_id.slice(0, 8)}</div>
              {r.completed ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">{ar ? "مكتمل" : "Done"}</span>
              ) : r.max_percent > 0 ? (
                <span className="text-xs px-2 py-0.5 rounded-full bg-secondary text-foreground font-semibold">{r.max_percent}%</span>
              ) : (
                <span className="text-xs text-muted-foreground">{ar ? "لم يشاهد" : "Not watched"}</span>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
};

/* ---------- Admin: Teachers (global admin only) ---------- */

const AdminTeachers = ({ language, course }: { language: AppLanguage; course: Course }) => {
  const ar = language === "ar";
  const [rows, setRows] = useState<{ user_id: string; display_name: string | null }[]>([]);
  const [input, setInput] = useState("");

  const load = async () => {
    const { data: t } = await supabase.from("course_teachers").select("user_id").eq("course_id", course.id);
    const ids = ((t ?? []) as any[]).map((r) => r.user_id);
    const { data: profs } = ids.length ? await supabase.from("profiles").select("user_id, display_name").in("user_id", ids) : { data: [] as any };
    const map = new Map<string, string | null>();
    ((profs ?? []) as any[]).forEach((p) => map.set(p.user_id, p.display_name));
    setRows(ids.map((id) => ({ user_id: id, display_name: map.get(id) ?? null })));
  };
  useEffect(() => { load(); }, [course.id]);

  const add = async () => {
    const v = input.trim();
    if (!v) return;
    let uid: string | null = null;
    if (/^[0-9a-f-]{36}$/i.test(v)) uid = v;
    else {
      const { data } = await supabase.from("profiles").select("user_id").ilike("display_name", v).limit(1).maybeSingle();
      uid = (data as any)?.user_id ?? null;
    }
    if (!uid) { toast.error(ar ? "لم يتم العثور على المستخدم" : "User not found"); return; }
    const { error } = await supabase.from("course_teachers").insert({ course_id: course.id, user_id: uid });
    if (error) { toast.error(error.message); return; }
    setInput(""); await load();
  };
  const remove = async (uid: string) => {
    const { error } = await supabase.from("course_teachers").delete().eq("course_id", course.id).eq("user_id", uid);
    if (error) { toast.error(error.message); return; }
    await load();
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-4 flex gap-2">
        <input value={input} onChange={(e) => setInput(e.target.value)} placeholder={ar ? "اسم المستخدم أو User ID" : "Username or User ID"}
          className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-sm" />
        <button onClick={add} className="h-10 px-4 rounded-lg bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-1.5">
          <Plus className="w-4 h-4" /> {ar ? "إضافة مدرس" : "Add teacher"}
        </button>
      </div>
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {rows.length === 0 ? <div className="p-6 text-sm text-muted-foreground text-center">{ar ? "لا يوجد مدرسون" : "No teachers"}</div> :
          rows.map((r) => (
            <div key={r.user_id} className="flex items-center justify-between px-4 py-3 border-b border-border last:border-b-0">
              <div className="text-sm font-medium">{r.display_name ?? r.user_id.slice(0, 8)}</div>
              <button onClick={() => remove(r.user_id)} className="h-8 px-2 rounded-lg text-destructive hover:bg-destructive/10 text-sm inline-flex items-center gap-1">
                <Trash2 className="w-3.5 h-3.5" /> {ar ? "إزالة" : "Remove"}
              </button>
            </div>
          ))
        }
      </div>
    </div>
  );
};

export default Courses;