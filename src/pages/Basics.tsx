import { useEffect, useState } from "react";
import {
  ArrowRight, ArrowLeft, Layers, BookMarked, FileText, GraduationCap, Microscope,
  LogOut, Bell, X, ListChecks, Newspaper, Timer, ScrollText, Network, Search,
  Globe, Trophy, Target, HelpCircle, Headphones, Lightbulb, Sparkles,
  Crown, UserCog, BookOpen, Heart, Users, Settings, Moon, PenLine, MousePointerClick, NotebookPen, Youtube, FlaskConical, Swords,
} from "lucide-react";
import { motion, AnimatePresence, LayoutGroup } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { useSubscription } from "@/hooks/useSubscription";
import { missionsData, missionsOrder } from "@/data/missions";
import VisitCounter from "@/components/VisitCounter";
import { useTodos } from "@/lib/todoTopicProgress";
import StreakTree from "@/components/StreakTree";
import ExcellenceCompanion from "@/components/ExcellenceCompanion";

function useStreakDays(): number {
  const [days, setDays] = useState<number>(() => {
    try {
      const raw = localStorage.getItem("streak_state_v1");
      if (raw) return JSON.parse(raw).days ?? 0;
    } catch {}
    return 0;
  });
  useEffect(() => {
    const read = () => {
      try {
        const raw = localStorage.getItem("streak_state_v1");
        if (raw) setDays(JSON.parse(raw).days ?? 0);
      } catch {}
    };
    read();
    const id = window.setInterval(read, 1500);
    window.addEventListener("storage", read);
    return () => { window.clearInterval(id); window.removeEventListener("storage", read); };
  }, []);
  return days;
}

export type BasicsChoice =
  | "flashcards"
  | "malazam"
  | "summaries"
  | "sessions"
  | "biologyDrawings"
  | "todo"
  | "news"
  | "ministerialBank"
  | "subjectsHub"
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
    titleEn: "Subjects",
    titleAr: "المواد",
    items: [
      { key: "subjectsHub", labelEn: "All Subjects", labelAr: "كل المواد", Icon: BookOpen },
    ],
  },
  {
    titleEn: "Study",
    titleAr: "الأدوات",
    items: [
      { key: "notes", labelEn: "Notes", labelAr: "ملاحظاتي", Icon: NotebookPen },
      { key: "summaries", labelEn: "Summaries", labelAr: "الملخصات", Icon: FileText },
      { key: "mcq", labelEn: "MCQ Generator", labelAr: "مولّد الأسئلة", Icon: HelpCircle },
      { key: "mindmap", labelEn: "Mind Map", labelAr: "الخريطة الذهنية", Icon: Network },
      { key: "videoNotes", labelEn: "Video Notes", labelAr: "ملاحظات الفيديو", Icon: Headphones },
      { key: "youtube", labelEn: "YouTube Player", labelAr: "مشغّل يوتيوب", Icon: Youtube },
      { key: "liveBattle", labelEn: "Live Battle", labelAr: "المعركة المباشرة", Icon: Swords },
      { key: "essay", labelEn: "Essay Coach", labelAr: "مدرّب المقالات", Icon: BookOpen },
    ],
  },
  {
    titleEn: "Progress",
    titleAr: "التقدم",
    items: [
      { key: "report", labelEn: "Daily Report", labelAr: "تقريري", Icon: Sparkles },
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
    titleEn: "Play",
    titleAr: "العب",
    items: [
      { key: "liveBattle", labelEn: "Live Battle", labelAr: "المعركة المباشرة", Icon: Swords },
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
  { key: "report",          Icon: Sparkles,   tintBg: "bg-primary",     tintText: "text-primary-foreground" },
  { key: "summaries",       Icon: FileText,   tintBg: "bg-violet-50",  tintText: "text-violet-600" },
  { key: "mcq",             Icon: HelpCircle, tintBg: "bg-rose-50",    tintText: "text-rose-600" },
  { key: "mindmap",         Icon: Network,    tintBg: "bg-cyan-50",    tintText: "text-cyan-600" },
  { key: "youtube",         Icon: Youtube,    tintBg: "bg-red-50",     tintText: "text-red-600" },
  { key: "liveBattle",      Icon: Swords,     tintBg: "bg-fuchsia-50", tintText: "text-fuchsia-600" },
  { key: "leaderboard",     Icon: Trophy,     tintBg: "bg-emerald-50", tintText: "text-emerald-600" },
];

const FEATURED_COPY = {
  en: {
    report: { title: "Daily Report", subtitle: "AI insights + parent follow-up link." },
    summaries: { title: "Notes & Summaries", subtitle: "Upload and browse approved notes." },
    mcq: { title: "MCQ Generator", subtitle: "Get multiple-choice questions from any file." },
    mindmap: { title: "Mind Map", subtitle: "AI builds a clean map from any topic." },
    youtube: { title: "YouTube Player", subtitle: "Watch any YouTube video inside the app." },
    liveBattle: { title: "Live Battle", subtitle: "Challenge a friend in a 10-question MCQ duel." },
    leaderboard: { title: "Leaderboard", subtitle: "See where you stand this week." },
  },
  ar: {
    report: { title: "تقريري اليومي", subtitle: "ملاحظات ذكية ورابط متابعة لولي الأمر." },
    summaries: { title: "ملخصات", subtitle: "ارفع وتصفّح ملاحظات معتمدة." },
    mcq: { title: "مولّد الأسئلة", subtitle: "احصل على اختيارات من متعدد من أي ملف." },
    mindmap: { title: "الخريطة الذهنية", subtitle: "خريطة مرتبة بالذكاء الاصطناعي." },
    youtube: { title: "مشغّل يوتيوب", subtitle: "شاهد أي فيديو يوتيوب داخل التطبيق." },
    liveBattle: { title: "المعركة المباشرة", subtitle: "تحد صديقك" },
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
  const todos = useTodos();
  const [missionsDone, setMissionsDone] = useState<number>(0);
  const streakDays = useStreakDays();
  const [showAllTools, setShowAllTools] = useState<boolean>(false);
  const [showCompanion, setShowCompanion] = useState<boolean>(false);

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
  const todoDone = todos.filter((todo) => todo.done).length;
  const todoTotal = todos.length;
  const heroProgressDone = todoTotal > 0 ? todoDone : missionsDone;
  const heroProgressTotal = todoTotal > 0 ? todoTotal : missionsTotal;
  const heroProgressPct = heroProgressTotal ? Math.min(100, Math.round((heroProgressDone / heroProgressTotal) * 100)) : 0;

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

  // Today's pending tasks (todos in localStorage) + unread notifs → quick badge
  const [pendingTodos, setPendingTodos] = useState<number>(() => {
    try {
      const arr = JSON.parse(localStorage.getItem("app_todos_v1") || "[]");
      return Array.isArray(arr) ? arr.filter((t: any) => !t.done).length : 0;
    } catch { return 0; }
  });
  useEffect(() => {
    const sync = () => {
      try {
        const arr = JSON.parse(localStorage.getItem("app_todos_v1") || "[]");
        setPendingTodos(Array.isArray(arr) ? arr.filter((t: any) => !t.done).length : 0);
      } catch { setPendingTodos(0); }
    };
    window.addEventListener("app:todos-changed", sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener("app:todos-changed", sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const DEFAULT_TARGET_ISO = "2026-06-13T07:00";
  const [eventName, setEventName] = useState<string>(() => localStorage.getItem("custom_countdown_name_v1") || "");
  const [eventDateISO, setEventDateISO] = useState<string>(() => localStorage.getItem("custom_countdown_date_v1") || DEFAULT_TARGET_ISO);
  useEffect(() => {
    const sync = () => {
      setEventName(localStorage.getItem("custom_countdown_name_v1") || "");
      setEventDateISO(localStorage.getItem("custom_countdown_date_v1") || DEFAULT_TARGET_ISO);
    };
    window.addEventListener("storage", sync);
    window.addEventListener("app:countdown-changed", sync);
    return () => {
      window.removeEventListener("storage", sync);
      window.removeEventListener("app:countdown-changed", sync);
    };
  }, []);
  const TARGET = new Date(eventDateISO).getTime();
  const [now, setNow] = useState<number>(() => Date.now());
  const [showTimer, setShowTimer] = useState<boolean>(() => localStorage.getItem("countdown_hidden_v1") !== "1");
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
  const targetDate = new Date(eventDateISO);
  const formattedTarget = isNaN(targetDate.getTime())
    ? ""
    : targetDate.toLocaleString(language === "ar" ? "ar-EG" : "en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  const defaultEvtName = language === "ar" ? "موعد مهم" : "Important date";
  const evtName = eventName.trim() || defaultEvtName;
  const timerLabel = language === "ar" ? `${evtName} — ${formattedTarget}` : `${evtName} — ${formattedTarget}`;
  const units = language === "ar"
    ? { d: "يوم", h: "ساعة", m: "دقيقة", s: "ثانية" }
    : { d: "Days", h: "Hours", m: "Min", s: "Sec" };
  const dismissTimer = () => {
    localStorage.setItem("countdown_hidden_v1", "1");
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
    Play: Swords,
    Ministerial: ScrollText,
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
  const todoCopy = {
    en: {
      tag: "Your To-Do List",
      title: todoTotal > 0
        ? (todoDone === todoTotal ? "All tasks complete — great job!" : `${todoTotal - todoDone} task${todoTotal - todoDone === 1 ? "" : "s"} left to finish`)
        : "Plan your day with a quick To-Do list",
      body: todoTotal > 0
        ? `You've completed ${todoDone} of ${todoTotal} tasks. Keep the momentum going.`
        : "Add tasks, track them, and watch your progress grow.",
      resume: "Generate To-Do",
    },
    ar: {
      tag: "قائمة مهامك",
      title: todoTotal > 0
        ? (todoDone === todoTotal ? "أنجزت كل المهام — أحسنت!" : `تبقّى ${todoTotal - todoDone} من المهام`)
        : "خطّط ليومك بقائمة مهام سريعة",
      body: todoTotal > 0
        ? `أنجزت ${todoDone} من ${todoTotal} مهمة. واصل التقدم.`
        : "أضف المهام وتابع إنجازك خطوة بخطوة.",
      resume: "أنشئ قائمة المهام",
    },
  }[language];
  const activeCopy = todoCopy;
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
        <button
          onClick={() => onNav("account")}
          className="w-full inline-flex items-center justify-center gap-2 h-9 rounded-lg border border-border bg-card text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
        >
          {language === "ar" ? "إعدادات الحساب" : "Account settings"}
        </button>
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
            <button
              onClick={() => onNav("report")}
              aria-label={language === "ar" ? "خطتي اليوم" : "Today's plan"}
              title={language === "ar" ? "خطتك اليوم — اضغط لعرض الخطة" : "Today's plan — tap to open"}
              className="relative inline-flex items-center gap-1.5 h-8 px-2.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-[11px] font-semibold hover:bg-primary/15 transition-colors"
            >
              <Target className="w-3.5 h-3.5" />
              <span>{pendingTodos + unread.length}</span>
              <span className="hidden sm:inline opacity-80">{language === "ar" ? "لليوم" : "today"}</span>
              {(pendingTodos + unread.length) > 0 && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-accent animate-pulse" />
              )}
            </button>
          </div>
          <button
            onClick={() => window.dispatchEvent(new Event("app:open-search"))}
            aria-label={language === "ar" ? "بحث" : "Search"}
            className="inline-flex items-center gap-2 h-8 px-3 rounded-lg border border-border bg-card text-[11px] font-medium text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors min-w-[10rem] sm:min-w-[16rem]"
          >
            <Search className="w-3.5 h-3.5 text-primary" />
            <span className="flex-1 text-start truncate">
              {language === "ar" ? "ابحث عن أداة..." : "Search tools..."}
            </span>
            <kbd className="hidden sm:inline-block text-[10px] text-muted-foreground/70 border border-border rounded px-1">⌘K</kbd>
          </button>
        </div>
      </div>

      {/* Content */}
      <main className="px-3 sm:px-5 md:px-10 py-4 sm:py-8 md:py-12 pb-48">
        <h1 className="sr-only">{language === "ar" ? "أدوات الدراسة" : "Study tools"}</h1>
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
          className="relative text-foreground"
          style={{ fontFamily: "'Plus Jakarta Sans', 'Cairo', sans-serif" }}
        >
        <div className="max-w-6xl mx-auto">
          {/* subtle brass aura */}
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                "radial-gradient(circle at 15% -10%, hsl(var(--primary) / 0.10), transparent 55%), radial-gradient(circle at 90% 110%, hsl(var(--primary) / 0.08), transparent 55%)",
            }}
          />
          <div className="relative">
          {/* ====== Noir & Gold bento dashboard ====== */}
          {/* Header */}
          <header className="mb-6 md:mb-10 flex flex-row justify-between items-end gap-3">
            <div>
              <h2
                className="text-xl sm:text-2xl md:text-4xl font-bold tracking-tight text-foreground inline-flex items-center gap-2"
                style={{ fontFamily: "'Syne', sans-serif" }}
              >
                <span>{welcome.hi}{username ? `, ${username}` : ""}</span>
                {isPremium && (
                  <motion.span
                    initial={{ scale: 0, rotate: -30 }}
                    animate={{ scale: 1, rotate: 0 }}
                    transition={{ type: "spring", stiffness: 380, damping: 18, delay: 0.2 }}
                    aria-label="Premium"
                    title="Premium"
                    className="inline-flex items-center justify-center w-6 h-6 sm:w-7 sm:h-7 rounded-full shadow-[var(--shadow-glow)]"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <Crown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-primary-foreground" />
                  </motion.span>
                )}
              </h2>
              <p className="text-muted-foreground mt-1.5 text-xs sm:text-base md:text-lg line-clamp-2">{welcome.sub}</p>
            </div>
            <div className="flex items-center gap-2 sm:gap-4 bg-card border border-border px-3 sm:px-5 py-2 sm:py-3 rounded-2xl shrink-0 shadow-[var(--shadow-card)]">
              <div className={isRTL ? "text-right" : "text-left"}>
                <span className="hidden sm:block text-[10px] uppercase tracking-widest text-muted-foreground">
                  {language === "ar" ? "سلسلة المذاكرة" : "Study streak"}
                </span>
                <span className="text-base sm:text-xl font-bold text-primary tabular-nums">
                  {streakDays || 0} {language === "ar" ? "يوم" : "days"}
                </span>
              </div>
              <div
                className="w-8 h-8 sm:w-10 sm:h-10 rounded-full flex items-center justify-center shadow-[var(--shadow-glow)]"
                style={{ background: "var(--gradient-primary)" }}
              >
                <span className="text-base sm:text-lg leading-none">🔥</span>
              </div>
            </div>
          </header>

          {/* Row A: progress ring (4) + core tools bento (8) */}
          <section className="mb-6 grid grid-cols-12 gap-3 sm:gap-5">
            {/* Progress ring */}
            <div className="col-span-12 md:col-span-4 bg-card rounded-3xl p-4 sm:p-6 border border-border flex flex-col items-center justify-center text-center relative overflow-hidden group shadow-[var(--shadow-card)]">
              <div
                aria-hidden
                className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700"
                style={{ background: "radial-gradient(circle at 50% 0%, hsl(var(--primary) / 0.10), transparent 70%)" }}
              />
              <span className="relative inline-block px-3 py-1 bg-primary/10 text-primary text-[10px] font-bold uppercase tracking-wider rounded-full mb-3 border border-primary/20">
                {activeCopy.tag}
              </span>
              <div className="relative w-32 h-32 sm:w-40 sm:h-40 mb-3 sm:mb-4">
                <svg viewBox="0 0 100 100" className="w-32 h-32 sm:w-40 sm:h-40 -rotate-90">
                  <circle cx="50" cy="50" r="45" stroke="hsl(var(--muted))" strokeWidth="8" fill="none" />
                  <motion.circle
                    cx="50" cy="50" r="45"
                    stroke="hsl(var(--primary))"
                    strokeWidth="8"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 45}
                    initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
                    animate={{ strokeDashoffset: 2 * Math.PI * 45 * (1 - heroProgressPct / 100) }}
                    transition={{ duration: 1.1, ease: "easeOut" }}
                    style={{ filter: "drop-shadow(0 0 8px hsl(var(--primary) / 0.55))" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl sm:text-3xl font-bold text-foreground tabular-nums">{heroProgressPct}%</span>
                  <span className="text-[10px] text-muted-foreground uppercase tracking-tight tabular-nums">
                    {heroProgressDone}/{heroProgressTotal}
                  </span>
                </div>
              </div>
              <h3 className="text-foreground font-semibold text-sm sm:text-base">
                {todoTotal > 0
                  ? (language === "ar" ? "تقدم المهام اليومية" : "Daily to-do progress")
                  : (language === "ar" ? "تقدم المهمات" : "Missions progress")}
              </h3>
              <button
                onClick={() => {
                  try { sessionStorage.setItem("companion:autoSchedule", "1"); } catch { /* ignore */ }
                  setShowCompanion(true);
                  setTimeout(() => {
                    window.dispatchEvent(new Event("app:companion-auto-schedule"));
                  }, 60);
                }}
                className="mt-3 text-xs font-semibold text-primary hover:opacity-80 transition-opacity"
              >
                {activeCopy.resume}
              </button>
              <div className="mt-2 text-muted-foreground">
                <VisitCounter inline />
              </div>
            </div>

            {/* Core tools + Live battle (right of ring) */}
            <div className="col-span-12 md:col-span-8 grid grid-cols-2 gap-3 sm:gap-4">
              {FEATURED.filter((it) => it.key !== "liveBattle").slice(0, 2).map((it) => {
                const Icon = it.Icon;
                const meta = (fc as any)[it.key];
                if (!meta) return null;
                return (
                  <motion.button
                    key={it.key}
                    whileHover={{ y: -3 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => navigate(it.key)}
                    className={`group ${isRTL ? "text-right" : "text-left"} bg-card border border-border p-4 sm:p-6 rounded-2xl sm:rounded-3xl hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all`}
                  >
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl sm:rounded-2xl bg-primary/10 flex items-center justify-center text-primary mb-3 sm:mb-4 group-hover:scale-110 transition-transform">
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6" />
                    </div>
                    <h3 className="text-foreground text-base sm:text-xl font-bold mb-1 line-clamp-1">{meta.title}</h3>
                    <p className="text-muted-foreground text-xs sm:text-sm line-clamp-2">{meta.subtitle}</p>
                  </motion.button>
                );
              })}

              {/* Live battle highlight – spans both cols */}
              {(() => {
                const it = FEATURED.find((x) => x.key === "liveBattle");
                if (!it) return null;
                const Icon = it.Icon;
                const meta = (fc as any).liveBattle;
                return (
                  <div
                    className="col-span-2 p-[1px] rounded-2xl sm:rounded-3xl"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <div className="bg-card rounded-[calc(1rem-1px)] sm:rounded-[calc(1.5rem-1px)] p-3 sm:p-5 flex flex-row items-center justify-between gap-3 sm:gap-4">
                      <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
                        <motion.div
                          animate={{ scale: [1, 1.06, 1] }}
                          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
                          className="w-11 h-11 sm:w-14 sm:h-14 rounded-xl sm:rounded-2xl bg-primary flex items-center justify-center shadow-[var(--shadow-glow)] shrink-0"
                        >
                          <Icon className="w-5 h-5 sm:w-7 sm:h-7 text-primary-foreground" />
                        </motion.div>
                        <div className={`${isRTL ? "text-right" : "text-left"} min-w-0`}>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="relative flex h-2 w-2">
                              <span className="absolute inline-flex h-full w-full rounded-full bg-rose-500 opacity-75 animate-ping" />
                              <span className="relative inline-flex h-2 w-2 rounded-full bg-rose-500" />
                            </span>
                            <span className="text-[10px] font-extrabold tracking-wider text-rose-400">
                              {language === "ar" ? "مباشر" : "LIVE"}
                            </span>
                          </div>
                          <h3 className="text-primary font-bold text-sm sm:text-lg leading-tight line-clamp-1">{meta.title}</h3>
                          <p className="text-muted-foreground text-xs sm:text-sm line-clamp-1">{meta.subtitle}</p>
                        </div>
                      </div>
                      <button
                        onClick={() => navigate("liveBattle")}
                        className="px-3 sm:px-6 py-2 sm:py-2.5 bg-primary text-primary-foreground text-xs sm:text-base font-bold rounded-lg sm:rounded-xl hover:opacity-90 transition-all active:scale-95 shrink-0"
                      >
                        {language === "ar" ? "انضم الآن" : "Join now"}
                      </button>
                    </div>
                  </div>
                );
              })()}
            </div>
          </section>

          {/* Unread notifications — horizontal scroll list */}
          {unread.length > 0 && (
            <div className="mb-6">
              <div
                className="flex flex-row flex-nowrap gap-4 overflow-x-auto overflow-y-hidden pb-3 snap-x snap-mandatory scroll-smooth -mx-1 px-1"
                style={{ scrollbarWidth: "thin", WebkitOverflowScrolling: "touch" }}
              >
                {unread.map((n) => (
                  <div
                    key={n.id}
                    onClick={() => onNav("news")}
                    role="button"
                    tabIndex={0}
                    onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onNav("news"); } }}
                    className="group relative snap-start shrink-0 w-[18rem] sm:w-[20rem] h-36 overflow-hidden rounded-2xl border border-primary/30 transition-all duration-300 cursor-pointer hover:-translate-y-1 hover:border-primary/60 hover:shadow-[var(--shadow-glow)]"
                    style={{ background: "var(--gradient-primary)" }}
                  >
                    <div
                      aria-hidden
                      className="absolute inset-0 opacity-40 mix-blend-overlay pointer-events-none"
                      style={{
                        backgroundImage:
                          "radial-gradient(circle at 80% 20%, hsl(var(--primary-foreground) / 0.35) 0%, transparent 45%), radial-gradient(circle at 10% 90%, hsl(var(--accent) / 0.35) 0%, transparent 50%)",
                      }}
                    />
                    <div aria-hidden className="absolute inset-0 bg-gradient-to-t from-background/70 via-background/20 to-transparent pointer-events-none" />

                    <button
                      onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}
                      aria-label="Dismiss"
                      className="absolute top-2 right-2 z-10 w-6 h-6 rounded-full bg-background/40 backdrop-blur flex items-center justify-center text-primary-foreground/80 hover:text-primary-foreground hover:bg-background/70 transition"
                    >
                      <X className="w-3 h-3" />
                    </button>

                    <div className="absolute top-3 left-3 z-10 w-10 h-10 rounded-xl bg-background/30 backdrop-blur-md ring-1 ring-primary-foreground/30 flex items-center justify-center">
                      <Bell className="w-5 h-5 text-primary-foreground" />
                    </div>

                    <div className="absolute inset-x-0 bottom-0 p-3.5 z-10">
                      <h4 className="text-base font-bold text-primary-foreground line-clamp-1 drop-shadow">{n.title}</h4>
                      {n.body && (
                        <p className="text-xs text-primary-foreground/85 mt-0.5 whitespace-pre-wrap line-clamp-2 leading-relaxed drop-shadow">
                          {n.body}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Countdown — quiet inline strip */}
          {showTimer && (
            <div className="mb-6 rounded-2xl border border-border bg-card px-5 py-4 flex items-center gap-4">
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

          {/* More tools */}
          <section className="mb-6">
            <div className="flex items-center justify-between mb-4 sm:mb-5 gap-2">
              <h4 className="text-base sm:text-lg font-bold text-foreground" style={{ fontFamily: "'Syne', sans-serif" }}>
                {toolsHeader}
              </h4>
              <button
                onClick={() => onNav("more")}
                className="text-xs sm:text-sm font-semibold text-primary hover:opacity-80 inline-flex items-center gap-1 transition-opacity shrink-0"
              >
                {language === "ar" ? "عرض كل الأدوات" : "See all study tools"}
                <ArrowRight className={`w-3.5 h-3.5 transition-transform ${isRTL ? "rotate-180" : ""}`} />
              </button>
            </div>

            <motion.div
              initial="hidden"
              animate="show"
              variants={{ hidden: {}, show: { transition: { staggerChildren: 0.04 } } }}
              className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4"
            >
              {FEATURED.filter((it) => it.key !== "liveBattle").slice(2).map((it) => {
                const Icon = it.Icon;
                const meta = (fc as any)[it.key];
                if (!meta) return null;
                return (
                  <motion.button
                    key={it.key}
                    variants={{ hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0 } }}
                    transition={{ duration: 0.25, ease: "easeOut" }}
                    whileHover={{ y: -3 }}
                    onClick={() => navigate(it.key)}
                    className={`group ${isRTL ? "text-right" : "text-left"} bg-card p-3 sm:p-5 rounded-xl sm:rounded-2xl border border-border hover:border-primary/40 hover:bg-primary/5 transition-all`}
                  >
                    <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-lg sm:rounded-xl bg-primary/10 flex items-center justify-center mb-2 sm:mb-3 text-primary group-hover:scale-110 transition-transform">
                      <Icon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </div>
                    <h5 className="font-bold text-xs sm:text-sm text-foreground mb-1 line-clamp-1">{meta.title}</h5>
                    <p className="text-[10px] sm:text-xs text-muted-foreground line-clamp-2">{meta.subtitle}</p>
                  </motion.button>
                );
              })}
            </motion.div>
          </section>

          {/* Streak tree — bottom */}
          <section>
            <StreakTree language={language} />
          </section>
          </div>
        </div>
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
                        className="absolute inset-0 rounded-xl bg-primary shadow-[0_6px_20px_hsl(var(--primary)/0.4)]"
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
      {showCompanion && (
        <div
          className="fixed inset-0 z-[80] bg-background/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setShowCompanion(false)}
        >
          <div
            className="relative w-full sm:max-w-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              onClick={() => setShowCompanion(false)}
              className="absolute -top-3 -right-3 z-10 w-9 h-9 rounded-full bg-secondary border border-border flex items-center justify-center text-foreground hover:bg-background transition"
              aria-label="close"
            >
              <X className="w-4 h-4" />
            </button>
            <ExcellenceCompanion language={language} embedded />
          </div>
        </div>
      )}
    </div>
  );
};

export default Basics;