import { useEffect, useState } from "react";
import { ArrowRight, GraduationCap, Target, CalendarDays, Clock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";

const SUBJECTS = ["math", "physics", "chemistry", "biology", "english", "arabic", "islamic", "french"] as const;
const LABELS = {
  en: { math: "Math", physics: "Physics", chemistry: "Chemistry", biology: "Biology", english: "English", arabic: "Arabic", islamic: "Islamic", french: "French" },
  ar: { math: "رياضيات", physics: "فيزياء", chemistry: "كيمياء", biology: "أحياء", english: "إنجليزي", arabic: "عربي", islamic: "إسلامية", french: "فرنسي" },
} as const;

const T = {
  en: {
    title: "Let's set up your study system",
    desc: "Takes 30 seconds. We use this to build your daily report and pacing.",
    examDate: "When is your exam?",
    targetGrade: "Target grade (0–100)",
    weeklyGoal: "Weekly study hours goal",
    weak: "Which subjects do you struggle with most?",
    window: "Preferred study time",
    morning: "Morning", afternoon: "Afternoon", evening: "Evening",
    save: "Start studying",
    saved: "Goals saved!",
    skip: "Skip for now",
    hours: "hours",
  },
  ar: {
    title: "لنُعدّ نظام دراستك",
    desc: "يستغرق 30 ثانية. سنستخدم هذا لبناء تقريرك اليومي وتنظيم وقتك.",
    examDate: "متى موعد امتحانك؟",
    targetGrade: "الدرجة المستهدفة (0–100)",
    weeklyGoal: "هدف ساعات الدراسة الأسبوعية",
    weak: "ما المواد التي تحتاج تركيزاً أكثر؟",
    window: "وقت الدراسة المفضل",
    morning: "صباحاً", afternoon: "ظهراً", evening: "مساءً",
    save: "ابدأ الدراسة",
    saved: "تم حفظ الأهداف!",
    skip: "تخطي الآن",
    hours: "ساعة",
  },
} as const;

export default function Onboarding({ language, onDone }: { language: AppLanguage; onDone: () => void }) {
  const t = T[language];
  const ar = language === "ar";
  const [examDate, setExamDate] = useState("");
  const [targetGrade, setTargetGrade] = useState<number>(85);
  const [weeklyGoal, setWeeklyGoal] = useState<number>(14);
  const [window, setWindow] = useState<"morning" | "afternoon" | "evening">("evening");
  const [weak, setWeak] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase.from("student_profile").select("*").eq("user_id", u.user.id).maybeSingle();
      if (data) {
        setExamDate(data.exam_date ?? "");
        setTargetGrade(data.target_grade ?? 85);
        setWeeklyGoal(data.weekly_goal_hours ?? 14);
        setWindow((data.study_window as any) ?? "evening");
        setWeak(data.weak_subjects ?? []);
      }
    })();
  }, []);

  const toggleWeak = (s: string) =>
    setWeak((cur) => (cur.includes(s) ? cur.filter((x) => x !== s) : [...cur, s]));

  const save = async (skipOnboarding = false) => {
    setSaving(true);
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { error } = await supabase.from("student_profile").upsert({
      user_id: u.user.id,
      exam_date: examDate || null,
      target_grade: targetGrade,
      weekly_goal_hours: weeklyGoal,
      study_window: window,
      weak_subjects: weak,
      onboarded: !skipOnboarding,
    }, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    toast.success(t.saved);
    onDone();
  };

  return (
    <main className="min-h-screen px-4 py-12 flex items-center justify-center relative overflow-hidden" dir={ar ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="max-w-2xl w-full relative z-10 rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-8 animate-fade-up">
        <div className="text-center mb-8">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-primary/15 items-center justify-center mb-4">
            <GraduationCap className="w-7 h-7 text-primary" />
          </div>
          <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">{t.title}</h1>
          <p className="text-muted-foreground">{t.desc}</p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2"><CalendarDays className="w-4 h-4 text-primary" />{t.examDate}</label>
            <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)}
              className="w-full h-11 px-4 rounded-xl border border-white/10 bg-background/60 text-foreground" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2"><Target className="w-4 h-4 text-primary" />{t.targetGrade}: <span className="text-primary font-bold">{targetGrade}</span></label>
            <input type="range" min={50} max={100} value={targetGrade} onChange={(e) => setTargetGrade(+e.target.value)} className="w-full accent-primary" />
          </div>

          <div>
            <label className="flex items-center gap-2 text-sm font-medium mb-2"><Clock className="w-4 h-4 text-primary" />{t.weeklyGoal}: <span className="text-primary font-bold">{weeklyGoal} {t.hours}</span></label>
            <input type="range" min={3} max={50} value={weeklyGoal} onChange={(e) => setWeeklyGoal(+e.target.value)} className="w-full accent-primary" />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t.window}</label>
            <div className="grid grid-cols-3 gap-2">
              {(["morning", "afternoon", "evening"] as const).map((w) => (
                <button key={w} onClick={() => setWindow(w)} type="button"
                  className={`h-11 rounded-xl border text-sm transition ${window === w ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-background/60 text-muted-foreground hover:border-primary/40"}`}>
                  {t[w]}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">{t.weak}</label>
            <div className="flex flex-wrap gap-2">
              {SUBJECTS.map((s) => (
                <button key={s} type="button" onClick={() => toggleWeak(s)}
                  className={`h-9 px-4 rounded-full border text-sm transition ${weak.includes(s) ? "border-primary bg-primary/15 text-primary" : "border-white/10 bg-background/60 text-muted-foreground hover:border-primary/40"}`}>
                  {LABELS[language][s]}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="flex gap-3 mt-8">
          <button onClick={() => save(true)} className="h-11 px-4 rounded-xl border border-white/10 text-sm text-muted-foreground hover:text-foreground">
            {t.skip}
          </button>
          <button onClick={() => save(false)} disabled={saving || !examDate}
            className="flex-1 h-11 px-6 rounded-xl bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-50 hover:opacity-90 transition">
            {t.save} <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </main>
  );
}