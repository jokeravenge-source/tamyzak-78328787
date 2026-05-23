import { Layers, GraduationCap, BookMarked, FileText, ListChecks, HelpCircle, MessageSquareQuote, Headphones, ArrowRight, ArrowLeft, Sparkles, Lock, LogOut, Bell, X, UserCog, Menu, PenLine } from "lucide-react";
import { LANGUAGE_STORAGE_KEY, type AppLanguage } from "@/components/LanguageGate";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import StreakTree from "@/components/StreakTree";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger, DrawerClose } from "@/components/ui/drawer";

const copy = {
  en: {
    badge: "Welcome",
    title: "Your Study Hub",
    description: "Pick what you want to do today. More tools are on the way.",
    soon: "Coming soon",
    hi: "Hi",
    items: {
      flashcards: { title: "Flashcards", subtitle: "Study with smart Q&A cards across every subject." },
      sessions: { title: "Sessions", subtitle: "Track study time per subject and climb the leaderboard." },
      malazam: { title: "Malazam", subtitle: "Curated booklets and study notes for every subject." },
      summaries: { title: "Notes & Summaries", subtitle: "Upload your notes or summaries — they appear once an admin approves." },
      missions: { title: "My Missions", subtitle: "Check off chapter topics and watch your progress per subject." },
      mcq: { title: "MCQ Generator", subtitle: "Upload any file and instantly get multiple-choice questions with hints." },
      advices: { title: "Advices", subtitle: "Read advice from top students or share your own." },
      videoNotes: { title: "Video to Notes", subtitle: "Upload audio or video and get AI-generated notes." },
      account: { title: "Account Center", subtitle: "Set your username and manage your profile." },
      essay: { title: "Essay Coach", subtitle: "Upload a file and get essay questions graded 1–10 by AI." },
    },
  },
  ar: {
    badge: "أهلاً بك",
    title: "منصة الدراسة",
    description: "اختر ما تريد البدء به اليوم. المزيد من الأدوات قريباً.",
    soon: "قريباً",
    hi: "أهلاً",
    items: {
      flashcards: { title: "البطاقات التعليمية", subtitle: "ادرس عبر بطاقات السؤال والجواب لجميع المواد." },
      sessions: { title: "الجلسات", subtitle: "احسب وقت دراستك لكل مادة وتحدّى أصدقاءك على لوحة المتصدرين." },
      malazam: { title: "الملازم", subtitle: "ملازم ومذكرات دراسية مختارة لكل مادة." },
      summaries: { title: "ملاحظات وملخصات", subtitle: "ارفع ملاحظاتك أو ملخصاتك — تظهر بعد موافقة المسؤول." },
      missions: { title: "مهماتي", subtitle: "اشطب مواضيع كل فصل وتابع تقدمك في كل مادة." },
      mcq: { title: "مولّد الأسئلة", subtitle: "ارفع أي ملف واحصل فوراً على أسئلة اختيار من متعدد مع تلميحات." },
      advices: { title: "النصائح", subtitle: "اقرأ نصائح من المتفوقين أو شارك نصيحتك." },
      videoNotes: { title: "من الفيديو إلى ملاحظات", subtitle: "ارفع صوتاً أو فيديو واحصل على ملاحظات." },
      account: { title: "مركز الحساب", subtitle: "حدّد اسم المستخدم وأدر ملفك الشخصي." },
      essay: { title: "مدرّب المقالات", subtitle: "ارفع ملفاً واحصل على أسئلة مقالية مُقيَّمة من 1 إلى 10." },
    },
  },
} as const;

export type MainMenuChoice = "flashcards" | "missions" | "mcq" | "malazam" | "summaries" | "advices" | "sessions" | "account" | "essay" | "videoNotes";

const MainMenu = ({
  language,
  onChangeLanguage,
  onSelect,
}: {
  language: AppLanguage;
  onChangeLanguage: () => void;
  onSelect: (choice: MainMenuChoice) => void;
}) => {
  const text = copy[language];
  type Notif = { id: string; title: string; body: string; created_at: string };
  const [notifs, setNotifs] = useState<Notif[]>([]);
  const READ_KEY = "notif_read_ids_v1";
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

  const items = [
    { key: "flashcards" as const, Icon: Layers, locked: false, ...text.items.flashcards },
    { key: "malazam", Icon: BookMarked, locked: false, ...text.items.malazam },
    { key: "summaries", Icon: FileText, locked: false, ...text.items.summaries },
    { key: "mcq", Icon: HelpCircle, locked: false, ...text.items.mcq },
    { key: "sessions", Icon: GraduationCap, locked: false, ...text.items.sessions },
    { key: "videoNotes", Icon: Headphones, locked: false, ...text.items.videoNotes },
  ];

  const drawerItems = [
    { key: "flashcards" as const, Icon: Layers, ...text.items.flashcards },
    { key: "malazam" as const, Icon: BookMarked, ...text.items.malazam },
    { key: "summaries" as const, Icon: FileText, ...text.items.summaries },
    { key: "missions" as const, Icon: ListChecks, ...text.items.missions },
    { key: "mcq" as const, Icon: HelpCircle, ...text.items.mcq },
    { key: "advices" as const, Icon: MessageSquareQuote, ...text.items.advices },
    { key: "sessions" as const, Icon: GraduationCap, ...text.items.sessions },
    { key: "essay" as const, Icon: PenLine, ...text.items.essay },
    { key: "videoNotes" as const, Icon: Headphones, ...text.items.videoNotes },
    { key: "account" as const, Icon: UserCog, ...text.items.account },
  ];

  const handleBack = () => {
    localStorage.removeItem(LANGUAGE_STORAGE_KEY);
    onChangeLanguage();
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={handleBack}
        aria-label={language === "ar" ? "تغيير اللغة" : "Change language"}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <Drawer>
        <DrawerTrigger asChild>
          <button
            aria-label={language === "ar" ? "القائمة" : "Menu"}
            className="absolute top-6 left-20 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
          >
            <Menu className="w-5 h-5" />
          </button>
        </DrawerTrigger>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle className="text-center gradient-text">{text.title}</DrawerTitle>
          </DrawerHeader>
          <div dir={language === "ar" ? "rtl" : "ltr"} className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-4 pb-8 max-h-[70vh] overflow-y-auto">
            {drawerItems.map((it) => {
              const Icon = it.Icon;
              return (
                <DrawerClose asChild key={it.key}>
                  <button
                    onClick={() => onSelect(it.key as MainMenuChoice)}
                    className="flex items-center gap-3 rounded-2xl p-4 border border-primary/30 bg-secondary/40 hover:border-primary hover:bg-secondary/70 transition text-left"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center shrink-0">
                      <Icon className="w-5 h-5 text-primary" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-semibold text-foreground">{it.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{it.subtitle}</div>
                    </div>
                  </button>
                </DrawerClose>
              );
            })}
          </div>
        </DrawerContent>
      </Drawer>

      <button
        onClick={signOut}
        aria-label={language === "ar" ? "تسجيل الخروج" : "Sign out"}
        className="absolute top-6 right-6 z-20 inline-flex items-center gap-2 h-11 px-4 rounded-full border border-white/10 bg-secondary/60 backdrop-blur text-sm text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
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

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{text.badge}</span>
        </div>
        <h1 className="text-5xl md:text-7xl font-bold gradient-text leading-[1.1] mb-4">{text.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{text.description}</p>
        {username && (
          <p className="mt-3 text-sm text-primary font-medium">{text.hi}, {username} 👋</p>
        )}
      </header>

      <section className="max-w-6xl mx-auto mt-14 md:mt-20 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 z-10 relative">
        {items.map((it, i) => {
          const Icon = it.Icon;
          const available = !it.locked;
          return (
            <button
              key={it.key}
              onClick={() => available && onSelect(it.key as MainMenuChoice)}
              disabled={it.locked}
              style={{ animationDelay: `${i * 70}ms` }}
              className={`group relative text-left rounded-3xl p-6 h-44 border backdrop-blur overflow-hidden transition-all duration-500 animate-fade-up
                ${available
                  ? "border-primary/40 bg-secondary/40 hover:-translate-y-2 hover:border-primary cursor-pointer shadow-lg hover:shadow-[var(--shadow-glow)]"
                  : "border-white/5 bg-secondary/20 opacity-60 cursor-not-allowed"}`}
            >
              {available && (
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500"
                  style={{ background: "var(--gradient-primary)", mixBlendMode: "overlay" }}
                />
              )}

              <div className="relative z-10 flex items-start justify-between">
                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center ${available ? "bg-primary/15" : "bg-muted/20"}`}>
                  <Icon className={`w-6 h-6 ${available ? "text-primary" : "text-muted-foreground/60"}`} />
                </div>
                {it.locked ? (
                  <Lock className="w-4 h-4 text-muted-foreground/60" />
                ) : (
                  <ArrowRight className="w-5 h-5 text-primary group-hover:translate-x-1 transition-transform" />
                )}
              </div>

              <div className="relative z-10 mt-6">
                <h3 className={`text-2xl font-semibold mb-1 ${available ? "text-foreground" : "text-muted-foreground"}`}>
                  {it.title}
                </h3>
                <p className="text-sm text-muted-foreground">{it.locked ? text.soon : it.subtitle}</p>
              </div>

              {available && (
                <div
                  className="absolute bottom-0 left-0 h-[2px] w-0 group-hover:w-full transition-all duration-700"
                  style={{ background: "var(--gradient-primary)" }}
                />
              )}
            </button>
          );
        })}
      </section>
      <StreakTree language={language} />
    </main>
  );
};

export default MainMenu;