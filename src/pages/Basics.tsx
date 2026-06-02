import { useEffect, useState } from "react";
import { ArrowLeft, ArrowRight, Sparkles, Layers, BookMarked, FileText, GraduationCap, Microscope, LogOut, Bell, X, ListChecks, Newspaper, Timer, ScrollText } from "lucide-react";
import { motion } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import StreakTree from "@/components/StreakTree";
import CurvedNavBar from "@/components/CurvedNavBar";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useSubscription } from "@/hooks/useSubscription";
import ExcellenceCompanion from "@/components/ExcellenceCompanion";

export type BasicsChoice =
  | "flashcards"
  | "malazam"
  | "summaries"
  | "sessions"
  | "biologyDrawings"
  | "todo"
  | "news"
  | "ministerialBank";

const MOTIVATIONAL_PHRASES = {
  en: [
    "Believe in yourself!",
    "You are unstoppable!",
    "Dream big, work hard!",
    "One step closer to greatness!",
    "Your future starts now!",
    "Knowledge is power!",
    "Stay curious, stay winning!",
    "Make today count!",
    "Success is a journey!",
    "You are capable of amazing things!",
    "Push your limits!",
    "Excellence is a habit!",
    "Study now, shine later!",
    "Every effort matters!",
    "You got this!",
    "Progress, not perfection!",
    "Keep moving forward!",
    "Your time is now!",
    "Hard work pays off!",
    "Be the best version of you!",
  ],
  ar: [
    "آمن بنفسك!",
    "أنت لا يُقهر!",
    "احلم كبيراً، اجتهد كثيراً!",
    "خطوة أقرب إلى العظمة!",
    "مستقبلك يبدأ الآن!",
    "العلم قوة!",
    "كن فضولياً، كن منتصراً!",
    "اجعل هذا اليوم يُحتسب!",
    "النجاح رحلة!",
    "أنت قادر على أمور مذهلة!",
    "ادفع حدودك!",
    "التميز عادة!",
    "ادرس الآن، تلألأ لاحقاً!",
    "كل جهد يهم!",
    "أنت تستطيع!",
    "التقدم، لا الكمال!",
    "استمر بالتقدم!",
    "وقتك هو الآن!",
    "العمل الشاق يُثمر!",
    "كن النسخة الأفضل من نفسك!",
  ],
} as const;

const copy = {
  en: {
    badge: "Home",
    description: "Your essential study tools, all in one place.",
    hi: "Hi",
    items: {
      flashcards: { title: "Flashcards", subtitle: "Smart Q&A cards across every subject." },
      malazam: { title: "Malazam", subtitle: "Curated booklets and notes per subject." },
      summaries: { title: "Notes & Summaries", subtitle: "Upload and browse approved notes." },
      sessions: { title: "Sessions", subtitle: "Track study time and climb the board." },
      biologyDrawings: { title: "Biology Drawings", subtitle: "Label diagrams chapter by chapter." },
      todo: { title: "To-Do List", subtitle: "Plan tasks and celebrate when you finish." },
      news: { title: "News", subtitle: "Latest announcements and updates." },
      ministerialBank: { title: "Ministerial Questions Bank", subtitle: "Past ministerial questions by chapter." },
    },
  },
  ar: {
    badge: "الرئيسية",
    description: "أدواتك الدراسية الأساسية في مكان واحد.",
    hi: "أهلاً",
    items: {
      flashcards: { title: "البطاقات التعليمية", subtitle: "بطاقات سؤال وجواب لكل المواد." },
      malazam: { title: "الملازم", subtitle: "ملازم ومذكرات لكل مادة." },
      summaries: { title: "ملاحظات وملخصات", subtitle: "ارفع وتصفّح الملاحظات المعتمدة." },
      sessions: { title: "الجلسات", subtitle: "احسب وقت دراستك وتصدّر اللوحة." },
      biologyDrawings: { title: "رسومات الأحياء", subtitle: "ميّز أجزاء الرسومات فصلاً بفصل." },
      todo: { title: "قائمة المهام", subtitle: "نظّم مهامك واحتفل بإنجازها." },
      news: { title: "الأخبار", subtitle: "آخر الإعلانات والتحديثات." },
      ministerialBank: { title: "بنك الوزاريات", subtitle: "أسئلة وزارية سابقة مرتبة حسب الفصل." },
    },
  },
} as const;

type Notif = { id: string; title: string; body: string; created_at: string };

const Basics = ({
  language,
  onChangeLanguage,
  onSelect,
  onNav,
}: {
  language: AppLanguage;
  onChangeLanguage: () => void;
  onSelect: (c: BasicsChoice) => void;
  onNav: (c: MainMenuChoice) => void;
}) => {
  const t = copy[language];
  const phrases = MOTIVATIONAL_PHRASES[language];
  const [motivationalPhrase] = useState(() => phrases[Math.floor(Math.random() * phrases.length)]);
  const { isPremium } = useSubscription();
  const items: { key: BasicsChoice; Icon: React.ComponentType<{ className?: string }> }[] = [
    { key: "flashcards", Icon: Layers },
    { key: "malazam", Icon: BookMarked },
    { key: "ministerialBank", Icon: ScrollText },
    { key: "summaries", Icon: FileText },
    { key: "sessions", Icon: GraduationCap },
    { key: "biologyDrawings", Icon: Microscope },
    { key: "todo", Icon: ListChecks },
    { key: "news", Icon: Newspaper },
  ];

  const READ_KEY = "notif_read_ids_v1";
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const [readIds, setReadIds] = useState<string[]>(() => {
    try { return JSON.parse(localStorage.getItem(READ_KEY) || "[]"); } catch { return []; }
  });
  useEffect(() => {
    const load = async () => {
      const { data } = await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(10);
      setNotifs((data ?? []) as Notif[]);
    };
    load();
    const ch = supabase.channel("notifs").on("postgres_changes", { event: "*", schema: "public", table: "notifications" }, load).subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);
  const unread = notifs.filter((n) => !readIds.includes(n.id));
  const dismiss = (id: string) => {
    const next = [...readIds, id];
    setReadIds(next);
    localStorage.setItem(READ_KEY, JSON.stringify(next));
  };
  const signOut = async () => { await supabase.auth.signOut(); };

  const TARGET = new Date(2026, 5, 13, 7, 0, 0).getTime();
  const [now, setNow] = useState<number>(() => Date.now());
  const [showTimer, setShowTimer] = useState<boolean>(() => localStorage.getItem("countdown_jun13_hidden_v1") !== "1");
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);
  const diff = Math.max(0, TARGET - now);
  const cd = {
    d: Math.floor(diff / 86400000),
    h: Math.floor((diff % 86400000) / 3600000),
    m: Math.floor((diff % 3600000) / 60000),
    s: Math.floor((diff % 60000) / 1000),
  };
  const timerLabel = language === "ar" ? "العد التنازلي حتى ١٣ يونيو، ٧ صباحاً" : "Countdown to June 13, 7:00 AM";
  const units = language === "ar"
    ? { d: "يوم", h: "ساعة", m: "دقيقة", s: "ثانية" }
    : { d: "Days", h: "Hours", m: "Min", s: "Sec" };
  const dismissTimer = () => {
    localStorage.setItem("countdown_jun13_hidden_v1", "1");
    setShowTimer(false);
  };

  const [username, setUsername] = useState<string>(() => localStorage.getItem("app_display_name_v1") || "");
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      if (p?.display_name) {
        setUsername(p.display_name);
        localStorage.setItem("app_display_name_v1", p.display_name);
      }
    })();
    const onChange = () => setUsername(localStorage.getItem("app_display_name_v1") || "");
    window.addEventListener("app:username-changed", onChange);
    return () => window.removeEventListener("app:username-changed", onChange);
  }, []);

  return (
    <>
    <motion.main
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut" }}
      className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onChangeLanguage}
        aria-label={language === "ar" ? "تغيير اللغة" : "Change language"}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <button
        onClick={signOut}
        aria-label={language === "ar" ? "تسجيل الخروج" : "Sign out"}
        className="absolute top-6 right-6 z-20 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <LogOut className="w-4 h-4" />
        <span className="hidden sm:inline">{language === "ar" ? "خروج" : "Sign out"}</span>
      </button>

      {unread.length > 0 && (
        <div className="max-w-3xl mx-auto mb-6 space-y-2 relative z-10">
          {unread.map((n) => (
            <div key={n.id} className="flex items-start gap-3 rounded-2xl p-4 border border-primary/40 bg-primary/10 backdrop-blur animate-fade-up">
              <Bell className="w-5 h-5 text-primary shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h4 className="font-semibold text-foreground">{n.title}</h4>
                {n.body && <p className="text-sm text-muted-foreground mt-0.5 whitespace-pre-wrap">{n.body}</p>}
              </div>
              <button onClick={() => dismiss(n.id)} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      )}

      {showTimer && (
        <div className="max-w-3xl mx-auto mb-6 relative z-10">
          <div className="relative rounded-3xl p-5 border border-primary/40 bg-gradient-to-br from-primary/15 via-accent/10 to-primary/5 backdrop-blur shadow-[var(--shadow-glow)] overflow-hidden">
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
            <div className="relative flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center bg-primary/20">
                <Timer className="w-5 h-5 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{language === "ar" ? "موعد مهم" : "Save the date"}</p>
                <h4 className="font-semibold text-foreground truncate">{timerLabel}</h4>
              </div>
              <button onClick={dismissTimer} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="relative grid grid-cols-4 gap-2 sm:gap-3">
              {([
                { v: cd.d, l: units.d },
                { v: cd.h, l: units.h },
                { v: cd.m, l: units.m },
                { v: cd.s, l: units.s },
              ] as const).map((u, i) => (
                <div key={i} className="rounded-2xl border border-primary/30 bg-secondary/60 backdrop-blur py-3 text-center">
                  <div className="text-2xl sm:text-3xl font-bold gradient-text tabular-nums">{String(u.v).padStart(2, "0")}</div>
                  <div className="text-[10px] sm:text-xs uppercase tracking-wider text-muted-foreground mt-1">{u.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      <header className="text-center max-w-3xl mx-auto z-10 relative">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">{motivationalPhrase}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{t.description}</p>
        {username && (
          <p className="mt-3 text-sm text-primary font-medium inline-flex items-center gap-2 justify-center">
            {t.hi}, {username} 👋
            {isPremium && <PremiumBadge size="sm" />}
          </p>
        )}
      </header>

      <motion.section
        initial="hidden"
        animate="show"
        variants={{ hidden: {}, show: { transition: { staggerChildren: 0.07 } } }}
        className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative"
      >
        {items.map((it) => {
          const Icon = it.Icon;
          const meta = t.items[it.key];
          return (
            <motion.button
              key={it.key}
              variants={{ hidden: { opacity: 0, y: 24 }, show: { opacity: 1, y: 0 } }}
              whileHover={{ y: -6 }}
              whileTap={{ scale: 0.97 }}
              transition={{ duration: 0.35, ease: "easeOut" }}
              onClick={() => onSelect(it.key)}
              className="group relative text-left rounded-3xl p-6 h-44 border border-primary/40 bg-secondary/40 backdrop-blur overflow-hidden cursor-pointer shadow-lg hover:border-primary hover:shadow-[var(--shadow-glow)]"
            >
              <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }} />
              <div className="relative z-10 flex items-start justify-between">
                <div className="w-12 h-12 rounded-2xl flex items-center justify-center bg-primary/15">
                  <Icon className="w-6 h-6 text-primary" />
                </div>
                <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
              </div>
              <div className="relative z-10 mt-6">
                <h3 className="text-2xl font-semibold mb-1 text-foreground">{meta.title}</h3>
                <p className="text-sm text-muted-foreground">{meta.subtitle}</p>
              </div>
            </motion.button>
          );
        })}
      </motion.section>

      <StreakTree language={language} />
    </motion.main>
      <CurvedNavBar language={language} active="basics" onSelect={onNav} />
      <ExcellenceCompanion language={language} />
      </>
  );
};

export default Basics;