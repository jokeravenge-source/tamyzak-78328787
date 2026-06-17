import { useEffect, useMemo, useState } from "react";
import { Search, ArrowRight } from "lucide-react";
import type { AppLanguage } from "@/components/LanguageGate";

export type SearchNavChoice =
  | "flashcards" | "missions" | "mcq" | "malazam" | "summaries" | "advices"
  | "sessions" | "account" | "essay" | "videoNotes" | "basics" | "biologyDrawings"
  | "more" | "leaderboard" | "todo" | "news" | "premium" | "ministerialBank"
  | "mindmap" | "islamicSurahs" | "hadithChecker" | "poemsChecker"
  | "englishEssays" | "englishIsqat" | "report";

type Entry = {
  key: SearchNavChoice;
  en: { title: string; desc: string; tags?: string };
  ar: { title: string; desc: string; tags?: string };
  keywords?: string[];
};

const ENTRIES: Entry[] = [
  { key: "basics", en: { title: "The Basics", desc: "Hub for essential study tools" }, ar: { title: "الأساسيات", desc: "كل أدواتك الدراسية" },
    keywords: ["home", "main", "menu", "dashboard", "hub", "start", "tools", "رئيسية", "أساسيات", "قائمة"] },
  { key: "report", en: { title: "Daily Report", desc: "AI insights on today's study", tags: "parent follow" }, ar: { title: "تقريري اليومي", desc: "تحليل ذكي ليومك", tags: "ولي الأمر" },
    keywords: ["parent", "mom", "dad", "father", "mother", "family", "progress", "share", "follow", "tracking", "track", "review", "stats", "analytics", "insight", "today", "summary", "success companion", "excellence", "ولي الأمر", "أهل", "أب", "أم", "تقرير", "متابعة", "تقدم", "مشاركة", "إحصائيات", "تحليل"] },
  { key: "flashcards", en: { title: "Flashcards", desc: "Study Q&A cards" }, ar: { title: "البطاقات", desc: "بطاقات السؤال والجواب" },
    keywords: ["cards", "qa", "question", "answer", "study", "memorize", "memorization", "revise", "review", "بطاقات", "أسئلة", "حفظ", "مذاكرة", "مراجعة"] },
  { key: "malazam", en: { title: "Malazam", desc: "Booklets & notes" }, ar: { title: "الملازم", desc: "ملازم ومذكرات" },
    keywords: ["booklet", "book", "notes", "pdf", "documents", "files", "library", "ملزمة", "ملازم", "كتب", "مذكرات", "ملفات", "مكتبة"] },
  { key: "summaries", en: { title: "Notes & Summaries", desc: "Community summaries" }, ar: { title: "الملخصات", desc: "ملاحظات وملخصات" },
    keywords: ["summary", "notes", "share", "upload", "community", "ملخص", "ملاحظات", "رفع"] },
  { key: "missions", en: { title: "My Missions", desc: "Chapter checklists" }, ar: { title: "مهماتي", desc: "مواضيع كل فصل" },
    keywords: ["tasks", "goals", "checklist", "chapters", "topics", "progress", "checkoff", "مهام", "أهداف", "فصول", "مواضيع", "تقدم"] },
  { key: "mcq", en: { title: "MCQ Generator", desc: "Generate MCQs from a file" }, ar: { title: "مولّد الأسئلة", desc: "أسئلة من ملف" },
    keywords: ["multiple choice", "quiz", "questions", "test", "exam", "ai", "generate", "اختبار", "أسئلة", "امتحان", "اختيار من متعدد", "كويز"] },
  { key: "sessions", en: { title: "Sessions", desc: "Study timer & leaderboard" }, ar: { title: "الجلسات", desc: "وقت دراستك" },
    keywords: ["timer", "pomodoro", "study time", "track time", "stopwatch", "focus", "concentration", "مؤقت", "وقت", "تركيز", "دراسة"] },
  { key: "videoNotes", en: { title: "Video to Notes", desc: "YouTube → notes" }, ar: { title: "فيديو إلى ملاحظات", desc: "يوتيوب إلى ملاحظات" },
    keywords: ["youtube", "video", "transcript", "lecture", "summarize", "notes", "فيديو", "يوتيوب", "محاضرة", "ملاحظات"] },
  { key: "account", en: { title: "Account Center", desc: "Settings, countdown event, profile" }, ar: { title: "مركز الحساب", desc: "الإعدادات والملف الشخصي" },
    keywords: ["profile", "settings", "username", "name", "avatar", "countdown", "timer", "event", "exam date", "theme", "language", "preferences", "signout", "logout", "telegram", "linked", "حساب", "إعدادات", "اسم", "ملف شخصي", "موعد", "عد تنازلي", "امتحان", "تليغرام", "خروج"] },
  { key: "essay", en: { title: "Essay Coach", desc: "AI essay grading" }, ar: { title: "مدرّب المقالات", desc: "تصحيح مقالات" },
    keywords: ["writing", "essays", "grade", "score", "feedback", "ai", "كتابة", "مقال", "تصحيح", "علامة"] },
  { key: "biologyDrawings", en: { title: "Biology Drawings", desc: "Labeled diagrams" }, ar: { title: "رسومات الأحياء", desc: "رسومات معنونة" },
    keywords: ["biology", "diagrams", "drawings", "labels", "anatomy", "cell", "أحياء", "رسومات", "تشريح", "خلية"] },
  { key: "todo", en: { title: "To-Do List", desc: "Daily tasks" }, ar: { title: "قائمة المهام", desc: "مهام اليوم" },
    keywords: ["tasks", "todos", "checklist", "today", "homework", "plan", "schedule", "reminder", "مهام", "اليوم", "واجبات", "تذكير", "جدول"] },
  { key: "news", en: { title: "News", desc: "Announcements" }, ar: { title: "الأخبار", desc: "الإعلانات" },
    keywords: ["announcements", "updates", "posts", "notifications", "feed", "أخبار", "إعلانات", "تنبيهات", "تحديثات"] },
  { key: "premium", en: { title: "Premium", desc: "Upgrade plan" }, ar: { title: "بريميوم", desc: "ترقية الخطة" },
    keywords: ["upgrade", "subscription", "pay", "paddle", "pro", "vip", "plan", "billing", "اشتراك", "ترقية", "دفع", "خطة", "فاتورة"] },
  { key: "ministerialBank", en: { title: "Ministerial Bank", desc: "Past exam questions" }, ar: { title: "البنك الوزاري", desc: "أسئلة وزارية" },
    keywords: ["past papers", "exam", "ministry", "وزاري", "بنك", "امتحانات", "أسئلة سابقة"] },
  { key: "mindmap", en: { title: "Mind Map", desc: "AI mind maps" }, ar: { title: "الخرائط الذهنية", desc: "خرائط ذهنية" },
    keywords: ["mind map", "diagram", "visual", "concept", "خريطة", "ذهنية", "مفاهيم"] },
  { key: "islamicSurahs", en: { title: "Islamic Surahs", desc: "Quran audio + text" }, ar: { title: "السور الإسلامية", desc: "تلاوة ونص" },
    keywords: ["quran", "surah", "islamic", "religion", "tilawa", "audio", "recitation", "قرآن", "سور", "تلاوة", "إسلامي", "دين"] },
  { key: "hadithChecker", en: { title: "Hadith Checker", desc: "Verify hadith" }, ar: { title: "تدقيق الحديث", desc: "تحقق من الحديث" },
    keywords: ["hadith", "islamic", "verify", "authentic", "حديث", "تحقق", "صحيح", "إسلامي"] },
  { key: "poemsChecker", en: { title: "Poems Checker", desc: "Verify Arabic poems" }, ar: { title: "تدقيق القصائد", desc: "تحقق من القصائد" },
    keywords: ["poems", "arabic", "poetry", "literature", "verify", "قصائد", "شعر", "أدب", "تحقق"] },
  { key: "englishEssays", en: { title: "English Essays", desc: "English essay topics" }, ar: { title: "مقالات إنجليزية", desc: "مواضيع مقالات" },
    keywords: ["english", "essay", "writing", "topics", "إنجليزي", "مقال", "كتابة"] },
  { key: "englishIsqat", en: { title: "English Isqat", desc: "English exercises" }, ar: { title: "إسقاط إنجليزي", desc: "تمارين" },
    keywords: ["english", "exercises", "grammar", "isqat", "إنجليزي", "تمارين", "قواعد", "إسقاط"] },
  { key: "leaderboard", en: { title: "Leaderboard", desc: "Top students, ranking, points" }, ar: { title: "المتصدرون", desc: "أعلى الطلاب والنقاط" },
    keywords: ["ranking", "rank", "top", "points", "score", "competition", "متصدرون", "ترتيب", "نقاط", "منافسة"] },
  { key: "more", en: { title: "More Tools", desc: "All other features" }, ar: { title: "المزيد", desc: "كل الميزات" },
    keywords: ["all", "extra", "other", "tools", "features", "مزيد", "كل", "ميزات"] },
  { key: "advices", en: { title: "Advices", desc: "Tips from top students" }, ar: { title: "النصائح", desc: "نصائح من المتفوقين" },
    keywords: ["advice", "tips", "guidance", "top students", "share", "experience", "نصائح", "إرشاد", "متفوقين", "خبرة", "تجربة"] },
];

export default function SearchFAB({
  language,
  onSelect,
}: {
  language: AppLanguage;
  onSelect: (choice: SearchNavChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    if (!open) setQ("");
  }, [open]);

  const results = useMemo(() => {
    const raw = q.trim().toLowerCase();
    if (!raw) return ENTRIES.slice(0, 12);
    const stop = new Set(["the", "a", "an", "of", "to", "for", "and", "or", "is", "my", "i", "want", "need", "how", "do", "in", "on", "with", "show", "open", "find", "get", "me", "في", "من", "على", "إلى", "هو", "هي", "كيف", "أريد", "افتح"]);
    const tokens = raw.split(/[\s,;.!?]+/).filter((t) => t.length > 1 && !stop.has(t));
    if (tokens.length === 0) tokens.push(raw);

    const scored = ENTRIES.map((e) => {
      const t = e[language];
      const other = language === "en" ? e.ar : e.en;
      const titleHay = `${t.title} ${other.title}`.toLowerCase();
      const fullHay = [
        t.title, t.desc, t.tags ?? "",
        other.title, other.desc, other.tags ?? "",
        e.key, (e.keywords ?? []).join(" "),
      ].join(" ").toLowerCase();

      let score = 0;
      let matched = 0;
      for (const tok of tokens) {
        let hit = false;
        if (titleHay.startsWith(tok)) { score += 8; hit = true; }
        else if (titleHay.includes(tok)) { score += 5; hit = true; }
        if (fullHay.includes(tok)) { score += 3; hit = true; }
        else {
          // partial / substring fuzz: token appears as substring of any word
          const words = fullHay.split(/\s+/);
          if (words.some((w) => w.length >= 3 && tok.length >= 3 && (w.includes(tok) || tok.includes(w)))) {
            score += 1; hit = true;
          }
        }
        if (hit) matched += 1;
      }
      // bonus for matching more of the query tokens
      score += matched * 2;
      return { e, score };
    })
      .filter((r) => r.score > 0)
      .sort((a, b) => b.score - a.score);

    return scored.slice(0, 12).map((r) => r.e);
  }, [q, language]);

  const pick = (k: SearchNavChoice) => {
    setOpen(false);
    onSelect(k);
  };

  const isAr = language === "ar";

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={isAr ? "بحث" : "Search"}
        className="fixed bottom-24 right-5 z-40 w-14 h-14 rounded-full flex items-center justify-center shadow-lg hover:shadow-[var(--shadow-glow)] hover:scale-105 transition-all border border-primary/40 bg-primary text-primary-foreground"
        style={{ background: "var(--gradient-primary)" }}
      >
        <Search className="w-6 h-6" />
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-start justify-center p-4 sm:p-10 bg-background/70 backdrop-blur-sm animate-fade-in"
          onClick={() => setOpen(false)}
          dir={isAr ? "rtl" : "ltr"}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-xl rounded-2xl border border-primary/30 bg-secondary/95 backdrop-blur shadow-2xl overflow-hidden"
          >
            <div className="flex items-center gap-2 px-4 border-b border-white/10">
              <Search className="w-4 h-4 text-muted-foreground" />
              <input
                autoFocus
                value={q}
                onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && results[0]) pick(results[0].key);
                }}
                placeholder={isAr ? "ابحث عن أداة أو ميزة..." : "Search for a tool or feature..."}
                className="flex-1 h-12 bg-transparent outline-none text-sm placeholder:text-muted-foreground"
              />
              <kbd className="hidden sm:inline-block text-[10px] text-muted-foreground border border-white/10 rounded px-1.5 py-0.5">ESC</kbd>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-2">
              {results.length === 0 ? (
                <div className="text-center text-sm text-muted-foreground py-8">
                  {isAr ? "لا توجد نتائج" : "No results"}
                </div>
              ) : (
                results.map((e) => {
                  const t = e[language];
                  return (
                    <button
                      key={e.key}
                      onClick={() => pick(e.key)}
                      className="w-full flex items-center gap-3 text-start px-3 py-2.5 rounded-lg hover:bg-primary/10 transition group"
                    >
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-semibold text-foreground truncate">{t.title}</div>
                        <div className="text-xs text-muted-foreground truncate">{t.desc}</div>
                      </div>
                      <ArrowRight className={`w-4 h-4 text-primary opacity-0 group-hover:opacity-100 transition ${isAr ? "rotate-180" : ""}`} />
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}