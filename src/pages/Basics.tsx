import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowLeft, Layers, BookMarked, FileText, GraduationCap, Microscope,
  LogOut, Bell, X, ListChecks, Newspaper, Timer, ScrollText, Network,
  Globe, Trophy, Target, HelpCircle, Headphones, Lightbulb, Sparkles,
  Crown, UserCog, BookOpen, Heart, Users, Settings,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { useSubscription } from "@/hooks/useSubscription";
import ExcellenceCompanion from "@/components/ExcellenceCompanion";
import { missionsData, missionsOrder } from "@/data/missions";

export type BasicsChoice =
  | "flashcards"
  | "malazam"
  | "summaries"
  | "sessions"
  | "biologyDrawings"
  | "todo"
  | "news"
  | "ministerialBank"
  | "mindmap";

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
      mindmap: { title: "Mind Map", subtitle: "AI builds a clean mind map from any topic or file." },
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
      mindmap: { title: "الخريطة الذهنية", subtitle: "ينشئ الذكاء خريطة ذهنية من أي موضوع أو ملف." },
    },
  },
} as const;

type Notif = { id: string; title: string; body: string; link: string | null; created_at: string };

type NavItem = {
  key: MainMenuChoice;
  labelEn: string;
  labelAr: string;
  Icon: React.ComponentType<{ className?: string }>;
};

const NAV_GROUPS: { titleEn: string; titleAr: string; items: NavItem[] }[] = [
  {
    titleEn: "Study",
    titleAr: "الدراسة",
    items: [
      { key: "flashcards", labelEn: "Flashcards", labelAr: "البطاقات", Icon: Layers },
      { key: "summaries", labelEn: "Summaries", labelAr: "الملخصات", Icon: FileText },
      { key: "mcq", labelEn: "MCQ Generator", labelAr: "مولّد الأسئلة", Icon: HelpCircle },
      { key: "mindmap", labelEn: "Mind Map", labelAr: "الخريطة الذهنية", Icon: Network },
      { key: "videoNotes", labelEn: "Video Notes", labelAr: "ملاحظات الفيديو", Icon: Headphones },
      { key: "ministerialBank", labelEn: "Ministerial Bank", labelAr: "بنك الوزاريات", Icon: ScrollText },
      { key: "malazam", labelEn: "Malazam", labelAr: "الملازم", Icon: BookMarked },
      { key: "biologyDrawings", labelEn: "Biology Drawings", labelAr: "رسومات الأحياء", Icon: Microscope },
      { key: "essay", labelEn: "Essay Coach", labelAr: "مدرّب المقالات", Icon: BookOpen },
    ],
  },
  {
    titleEn: "Progress",
    titleAr: "التقدم",
    items: [
      { key: "sessions", labelEn: "Sessions", labelAr: "الجلسات", Icon: GraduationCap },
      { key: "missions", labelEn: "Missions", labelAr: "المهمات", Icon: Target },
      { key: "todo", labelEn: "To-Do List", labelAr: "قائمة المهام", Icon: ListChecks },
      { key: "leaderboard", labelEn: "Leaderboard", labelAr: "المتصدرون", Icon: Trophy },
    ],
  },
  {
    titleEn: "Community",
    titleAr: "المجتمع",
    items: [
      { key: "news", labelEn: "News", labelAr: "الأخبار", Icon: Newspaper },
      { key: "advices", labelEn: "Advices", labelAr: "النصائح", Icon: Lightbulb },
    ],
  },
  {
    titleEn: "Account",
    titleAr: "الحساب",
    items: [
      { key: "account", labelEn: "Account Center", labelAr: "مركز الحساب", Icon: UserCog },
      { key: "premium", labelEn: "Premium", labelAr: "بريميوم", Icon: Crown },
    ],
  },
];

// Featured "Study Tools" cards on the dashboard
const FEATURED: { key: MainMenuChoice; Icon: React.ComponentType<{ className?: string }>; tintBg: string; tintText: string }[] = [
  { key: "flashcards",      Icon: Layers,     tintBg: "bg-blue-50",    tintText: "text-blue-600" },
  { key: "ministerialBank", Icon: ScrollText, tintBg: "bg-amber-50",   tintText: "text-amber-600" },
  { key: "summaries",       Icon: FileText,   tintBg: "bg-violet-50",  tintText: "text-violet-600" },
  { key: "mcq",             Icon: HelpCircle, tintBg: "bg-rose-50",    tintText: "text-rose-600" },
  { key: "mindmap",         Icon: Network,    tintBg: "bg-cyan-50",    tintText: "text-cyan-600" },
  { key: "leaderboard",     Icon: Trophy,     tintBg: "bg-emerald-50", tintText: "text-emerald-600" },
];

const FEATURED_COPY = {
  en: {
    flashcards: { title: "Flashcards", subtitle: "Smart Q&A cards across every subject." },
    ministerialBank: { title: "Ministerial Bank", subtitle: "Past ministerial questions by chapter." },
    summaries: { title: "Notes & Summaries", subtitle: "Upload and browse approved notes." },
    mcq: { title: "MCQ Generator", subtitle: "Get multiple-choice questions from any file." },
    mindmap: { title: "Mind Map", subtitle: "AI builds a clean map from any topic." },
    leaderboard: { title: "Leaderboard", subtitle: "See where you stand this week." },
  },
  ar: {
    flashcards: { title: "البطاقات", subtitle: "بطاقات سؤال وجواب لكل المواد." },
    ministerialBank: { title: "بنك الوزاريات", subtitle: "أسئلة وزارية سابقة حسب الفصل." },
    summaries: { title: "ملخصات", subtitle: "ارفع وتصفّح ملاحظات معتمدة." },
    mcq: { title: "مولّد الأسئلة", subtitle: "احصل على اختيارات من متعدد من أي ملف." },
    mindmap: { title: "الخريطة الذهنية", subtitle: "خريطة مرتبة بالذكاء الاصطناعي." },
    leaderboard: { title: "المتصدرون", subtitle: "اعرف ترتيبك هذا الأسبوع." },
  },
} as const;

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
  const phrases = MOTIVATIONAL_PHRASES[language];
  const [motivationalPhrase] = useState(() => phrases[Math.floor(Math.random() * phrases.length)]);
  const { isPremium } = useSubscription();
  const fc = FEATURED_COPY[language];
  const [activeKey, setActiveKey] = useState<MainMenuChoice>("flashcards");
  const [activeGroup, setActiveGroup] = useState<string>(NAV_GROUPS[0].titleEn);
  const [missionsDone, setMissionsDone] = useState<number>(0);
  const [showAllTools, setShowAllTools] = useState<boolean>(false);

  // Total missions across all subjects/chapters
  const missionsTotal = (() => {
    let total = 0;
    missionsOrder.forEach((s) => {
      const data = missionsData[s];
      data?.chapters.forEach((c) => { total += c.topics.length; });
    });
    return total;
  })();

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data } = await supabase
        .from("mission_progress")
        .select("completed")
        .eq("user_id", u.user.id)
        .eq("completed", true);
      setMissionsDone((data ?? []).length);
    })();
  }, []);

  const missionsPct = missionsTotal ? Math.min(100, Math.round((missionsDone / missionsTotal) * 100)) : 0;

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

  const isRTL = language === "ar";
  const navigate = (k: MainMenuChoice) => {
    setActiveKey(k);
    // sync active group
    const grp = NAV_GROUPS.find((g) => g.items.some((it) => it.key === k));
    if (grp) setActiveGroup(grp.titleEn);
    // Featured BasicsChoice keys still flow through onSelect to use the basic back-target
    const basicsKeys = new Set<MainMenuChoice>([
      "flashcards", "malazam", "summaries", "sessions", "biologyDrawings",
      "todo", "news", "ministerialBank", "mindmap",
    ]);
    if (basicsKeys.has(k)) onSelect(k as BasicsChoice);
    else onNav(k);
  };

  const GROUP_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
    Study: Layers,
    Progress: Target,
    Community: Users,
    Account: Settings,
  };
  const currentGroup = NAV_GROUPS.find((g) => g.titleEn === activeGroup) ?? NAV_GROUPS[0];

  const sidebarTitle = { en: "Sections", ar: "الأقسام" }[language];
  const welcome = {
    en: { hi: "Welcome back", sub: "Pick up exactly where you left off." },
    ar: { hi: "أهلاً بعودتك", sub: "تابع من حيث توقفت." },
  }[language];
  const cta = {
    en: { primary: "Start studying", secondary: "View missions" },
    ar: { primary: "ابدأ الدراسة", secondary: "اطلع على المهمات" },
  }[language];
  const recCopy = {
    en: { tag: "Recommended next step", title: motivationalPhrase, body: "Open your flashcards deck and review what you scheduled today.", resume: "Resume studying", view: "View summary", progress: "Progress" },
    ar: { tag: "خطوتك التالية المقترحة", title: motivationalPhrase, body: "افتح بطاقاتك وراجع ما خططت له اليوم.", resume: "استئناف الدراسة", view: "عرض الملخص", progress: "التقدم" },
  }[language];
  const toolsHeader = { en: "Study tools", ar: "أدوات الدراسة" }[language];
  const viewAll = { en: "View all tools", ar: "عرض كل الأدوات" }[language];

  const SidebarBody = () => (
    <>
      <div className="px-6 py-5 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-4.5 h-4.5 text-primary-foreground" />
          </div>
          <div>
            <p className="text-base font-bold text-primary leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>tamayzak</p>
            <p className="text-[10px] text-muted-foreground uppercase tracking-wider">{sidebarTitle}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-6">
        {NAV_GROUPS.map((g) => (
          <div key={g.titleEn}>
            <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 px-2">
              {language === "ar" ? g.titleAr : g.titleEn}
            </p>
            <ul className="space-y-0.5">
              {g.items.map((it) => {
                const Icon = it.Icon;
                const active = activeKey === it.key;
                return (
                  <li key={it.key}>
                    <button
                      onClick={() => navigate(it.key)}
                      className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors ${
                        active
                          ? "bg-primary/10 text-primary"
                          : "text-foreground/70 hover:bg-secondary hover:text-foreground"
                      }`}
                    >
                      <Icon className={`w-4 h-4 ${isRTL ? "ml-3" : "mr-3"} shrink-0`} />
                      <span className="truncate text-left">{language === "ar" ? it.labelAr : it.labelEn}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-border space-y-3">
        <button
          onClick={() => onNav("premium")}
          className="w-full p-3 rounded-xl text-left bg-gradient-to-br from-primary to-[hsl(213_94%_68%)] text-primary-foreground shadow-[var(--shadow-glow)] hover:opacity-95 transition-opacity"
        >
          <p className="text-[10px] font-semibold opacity-80 mb-0.5 uppercase tracking-wider">
            {language === "ar" ? "حسابك" : "Account status"}
          </p>
          <p className="text-sm font-bold flex items-center gap-1">
            {isPremium ? "✨" : "🎓"}{" "}
            {isPremium
              ? language === "ar" ? "مستخدم بريميوم" : "Premium user"
              : language === "ar" ? "ترقية إلى بريميوم" : "Upgrade to Premium"}
          </p>
        </button>
        <div className="flex items-center gap-2">
          <button
            onClick={onChangeLanguage}
            aria-label={language === "ar" ? "تغيير اللغة" : "Change language"}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <Globe className="w-3.5 h-3.5" />
            {language === "ar" ? "EN" : "AR"}
          </button>
          <button
            onClick={signOut}
            aria-label={language === "ar" ? "تسجيل الخروج" : "Sign out"}
            className="flex-1 inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
          >
            <LogOut className="w-3.5 h-3.5" />
            {language === "ar" ? "خروج" : "Sign out"}
          </button>
        </div>
      </div>
    </>
  );

  return (
    <div className="min-h-screen w-full bg-background text-foreground" dir={isRTL ? "rtl" : "ltr"}>
      {/* Top utility bar */}
      <div className="sticky top-0 z-40 backdrop-blur-md bg-background/70 border-b border-border">
        <div className="max-w-5xl mx-auto px-5 md:px-10 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-primary-foreground" />
            </div>
            <p className="text-base font-bold text-primary leading-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>tamayzak</p>
          </div>
          <div className="flex items-center gap-1.5">
            <button onClick={onChangeLanguage} aria-label="lang" className="inline-flex items-center justify-center gap-1.5 h-8 px-2.5 rounded-lg border border-border bg-card text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <Globe className="w-3.5 h-3.5" />
              {language === "ar" ? "EN" : "AR"}
            </button>
            <button onClick={signOut} aria-label="sign out" className="inline-flex items-center justify-center h-8 w-8 rounded-lg border border-border bg-card text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors">
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <main className="px-5 md:px-10 py-8 md:py-12 pb-36">
        <AnimatePresence mode="wait">
        {showAllTools ? (
          <motion.div
            key="all-tools-screen"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="max-w-5xl mx-auto"
          >
            <div className="flex items-center justify-between mb-8">
              <button
                onClick={() => setShowAllTools(false)}
                className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors"
              >
                <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
                {language === "ar" ? "رجوع" : "Back"}
              </button>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {NAV_GROUPS[0].items.length} {language === "ar" ? "أداة" : "tools"}
              </p>
            </div>
            <header className="mb-8">
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
                {language === "ar" ? "كل أدوات الدراسة" : "All study tools"}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">
                {language === "ar" ? "كل ما تحتاجه للدراسة في مكان واحد." : "Everything you need to study, in one place."}
              </p>
            </header>
            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {NAV_GROUPS[0].items.map((it) => {
                const Icon = it.Icon;
                const meta = (fc as any)[it.key];
                return (
                  <motion.button
                    key={it.key}
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    whileHover={{ y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowAllTools(false); navigate(it.key); }}
                    className="group bg-card p-5 border border-border rounded-2xl text-left hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all"
                  >
                    <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center mb-4 group-hover:bg-primary transition-colors">
                      <Icon className="w-5 h-5 text-primary group-hover:text-primary-foreground transition-colors" />
                    </div>
                    <h5 className="font-bold text-base mb-1">
                      {meta?.title ?? (language === "ar" ? it.labelAr : it.labelEn)}
                    </h5>
                    {meta?.subtitle && (
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{meta.subtitle}</p>
                    )}
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      {language === "ar" ? "افتح" : "Open"}
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>
          </motion.div>
        ) : (
        <motion.div
          key="dashboard"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, ease: "easeOut" }}
          className="max-w-5xl mx-auto"
        >
          {/* Header row */}
          <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold tracking-tight inline-flex items-center gap-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                <span>{welcome.hi}{username ? `, ${username}` : ""}</span>
                {isPremium && (
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.2 }}
                    aria-label="Premium"
                    title="Premium"
                    className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 shadow-[0_4px_14px_hsl(45_90%_55%/0.45)]"
                  >
                    <Crown className="w-4 h-4 text-white" />
                  </motion.span>
                )}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm md:text-base">{welcome.sub}</p>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => onNav("missions")}
                className="px-4 py-2 text-sm font-semibold text-primary bg-primary/10 rounded-lg hover:bg-primary/15 transition-colors"
              >
                {cta.secondary}
              </button>
              <button
                onClick={() => onSelect("sessions")}
                className="px-5 py-2 text-sm font-bold text-primary-foreground bg-primary rounded-lg shadow-sm hover:opacity-95 transition-all"
              >
                {cta.primary}
              </button>
            </div>
          </header>

          {/* Unread notifications */}
          {unread.length > 0 && (
            <div className="mb-8 space-y-2">
              {unread.slice(0, 2).map((n) => (
                <div
                  key={n.id}
                  onClick={() => onNav("news")}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNav("news"); } }}
                  className="flex items-start gap-3 rounded-xl p-4 border border-primary/30 bg-primary/5 transition-colors cursor-pointer hover:bg-primary/10"
                >
                  <Bell className="w-4 h-4 text-primary shrink-0 mt-1" />
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-foreground text-sm">{n.title}</h4>
                    {n.body && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</p>}
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); dismiss(n.id); }} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground p-1">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Recommended next step (hero card) */}
          <section className="mb-10">
            <div className="relative overflow-hidden bg-card border border-border rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[var(--shadow-card)] hover:shadow-lg transition-shadow">
              <div className="relative z-10 flex-1">
                <span className="inline-block px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold uppercase tracking-wider rounded-full mb-4">
                  {recCopy.tag}
                </span>
                <h3 className="text-xl md:text-2xl font-bold mb-2" style={{ fontFamily: "'Outfit', sans-serif" }}>
                  {recCopy.title}
                </h3>
                <p className="text-muted-foreground max-w-md mb-6 text-sm md:text-base">{recCopy.body}</p>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={() => onSelect("flashcards")}
                    className="px-5 py-2.5 bg-primary text-primary-foreground font-semibold rounded-xl transition-transform active:scale-95"
                  >
                    {recCopy.resume}
                  </button>
                  <button
                    onClick={() => onSelect("summaries")}
                    className="px-5 py-2.5 border border-border bg-card text-foreground/80 font-semibold rounded-xl hover:bg-secondary transition-colors"
                  >
                    {recCopy.view}
                  </button>
                </div>
              </div>
              <div className="hidden md:flex shrink-0">
                <div className="relative w-36 h-36">
                  <svg viewBox="0 0 120 120" className="w-36 h-36 -rotate-90">
                    <circle cx="60" cy="60" r="52" className="fill-none stroke-secondary" strokeWidth="10" />
                    <motion.circle
                      cx="60" cy="60" r="52"
                      className="fill-none stroke-primary"
                      strokeWidth="10"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 52}
                      initial={{ strokeDashoffset: 2 * Math.PI * 52 }}
                      animate={{ strokeDashoffset: 2 * Math.PI * 52 * (1 - missionsPct / 100) }}
                      transition={{ duration: 1.1, ease: "easeOut" }}
                    />
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-2xl font-bold tabular-nums">{missionsPct}%</span>
                    <span className="text-[10px] text-muted-foreground tabular-nums">
                      {missionsDone}/{missionsTotal}
                    </span>
                  </div>
                  <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 bg-card border border-border shadow-sm rounded-lg text-[10px] font-bold uppercase tracking-wider whitespace-nowrap">
                    {language === "ar" ? "تقدم المهمات" : "Missions progress"}
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Countdown — quiet inline strip */}
          {showTimer && (
            <div className="mb-10 rounded-2xl border border-border bg-card px-5 py-4 flex items-center gap-4">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-primary/10 shrink-0">
                <Timer className="w-4 h-4 text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">{language === "ar" ? "موعد مهم" : "Save the date"}</p>
                <p className="font-semibold text-sm truncate">{timerLabel}</p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-sm font-bold tabular-nums">
                <span>{String(cd.d).padStart(2, "0")}</span><span className="text-muted-foreground text-xs">{units.d}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span>{String(cd.h).padStart(2, "0")}</span><span className="text-muted-foreground text-xs">{units.h}</span>
                <span className="text-muted-foreground mx-1">·</span>
                <span>{String(cd.m).padStart(2, "0")}</span><span className="text-muted-foreground text-xs">{units.m}</span>
              </div>
              <button onClick={dismissTimer} aria-label="Dismiss" className="text-muted-foreground hover:text-foreground p-1 shrink-0">
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Study Tools grid */}
          <section>
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-bold" style={{ fontFamily: "'Outfit', sans-serif" }}>{toolsHeader}</h4>
              <button
                onClick={() => setShowAllTools(true)}
                className="text-sm font-semibold text-primary hover:underline inline-flex items-center gap-1"
              >
                {language === "ar" ? "عرض كل الأدوات" : "See all study tools"}
                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180" : ""}`} />
              </button>
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.05 } } }}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
            >
              {FEATURED.map((it) => {
                const Icon = it.Icon;
                const meta = (fc as any)[it.key];
                if (!meta) return null;
                return (
                  <motion.button
                    key={it.key}
                    variants={{ hidden: { opacity: 0, y: 16 }, show: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    whileHover={{ y: -2 }}
                    onClick={() => navigate(it.key)}
                    className="group bg-card p-5 border border-border rounded-2xl text-left hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all"
                  >
                    <div className={`w-11 h-11 ${it.tintBg} rounded-xl flex items-center justify-center mb-4 group-hover:scale-105 transition-transform`}>
                      <Icon className={`w-5 h-5 ${it.tintText}`} />
                    </div>
                    <h5 className="font-bold text-base mb-1">{meta.title}</h5>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{meta.subtitle}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">
                      {language === "ar" ? "افتح" : "Open"}
                      <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180 group-hover:-translate-x-0.5" : "group-hover:translate-x-0.5"}`} />
                    </span>
                  </motion.button>
                );
              })}
            </motion.div>

          </section>

        </motion.div>
        )}
        </AnimatePresence>
      </main>

      {/* Fixed animated bottom nav (grouped) */}
      <div
        className="fixed left-0 right-0 z-50 flex justify-center pointer-events-none px-3"
        style={{ bottom: `calc(env(safe-area-inset-bottom, 0px) + 0.75rem)` }}
        dir={isRTL ? "rtl" : "ltr"}
      >
        <motion.nav
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="pointer-events-auto w-full max-w-3xl rounded-2xl border border-border bg-card/85 backdrop-blur-xl shadow-[0_18px_50px_-12px_hsl(var(--primary)/0.25)] p-1.5"
          aria-label="Primary"
        >
          {/* Sub-items row (active group) */}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={activeGroup}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
              className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-1.5 mb-1.5 border-b border-border/60"
            >
              <LayoutGroup id={`subitems-${activeGroup}`}>
                {currentGroup.items.map((it) => {
                  const Icon = it.Icon;
                  const isActive = activeKey === it.key;
                  return (
                    <motion.button
                      key={it.key}
                      whileTap={{ scale: 0.94 }}
                      onClick={() => navigate(it.key)}
                      className={`relative shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        isActive ? "text-primary" : "text-foreground/60 hover:text-foreground"
                      }`}
                    >
                      {isActive && (
                        <motion.span
                          layoutId="sub-pill"
                          className="absolute inset-0 bg-primary/10 rounded-lg"
                          transition={{ type: "spring", stiffness: 520, damping: 36 }}
                        />
                      )}
                      <span className="relative z-10 inline-flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" />
                        {language === "ar" ? it.labelAr : it.labelEn}
                      </span>
                    </motion.button>
                  );
                })}
              </LayoutGroup>
            </motion.div>
          </AnimatePresence>

          {/* Group tabs row */}
          <LayoutGroup id="group-tabs">
            <div className="flex items-stretch gap-1">
              {NAV_GROUPS.map((g) => {
                const Icon = GROUP_ICONS[g.titleEn] ?? Layers;
                const isActive = activeGroup === g.titleEn;
                return (
                  <motion.button
                    key={g.titleEn}
                    whileTap={{ scale: 0.92 }}
                    onClick={() => setActiveGroup(g.titleEn)}
                    className={`relative flex-1 h-12 inline-flex flex-col items-center justify-center gap-0.5 rounded-xl text-[11px] font-semibold transition-colors ${
                      isActive ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="group-pill"
                        className="absolute inset-0 rounded-xl bg-gradient-to-br from-primary to-[hsl(213_94%_68%)] shadow-[0_6px_20px_hsl(var(--primary)/0.4)]"
                        transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      />
                    )}
                    <motion.span
                      animate={{ scale: isActive ? 1.1 : 1, y: isActive ? -1 : 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 22 }}
                      className="relative z-10"
                    >
                      <Icon className="w-4 h-4" />
                    </motion.span>
                    <span className="relative z-10 tracking-wide">
                      {language === "ar" ? g.titleAr : g.titleEn}
                    </span>
                  </motion.button>
                );
              })}
            </div>
          </LayoutGroup>
        </motion.nav>
      </div>

      <ExcellenceCompanion language={language} />
    </div>
  );
};

export default Basics;