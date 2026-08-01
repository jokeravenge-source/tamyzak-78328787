import { useEffect, useMemo, useState } from "react";
import { CalendarClock, Check, ChevronDown, ChevronUp, Loader2, Pencil, Bell, Trash2, Send, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import { examOffsets } from "@/lib/examPlanSchedule";

export type PlanSubject = { id: string; titleAr: string; titleEn: string };

type PlanRow = {
  user_id: string;
  subjects: string[];
  start_date: string;
  interval_days: number;
  acknowledged_step: number;
  full_name?: string | null;
  telegram_username?: string | null;
};

export const EXAM_BOT = "sovforcejoin_bot";
export const EXAM_TIME_LABEL = "9:00 PM";

const todayBaghdad = (): string => {
  const d = new Date(Date.now() + 3 * 60 * 60 * 1000);
  return d.toISOString().slice(0, 10);
};

const addDays = (iso: string, days: number): string => {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

const daysBetween = (from: string, to: string): number =>
  Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86400000);

const ExamPlanPanel = ({ language, subjects }: { language: AppLanguage; subjects: PlanSubject[] }) => {
  const isAr = language === "ar";
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signedIn, setSignedIn] = useState(false);
  const [plan, setPlan] = useState<PlanRow | null>(null);
  const [editing, setEditing] = useState(false);
  const [picked, setPicked] = useState<string[]>([]);
  const [stage, setStage] = useState<"profile" | "subjects">("profile");
  const [fullName, setFullName] = useState("");
  const [tgUser, setTgUser] = useState("");

  const label = (id: string) => {
    const s = subjects.find((x) => x.id === id);
    return s ? (isAr ? s.titleAr : s.titleEn) : id;
  };

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setSignedIn(false); setLoading(false); return; }
      setSignedIn(true);
      // The student's name + Telegram handle live in their own table and are typed only once.
      const { data: prof } = await (supabase as any)
        .from("course_students")
        .select("full_name, telegram_username")
        .eq("user_id", user.id)
        .maybeSingle();
      const hasProfile = Boolean(prof?.full_name && prof?.telegram_username);
      if (prof) {
        setFullName(prof.full_name ?? "");
        setTgUser(prof.telegram_username ?? "");
      }
      const { data } = await (supabase as any)
        .from("course_exam_plans")
        .select("user_id, subjects, start_date, interval_days, acknowledged_step, full_name, telegram_username")
        .eq("user_id", user.id)
        .maybeSingle();
      if (data) {
        const row = data as PlanRow;
        setPlan(row);
        setPicked(row.subjects);
        if (!hasProfile) {
          setFullName(prof?.full_name ?? row.full_name ?? "");
          setTgUser(prof?.telegram_username ?? row.telegram_username ?? "");
          setEditing(true); setStage("profile");
        }
      } else {
        setEditing(true);
        setStage(hasProfile ? "subjects" : "profile");
      }
      setLoading(false);
    })();
  }, []);

  const schedule = useMemo(() => {
    if (!plan || plan.subjects.length === 0) return [];
    const offsets = examOffsets(plan.subjects.length);
    return plan.subjects.map((id, i) => ({
      id,
      step: i,
      date: addDays(plan.start_date, offsets[i]),
    }));
  }, [plan]);

  const today = todayBaghdad();
  const dueItem = useMemo(() => {
    if (!plan) return null;
    const past = schedule.filter((s) => daysBetween(s.date, today) >= 0);
    const current = past[past.length - 1];
    if (!current) return null;
    if (plan.acknowledged_step >= current.step) return null;
    return current;
  }, [schedule, plan, today]);

  const nextItem = useMemo(() => schedule.find((s) => daysBetween(today, s.date) > 0) ?? null, [schedule, today]);

  const toggle = (id: string) => {
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]));
  };

  const move = (idx: number, dir: -1 | 1) => {
    setPicked((p) => {
      const n = [...p];
      const j = idx + dir;
      if (j < 0 || j >= n.length) return p;
      [n[idx], n[j]] = [n[j], n[idx]];
      return n;
    });
  };

  const save = async () => {
    if (picked.length === 0) { toast.error(isAr ? "اختر مادة واحدة على الأقل" : "Pick at least one subject"); return; }
    setSaving(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSaving(false); return; }
    const cleanName = fullName.trim();
    const cleanTg = tgUser.trim().replace(/^@/, "");
    await (supabase as any).from("course_students").upsert(
      { user_id: user.id, full_name: cleanName, telegram_username: cleanTg },
      { onConflict: "user_id" },
    );
    const row = {
      user_id: user.id,
      subjects: picked,
      start_date: plan?.start_date ?? today,
      interval_days: 5,
      acknowledged_step: -1,
      full_name: cleanName,
      telegram_username: cleanTg,
    };
    const { error } = await (supabase as any).from("course_exam_plans").upsert(row, { onConflict: "user_id" });
    setSaving(false);
    if (error) { toast.error(error.message); return; }
    setPlan(row as PlanRow);
    setEditing(false);
    toast.success(isAr ? "تم حفظ خطة الامتحانات" : "Exam plan saved");
  };

  const acknowledge = async () => {
    if (!plan || !dueItem) return;
    const { error } = await (supabase as any)
      .from("course_exam_plans")
      .update({ acknowledged_step: dueItem.step })
      .eq("user_id", plan.user_id);
    if (error) { toast.error(error.message); return; }
    setPlan({ ...plan, acknowledged_step: dueItem.step });
  };

  const removePlan = async () => {
    if (!plan) return;
    if (!confirm(isAr ? "حذف خطة الامتحانات؟" : "Delete your exam plan?")) return;
    await (supabase as any).from("course_exam_plans").delete().eq("user_id", plan.user_id);
    setPlan(null); setPicked([]); setEditing(true);
  };

  if (!signedIn && !loading) return null;

  const continueFromProfile = () => {
    if (fullName.trim().length < 3) { toast.error(isAr ? "اكتب اسمك الكامل بالعربية" : "Enter your full name in Arabic"); return; }
    if (!/^[A-Za-z0-9_]{4,}$/.test(tgUser.trim().replace(/^@/, ""))) { toast.error(isAr ? "اكتب معرّف تيليغرام صحيح" : "Enter a valid Telegram username"); return; }
    setStage("subjects");
  };

  // Step 1 lives on its own full screen.
  if (!loading && editing && stage === "profile") {
    return (
      <div className="fixed inset-0 z-50 bg-background overflow-y-auto" dir={isAr ? "rtl" : "ltr"}>
        <div className="min-h-full flex items-center justify-center p-5">
          <div className="w-full max-w-md">
            <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mb-4">
              <CalendarClock className="w-6 h-6" />
            </div>
            <h1 className="text-xl font-bold">{isAr ? "قبل أن نبدأ" : "Before we start"}</h1>
            <p className="text-sm text-muted-foreground mt-1 mb-6">
              {isAr
                ? "اكتب اسمك الكامل بالعربية ومعرّف تيليغرام لتصلك تنبيهات الامتحانات."
                : "Enter your full name in Arabic and your Telegram username so we can send you exam reminders."}
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{isAr ? "الاسم الكامل (بالعربية)" : "Full name (in Arabic)"}</label>
                <input
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  maxLength={80}
                  dir="rtl"
                  placeholder="مثال: محمد علي حسين"
                  className="mt-1 w-full h-11 px-3 rounded-xl border border-border bg-card text-sm"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-muted-foreground">{isAr ? "معرّف تيليغرام" : "Telegram username"}</label>
                <div className="mt-1 flex items-center gap-2 h-11 px-3 rounded-xl border border-border bg-card" dir="ltr">
                  <span className="text-sm text-muted-foreground">@</span>
                  <input
                    value={tgUser}
                    onChange={(e) => setTgUser(e.target.value.replace(/^@/, "").slice(0, 32))}
                    placeholder="username"
                    className="flex-1 bg-transparent text-sm outline-none"
                  />
                </div>
              </div>

              <button
                onClick={continueFromProfile}
                className="w-full inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold"
              >
                {isAr ? "متابعة" : "Continue"}
                <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
              </button>

              {plan && (
                <button
                  onClick={() => { setFullName(plan.full_name ?? ""); setTgUser(plan.telegram_username ?? ""); setPicked(plan.subjects); setEditing(false); }}
                  className="w-full h-10 rounded-xl border border-border text-sm font-medium hover:bg-secondary"
                >
                  {isAr ? "إلغاء" : "Cancel"}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="mb-8 rounded-2xl border border-border bg-card p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <CalendarClock className="w-4.5 h-4.5" />
          </div>
          <div>
            <h2 className="text-base font-bold">{isAr ? "خطة الامتحانات" : "Exam Plan"}</h2>
            <p className="text-xs text-muted-foreground">
              {isAr
                ? "دورة كل 5 أيام حسب الترتيب الذي تختاره — كل الامتحانات الساعة 9 مساءً بتوقيت بغداد."
                : "A 5-day cycle in your chosen order — every exam starts at 9:00 PM Baghdad time."}
            </p>
          </div>
        </div>
        {plan && !editing && (
          <div className="flex items-center gap-2">
            <button onClick={() => { setStage("profile"); setEditing(true); }} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium hover:bg-secondary">
              <Pencil className="w-3.5 h-3.5" />{isAr ? "تعديل" : "Edit"}
            </button>
            <button onClick={removePlan} className="inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-border text-xs font-medium text-destructive hover:bg-secondary">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      {loading && <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground"><Loader2 className="w-4 h-4 animate-spin" />...</div>}

      {!loading && dueItem && !editing && (
        <div className="mt-4 rounded-xl border border-primary/40 bg-primary/10 p-3.5 flex items-start gap-3">
          <Bell className="w-4.5 h-4.5 text-primary mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-semibold">
              {isAr ? `حان موعد امتحان ${label(dueItem.id)}` : `Time for your ${label(dueItem.id)} exam`}
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isAr ? `المرحلة ${dueItem.step + 1} من ${schedule.length} — تاريخ ${dueItem.date}` : `Step ${dueItem.step + 1} of ${schedule.length} — due ${dueItem.date}`}
            </p>
          </div>
          <button onClick={acknowledge} className="h-8 px-3 rounded-lg bg-primary text-primary-foreground text-xs font-semibold shrink-0">
            {isAr ? "تم" : "Got it"}
          </button>
        </div>
      )}

      {!loading && editing && stage === "subjects" && (
        <div className="mt-4 space-y-4">
          <div>
            <p className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? "1) اختر المواد" : "1) Pick your subjects"}</p>
            <div className="flex flex-wrap gap-2">
              {subjects.map((s) => {
                const on = picked.includes(s.id);
                return (
                  <button
                    key={s.id}
                    onClick={() => toggle(s.id)}
                    className={`inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border text-sm font-medium transition-colors ${on ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-secondary"}`}
                  >
                    {on && <Check className="w-3.5 h-3.5" />}
                    {isAr ? s.titleAr : s.titleEn}
                  </button>
                );
              })}
            </div>
          </div>

          {picked.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-muted-foreground mb-2">{isAr ? "2) رتّب المواد (الأول يمتحن أولاً)" : "2) Order them (first is examined first)"}</p>
              <div className="space-y-2">
                {picked.map((id, i) => (
                  <div key={id} className="flex items-center gap-2 rounded-xl border border-border px-3 py-2">
                    <span className="w-6 h-6 rounded-md bg-secondary text-xs font-bold flex items-center justify-center">{i + 1}</span>
                    <span className="flex-1 text-sm font-medium">{label(id)}</span>
                    <span className="text-xs text-muted-foreground">{addDays(plan?.start_date ?? today, examOffsets(picked.length)[i])}</span>
                    <button onClick={() => move(i, -1)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary"><ChevronUp className="w-3.5 h-3.5" /></button>
                    <button onClick={() => move(i, 1)} className="w-7 h-7 rounded-md border border-border flex items-center justify-center hover:bg-secondary"><ChevronDown className="w-3.5 h-3.5" /></button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {picked.length > 0 && (
            <div className="rounded-xl border border-border bg-secondary/40 p-3.5 space-y-1.5">
              <p className="text-xs font-semibold">{isAr ? "كيف ستُوزَّع امتحاناتك خلال 5 أيام؟" : "How your exams are spread over 5 days"}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {isAr
                  ? `اخترت ${picked.length} ${picked.length === 1 ? "مادة" : "مواد"}، لذلك ستمتحن ${picked.length} ${picked.length === 1 ? "مرة" : "امتحانات"} خلال 5 أيام: ${picked
                      .map((id, i) => `${label(id)} في اليوم ${examOffsets(picked.length)[i] + 1}`)
                      .join("، ")}. كل الامتحانات تبدأ الساعة 9 مساءً بتوقيت بغداد، والأيام المتبقية أيام راحة.`
                  : `You picked ${picked.length} subject(s), so you will sit ${picked.length} exam(s) across 5 days: ${picked
                      .map((id, i) => `${label(id)} on day ${examOffsets(picked.length)[i] + 1}`)
                      .join(", ")}. Every exam starts at 9:00 PM Baghdad time; the remaining days are rest days.`}
              </p>
            </div>
          )}

          <div className="rounded-xl border border-primary/40 bg-primary/5 p-3.5">
            <p className="text-xs font-semibold flex items-center gap-1.5"><Send className="w-3.5 h-3.5 text-primary" />{isAr ? "مطلوب: شغّل بوت التنبيهات" : "Required: start the reminders bot"}</p>
            <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
              {isAr
                ? "اضغط ابدأ في البوت لتصلك التنبيهات: صباح يوم الامتحان، قبل ساعة، وقبل 15 دقيقة."
                : "Press Start in the bot to receive reminders: on the exam morning, 1 hour before, and 15 minutes before."}
            </p>
            <a
              href={`https://t.me/${EXAM_BOT}?start=exam`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-xs font-semibold"
            >
              <Send className="w-3.5 h-3.5" />@{EXAM_BOT}
            </a>
          </div>

          <div className="flex items-center gap-2">
            <button onClick={() => setStage("profile")} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-secondary">
              {isAr ? "رجوع" : "Back"}
            </button>
            <button onClick={save} disabled={saving} className="inline-flex items-center gap-2 h-9 px-4 rounded-xl bg-primary text-primary-foreground text-sm font-semibold disabled:opacity-60">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {isAr ? "حفظ الخطة" : "Save plan"}
            </button>
            {plan && (
              <button onClick={() => { setPicked(plan.subjects); setEditing(false); }} className="h-9 px-4 rounded-xl border border-border text-sm font-medium hover:bg-secondary">
                {isAr ? "إلغاء" : "Cancel"}
              </button>
            )}
          </div>
        </div>
      )}

      {!loading && plan && !editing && (
        <div className="mt-4 space-y-2">
          {schedule.map((s) => {
            const isPast = daysBetween(s.date, today) > 0 || plan.acknowledged_step >= s.step;
            const isToday = s.date === today;
            return (
              <div key={s.id} className={`flex items-center gap-3 rounded-xl border px-3 py-2 ${isToday ? "border-primary bg-primary/5" : "border-border"}`}>
                <span className="w-6 h-6 rounded-md bg-secondary text-xs font-bold flex items-center justify-center">{s.step + 1}</span>
                <span className={`flex-1 text-sm font-medium ${isPast && !isToday ? "text-muted-foreground line-through" : ""}`}>{label(s.id)}</span>
                <span className="text-xs text-muted-foreground">{s.date} · {isAr ? "9 مساءً" : EXAM_TIME_LABEL}</span>
              </div>
            );
          })}
          {nextItem && (
            <p className="text-xs text-muted-foreground pt-1">
              {isAr
                ? `الامتحان القادم: ${label(nextItem.id)} بعد ${daysBetween(today, nextItem.date)} يوم`
                : `Next exam: ${label(nextItem.id)} in ${daysBetween(today, nextItem.date)} day(s)`}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ExamPlanPanel;
