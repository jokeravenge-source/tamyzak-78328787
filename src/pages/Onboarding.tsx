import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Atom, FlaskConical, Leaf, BookOpen, Languages as LangIcon, Moon,
  Check, ArrowLeft, ArrowRight, Sparkles, Flame, Layers, Send, ListChecks, Target,
} from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import {
  ONBOARDING_SUBJECTS, weakTopicsFor, topicLabel, subjectLabelFor,
  seedWeakTopicDeck, addSuggestedTodos, saveOnboarding,
  type OnboardingSubject,
} from "@/lib/onboarding";
import { pushTodos } from "@/lib/todosSync";
import {
  logOnboardingStepViewed, logOnboardingStepCompleted,
  logContentUnitCompleted, logFirstFeatureTouch,
} from "@/lib/userEvents";
import type { ChapterMeta } from "@/data/subjectChapters";

const CHANNEL_URL = "https://t.me/Tamayuzak";
const STEP_NAMES = ["subject_picker", "diagnostic", "results", "streak_hook", "dashboard_ready"];
/** MCQ diagnostic (step 2) is disabled until the new MCQ bank lands. */
const STEP_DISPLAY: Record<number, number> = { 1: 1, 3: 2, 4: 3, 5: 4 };
const TOTAL_STEPS = 4;

const ICONS: Record<OnboardingSubject, React.ComponentType<{ className?: string }>> = {
  physics: Atom, chemistry: FlaskConical, biology: Leaf,
  arabic: BookOpen, english: BookOpen, french: LangIcon, islamic: Moon,
};

const T = {
  ar: {
    step: "الخطوة", of: "من",
    s1Tag: "لنبدأ", s1Title: "أي مادة تريد أن تتقنها أولاً؟", s1Sub: "اختر مادة، ثم من 1 إلى 3 مواضيع تشعر أنها نقاط ضعفك.",
    pickTopics: "اختر نقاط ضعفك (1-3)", continue: "متابعة", back: "رجوع",
    s2Tag: "اختبار سريع", s2Title: "خمسة أسئلة فقط", s2Sub: "لنعرف أين أنت بالضبط.",
    s3Tag: "النتيجة", s3Title: "هذه خريطتك", strong: "نقاط قوتك", weak: "تحتاج مراجعة",
    deckReady: "جهّزنا لك مجموعة بطاقات", deckReadyBody: "بطاقة مراجعة متباعدة عن أضعف موضوع لديك، جاهزة الآن.",
    startStudying: "ابدأ الدراسة", later: "لاحقاً",
    s4Tag: "استمر", s4Title: "حافظ على سلسلتك", s4Body: "ارجع غداً لتحافظ على سلسلتك وتكسب 10 نقاط إضافية كل يوم.",
    streak: "سلسلتك الحالية", points: "نقاطك", days: "يوم",
    tgTitle: "تنبيهات تيليغرام", tgBody: "استلم تذكيراً يومياً وإعلانات تميّزك عبر قناتنا.", tgJoin: "اشترك بالقناة", tgSkip: "ليس الآن",
    s5Tag: "جاهز", s5Title: "لوحتك الشخصية جاهزة", s5Body: "رتّبنا شاشتك الرئيسية حول",
    tasksAdded: "أضفنا مهمتين مقترحتين إلى قائمة مهامك.", goDashboard: "اذهب إلى الرئيسية",
    correct: "صحيح", wrong: "خطأ", noQuestions: "لا توجد أسئلة متاحة لهذه المادة الآن.",
  },
  en: {
    step: "Step", of: "of",
    s1Tag: "Let's start", s1Title: "Which subject do you want to master first?", s1Sub: "Pick a subject, then 1–3 topics you feel weakest in.",
    pickTopics: "Pick your weak areas (1-3)", continue: "Continue", back: "Back",
    s2Tag: "Quick check", s2Title: "Just five questions", s2Sub: "So we know exactly where you stand.",
    s3Tag: "Results", s3Title: "Here is your map", strong: "Your strengths", weak: "Needs review",
    deckReady: "A flashcard deck is ready", deckReadyBody: "Spaced-repetition cards for your weakest topic, due right now.",
    startStudying: "Start studying", later: "Later",
    s4Tag: "Keep going", s4Title: "Protect your streak", s4Body: "Come back tomorrow to keep your streak and earn 10 extra points every day.",
    streak: "Current streak", points: "Your points", days: "days",
    tgTitle: "Telegram notifications", tgBody: "Get daily reminders and Tamayzak announcements on our channel.", tgJoin: "Join the channel", tgSkip: "Not now",
    s5Tag: "Ready", s5Title: "Your dashboard is personalized", s5Body: "We reordered your home screen around",
    tasksAdded: "We added two suggested tasks to your to-do list.", goDashboard: "Go to home",
    correct: "Correct", wrong: "Wrong", noQuestions: "No questions available for this subject yet.",
  },
};

export default function Onboarding({
  language,
  onFinish,
}: {
  language: AppLanguage;
  onFinish: (opts: { subject: OnboardingSubject; chapter: number; startStudying: boolean }) => void;
}) {
  const lang: "ar" | "en" = language === "ar" ? "ar" : "en";
  const t = T[lang];
  const isRTL = lang === "ar";

  const [step, setStep] = useState(1);
  const [subject, setSubject] = useState<OnboardingSubject | null>(null);
  const [topics, setTopics] = useState<number[]>([]);
  const answers: boolean[] = [];
  const [deckCount, setDeckCount] = useState(0);
  const [stats, setStats] = useState<{ streak: number; points: number }>({ streak: 0, points: 0 });
  const [tgOptIn, setTgOptIn] = useState(false);

  const topicList: ChapterMeta[] = useMemo(() => (subject ? weakTopicsFor(subject) : []), [subject]);

  useEffect(() => {
    logOnboardingStepViewed(step, STEP_NAMES[step - 1], { subject });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  /* Without the diagnostic, the first picked weak topic is treated as weakest. */
  const weakestTopic = useMemo(() => topics[0] ?? 1, [topics]);

  const weakestMeta = topicList.find((c) => c.n === weakestTopic) ?? topicList[0];

  /* ---------- step transitions ---------- */

  const startDiagnostic = () => {
    if (!subject || topics.length === 0) return;
    logOnboardingStepCompleted(1, STEP_NAMES[0], { subject, topics });
    setStep(3);
  };

  /* auto-generate the deck as soon as the results screen opens */
  useEffect(() => {
    if (step !== 3 || !subject || !weakestMeta) return;
    let cancelled = false;
    (async () => {
      const n = await seedWeakTopicDeck({ subject, chapter: weakestMeta.n, language: lang });
      if (!cancelled) setDeckCount(n);
    })();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, subject, weakestMeta?.n]);

  /* points + streak for the hook screen */
  useEffect(() => {
    if (step !== 4) return;
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u.user) return;
        const { data } = await supabase
          .from("user_progress")
          .select("current_streak, lifetime_points")
          .eq("user_id", u.user.id)
          .maybeSingle();
        if (data) setStats({ streak: data.current_streak ?? 0, points: data.lifetime_points ?? 0 });
      } catch { /* ignore */ }
    })();
  }, [step]);

  const goResultsNext = (startStudying: boolean) => {
    logOnboardingStepCompleted(3, STEP_NAMES[2], { subject, weakest: weakestTopic, deck_cards: deckCount });
    logContentUnitCompleted("onboarding_diagnostic", subject ?? undefined, {
      score: answers.filter(Boolean).length, total: answers.length,
    });
    if (startStudying) {
      logFirstFeatureTouch("flashcards");
      finish(true);
      return;
    }
    setStep(4);
  };

  const goStreakNext = () => {
    logOnboardingStepCompleted(4, STEP_NAMES[3], { telegram_opt_in: tgOptIn });
    setStep(5);
  };

  /* suggested todos when the dashboard screen opens */
  useEffect(() => {
    if (step !== 5 || !subject || !weakestMeta) return;
    const items = addSuggestedTodos({ subject, topic: weakestMeta, language: lang });
    void pushTodos(items);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  const finish = (startStudying: boolean) => {
    if (!subject || !weakestMeta) return;
    saveOnboarding({
      completed: true,
      subject,
      topics,
      weakestTopic: weakestMeta.n,
      score: answers.filter(Boolean).length,
      total: answers.length,
      telegramOptIn: tgOptIn,
      completedAt: new Date().toISOString(),
    });
    logOnboardingStepCompleted(5, STEP_NAMES[4], { subject, start_studying: startStudying });
    onFinish({ subject, chapter: weakestMeta.n, startStudying });
  };

  const Next = isRTL ? ArrowLeft : ArrowRight;
  const glass = "rounded-3xl border border-border bg-card/75 backdrop-blur-xl shadow-[var(--shadow-card)]";

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background px-4 py-8 sm:py-12">
      <div className="mx-auto w-full max-w-2xl">
        {/* progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between text-xs font-semibold text-muted-foreground mb-2">
            <span>{t.step} {STEP_DISPLAY[step] ?? 1} {t.of} {TOTAL_STEPS}</span>
            <span className="text-primary">Tamayzak</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
            <motion.div
              className="h-full rounded-full bg-primary"
              animate={{ width: `${((STEP_DISPLAY[step] ?? 1) / TOTAL_STEPS) * 100}%` }}
              transition={{ duration: 0.4 }}
            />
          </div>
        </div>

        <AnimatePresence mode="wait">
          {/* ---------- 1. subject + weak areas ---------- */}
          {step === 1 && (
            <motion.section key="s1" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className={`${glass} p-5 sm:p-7`}>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">{t.s1Tag}</span>
              <h1 className="mt-3 text-xl sm:text-2xl font-bold text-foreground">{t.s1Title}</h1>
              <p className="mt-1 text-sm text-muted-foreground">{t.s1Sub}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                {ONBOARDING_SUBJECTS.map((s) => {
                  const Icon = ICONS[s.code];
                  const active = subject === s.code;
                  return (
                    <button
                      key={s.code}
                      onClick={() => { setSubject(s.code); setTopics([]); }}
                      className={`min-h-[76px] rounded-2xl border p-3 flex items-center gap-3 text-start transition-all ${active ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`}
                    >
                      <span className={`w-10 h-10 shrink-0 rounded-xl flex items-center justify-center ${active ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                        <Icon className="w-5 h-5" />
                      </span>
                      <span className="font-semibold text-sm text-foreground">{lang === "ar" ? s.ar : s.en}</span>
                    </button>
                  );
                })}
              </div>

              {subject && (
                <div className="mt-6">
                  <p className="text-sm font-semibold text-foreground mb-3">{t.pickTopics}</p>
                  <div className="flex flex-wrap gap-2">
                    {topicList.map((c) => {
                      const active = topics.includes(c.n);
                      return (
                        <button
                          key={c.n}
                          onClick={() =>
                            setTopics((prev) =>
                              prev.includes(c.n) ? prev.filter((x) => x !== c.n) : prev.length >= 3 ? prev : [...prev, c.n]
                            )
                          }
                          className={`min-h-[44px] rounded-2xl border px-4 py-2 text-sm font-medium transition-all ${active ? "border-primary bg-primary/15 text-primary" : "border-border bg-card text-foreground hover:border-primary/50"}`}
                        >
                          {active && <Check className="inline w-4 h-4 me-1" />}
                          {topicLabel(c, lang)}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <button
                disabled={!subject || topics.length === 0}
                onClick={startDiagnostic}
                className="mt-7 w-full min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-bold disabled:opacity-40 flex items-center justify-center gap-2"
              >
                {t.continue} <Next className="w-4 h-4" />
              </button>
            </motion.section>
          )}

          {/* ---------- 3. results ---------- */}
          {step === 3 && (
            <motion.section key="s3" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className={`${glass} p-5 sm:p-7`}>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">{t.s3Tag}</span>
              <h2 className="mt-3 text-xl font-bold text-foreground">{t.s3Title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {subjectLabelFor(subject!, lang)}
              </p>

              <div className="mt-5 space-y-3">
                {topics.map((n) => {
                  const meta = topicList.find((c) => c.n === n);
                  const strong = false;
                  const pct = 100;
                  return (
                    <div key={n} className="rounded-2xl border border-border bg-card p-3">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-semibold text-foreground">{meta ? topicLabel(meta, lang) : n}</span>
                        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${strong ? "bg-emerald-500/15 text-emerald-600" : "bg-amber-500/15 text-amber-600"}`}>
                          {t.weak}
                        </span>
                      </div>
                      <div className="mt-2 h-1.5 rounded-full bg-muted overflow-hidden">
                        <div className={`h-full rounded-full ${strong ? "bg-emerald-500" : "bg-amber-500"}`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-5 rounded-2xl border border-primary/40 bg-primary/5 p-4 flex items-start gap-3">
                <Layers className="w-5 h-5 text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold text-foreground">
                    {t.deckReady}{weakestMeta ? ` — ${topicLabel(weakestMeta, lang)}` : ""} {deckCount ? `(${deckCount})` : ""}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">{t.deckReadyBody}</p>
                </div>
              </div>

              <div className="mt-6 flex flex-col sm:flex-row gap-3">
                <button onClick={() => goResultsNext(true)} className="flex-1 min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                  <Sparkles className="w-4 h-4" /> {t.startStudying}
                </button>
                <button onClick={() => goResultsNext(false)} className="min-h-[52px] rounded-2xl border border-border px-5 font-semibold text-foreground">
                  {t.later}
                </button>
              </div>
            </motion.section>
          )}

          {/* ---------- 4. streak / points hook ---------- */}
          {step === 4 && (
            <motion.section key="s4" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className={`${glass} p-5 sm:p-7`}>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">{t.s4Tag}</span>
              <h2 className="mt-3 text-xl font-bold text-foreground">{t.s4Title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">{t.s4Body}</p>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <Flame className="w-6 h-6 mx-auto text-amber-500" />
                  <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">{stats.streak}</p>
                  <p className="text-[11px] text-muted-foreground">{t.streak} · {t.days}</p>
                </div>
                <div className="rounded-2xl border border-border bg-card p-4 text-center">
                  <Target className="w-6 h-6 mx-auto text-primary" />
                  <p className="mt-2 text-2xl font-bold text-foreground tabular-nums">{stats.points}</p>
                  <p className="text-[11px] text-muted-foreground">{t.points}</p>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-border bg-card p-4">
                <div className="flex items-center gap-2">
                  <Send className="w-4 h-4 text-primary" />
                  <p className="text-sm font-bold text-foreground">{t.tgTitle}</p>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{t.tgBody}</p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={CHANNEL_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setTgOptIn(true)}
                    className="flex-1 min-h-[44px] rounded-xl bg-primary/10 border border-primary/30 text-primary font-semibold text-sm flex items-center justify-center"
                  >
                    {t.tgJoin}
                  </a>
                  <button onClick={() => setTgOptIn(false)} className="min-h-[44px] rounded-xl border border-border px-4 text-sm text-muted-foreground">
                    {t.tgSkip}
                  </button>
                </div>
              </div>

              <button onClick={goStreakNext} className="mt-6 w-full min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                {t.continue} <Next className="w-4 h-4" />
              </button>
            </motion.section>
          )}

          {/* ---------- 5. personalized dashboard ---------- */}
          {step === 5 && (
            <motion.section key="s5" initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} className={`${glass} p-5 sm:p-7`}>
              <span className="inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full border border-primary/20">{t.s5Tag}</span>
              <h2 className="mt-3 text-xl font-bold text-foreground">{t.s5Title}</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {t.s5Body} {subjectLabelFor(subject!, lang)}{weakestMeta ? ` — ${topicLabel(weakestMeta, lang)}` : ""}.
              </p>
              <div className="mt-5 rounded-2xl border border-border bg-card p-4 flex items-start gap-3">
                <ListChecks className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <p className="text-sm text-foreground">{t.tasksAdded}</p>
              </div>
              <button onClick={() => finish(false)} className="mt-6 w-full min-h-[52px] rounded-2xl bg-primary text-primary-foreground font-bold flex items-center justify-center gap-2">
                {t.goDashboard} <Next className="w-4 h-4" />
              </button>
            </motion.section>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
