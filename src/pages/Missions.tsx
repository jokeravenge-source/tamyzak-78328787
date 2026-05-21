import { useEffect, useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ListChecks, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { missionsData, missionsOrder, type MissionChapter } from "@/data/missions";
import { type AppLanguage } from "@/components/LanguageGate";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";

const copy = {
  en: {
    title: "My Missions",
    desc: "Track your progress chapter by chapter. Each topic is a mission.",
    back: "Back",
    overall: "Overall progress",
    chapters: "chapters",
    missions: "missions",
    done: "done",
    pickSubject: "Pick a subject",
    backSubjects: "All subjects",
    backChapters: "All chapters",
    signIn: "Sign in to track your missions.",
    loading: "Loading…",
  },
  ar: {
    title: "مهماتي",
    desc: "تابع تقدمك فصلاً بفصل. كل موضوع يمثل مهمة.",
    back: "رجوع",
    overall: "التقدم الكلي",
    chapters: "فصول",
    missions: "مهام",
    done: "منجزة",
    pickSubject: "اختر مادة",
    backSubjects: "كل المواد",
    backChapters: "كل الفصول",
    signIn: "سجّل الدخول لتتبع مهماتك.",
    loading: "جارٍ التحميل…",
  },
} as const;

type ProgressRow = { id: string; topic_key: string; subject: string; completed: boolean };

const Missions = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [rows, setRows] = useState<ProgressRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [subject, setSubject] = useState<string | null>(null);
  const [chapter, setChapter] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
  }, []);

  useEffect(() => {
    if (!userId) {
      setLoading(false);
      return;
    }
    supabase
      .from("mission_progress")
      .select("id, topic_key, subject, completed")
      .then(({ data }) => {
        setRows(data ?? []);
        setLoading(false);
      });
  }, [userId]);

  const doneSet = useMemo(
    () => new Set(rows.filter((r) => r.completed).map((r) => r.topic_key)),
    [rows],
  );
  const rowByKey = useMemo(() => {
    const m = new Map<string, ProgressRow>();
    rows.forEach((r) => m.set(r.topic_key, r));
    return m;
  }, [rows]);

  const subjectStats = (subj: string) => {
    const data = missionsData[subj];
    if (!data) return { total: 0, done: 0, pct: 0 };
    let total = 0,
      done = 0;
    data.chapters.forEach((c) => {
      total += c.topics.length;
      done += c.topics.filter((tp) => doneSet.has(tp.key)).length;
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  };

  const overall = useMemo(() => {
    let total = 0,
      done = 0;
    missionsOrder.forEach((s) => {
      const st = subjectStats(s);
      total += st.total;
      done += st.done;
    });
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [doneSet]);

  const toggle = async (topicKey: string, subj: string, title: string) => {
    if (!userId) {
      toast.error(t.signIn);
      return;
    }
    const existing = rowByKey.get(topicKey);
    const next = !(existing?.completed ?? false);
    if (existing) {
      setRows((rs) =>
        rs.map((r) => (r.id === existing.id ? { ...r, completed: next } : r)),
      );
      const { error } = await supabase
        .from("mission_progress")
        .update({ completed: next, updated_at: new Date().toISOString() })
        .eq("id", existing.id);
      if (error) toast.error(error.message);
    } else {
      const { data, error } = await supabase
        .from("mission_progress")
        .insert({
          user_id: userId,
          subject: subj,
          topic_key: topicKey,
          completed: next,
        })
        .select("id, topic_key, subject, completed")
        .single();
      if (error) toast.error(error.message);
      else if (data) setRows((rs) => [...rs, data as ProgressRow]);
    }
  };

  const subjData = subject ? missionsData[subject] : null;
  const chapData: MissionChapter | undefined = subjData?.chapters.find(
    (c) => c.key === chapter,
  );

  return (
    <main
      className="min-h-screen px-4 py-12 md:py-16 relative overflow-hidden"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={() => {
          if (chapter) setChapter(null);
          else if (subject) setSubject(null);
          else onBack();
        }}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        aria-label={t.back}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
            <ListChecks className="inline w-3.5 h-3.5 mr-1" />
            {t.title}
          </span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold gradient-text leading-[1.1] mb-3">
          {t.title}
        </h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{t.desc}</p>

        {userId && (
          <div className="mt-8 max-w-xl mx-auto rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-5">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-muted-foreground">{t.overall}</span>
              <span className="text-sm font-semibold text-primary">{overall.pct}%</span>
            </div>
            <Progress value={overall.pct} className="h-2" />
            <div className="text-xs text-muted-foreground mt-2">
              {overall.done} / {overall.total} {t.missions} {t.done}
            </div>
          </div>
        )}
        {!userId && !loading && (
          <p className="mt-6 text-sm text-muted-foreground">{t.signIn}</p>
        )}
      </header>

      <section className="max-w-5xl mx-auto mt-12 z-10 relative">
        {!subject && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {missionsOrder.map((s, i) => {
              const data = missionsData[s];
              const st = subjectStats(s);
              return (
                <button
                  key={s}
                  onClick={() => setSubject(s)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group text-left rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5 hover:-translate-y-1 hover:border-primary transition-all animate-fade-up"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xl font-semibold text-foreground">
                      {language === "ar" ? data.ar : data.en}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                    <span>
                      {data.chapters.length} {t.chapters} · {st.total} {t.missions}
                    </span>
                    <span className="text-primary font-semibold text-sm">{st.pct}%</span>
                  </div>
                  <Progress value={st.pct} className="h-2" />
                </button>
              );
            })}
          </div>
        )}

        {subject && !chapter && subjData && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {subjData.chapters.map((c, i) => {
              const done = c.topics.filter((tp) => doneSet.has(tp.key)).length;
              const pct = c.topics.length
                ? Math.round((done / c.topics.length) * 100)
                : 0;
              return (
                <button
                  key={c.key}
                  onClick={() => setChapter(c.key)}
                  style={{ animationDelay: `${i * 60}ms` }}
                  className="group text-left rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-5 hover:-translate-y-1 hover:border-primary transition-all animate-fade-up"
                >
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-semibold text-foreground">
                      {language === "ar" ? c.ar : c.en}
                    </h3>
                    <ArrowRight className="w-4 h-4 text-primary group-hover:translate-x-1 transition-transform" />
                  </div>
                  <div className="flex items-center justify-between mb-2 text-xs text-muted-foreground">
                    <span>
                      {done}/{c.topics.length} {t.done}
                    </span>
                    <span className="text-primary font-semibold text-sm">{pct}%</span>
                  </div>
                  <Progress value={pct} className="h-2" />
                </button>
              );
            })}
          </div>
        )}

        {subject && chapter && chapData && (
          <div className="space-y-3">
            {chapData.topics.map((tp, i) => {
              const done = doneSet.has(tp.key);
              return (
                <button
                  key={tp.key}
                  onClick={() =>
                    toggle(tp.key, subject, language === "ar" ? tp.ar : tp.en)
                  }
                  style={{ animationDelay: `${i * 30}ms` }}
                  className={`w-full flex items-center gap-4 rounded-2xl border p-4 backdrop-blur transition-all animate-fade-up text-left ${
                    done
                      ? "border-primary/60 bg-primary/10"
                      : "border-white/10 bg-secondary/40 hover:border-primary/50"
                  }`}
                >
                  <span
                    className={`w-6 h-6 rounded-md flex items-center justify-center border ${
                      done
                        ? "bg-primary border-primary"
                        : "border-muted-foreground/40"
                    }`}
                  >
                    {done && <Check className="w-4 h-4 text-primary-foreground" />}
                  </span>
                  <span
                    className={`flex-1 text-sm md:text-base ${
                      done ? "text-muted-foreground line-through" : "text-foreground"
                    }`}
                  >
                    {language === "ar" ? tp.ar : tp.en}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </section>
    </main>
  );
};

export default Missions;