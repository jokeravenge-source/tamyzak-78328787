import { useEffect, useState } from "react";
import { useFeatureUsed } from "@/hooks/useFeatureUsed";
import { ArrowLeft, Plus, Trash2, CheckCircle2, Circle, PartyPopper, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { AppLanguage } from "@/components/LanguageGate";
import { pushTodos, pullTodos } from "@/lib/todosSync";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

type Todo = { id: string; text: string; done: boolean; day?: string };

const STORAGE_KEY = "app_todos_v1";
const CELEBRATED_KEY = "app_todos_celebrated_v1";

const DAYS = [
  { key: "Saturday", en: "Saturday", ar: "السبت", alt: ["السبت"] },
  { key: "Sunday", en: "Sunday", ar: "الأحد", alt: ["الأحد", "الاحد"] },
  { key: "Monday", en: "Monday", ar: "الإثنين", alt: ["الإثنين", "الاثنين"] },
  { key: "Tuesday", en: "Tuesday", ar: "الثلاثاء", alt: ["الثلاثاء"] },
  { key: "Wednesday", en: "Wednesday", ar: "الأربعاء", alt: ["الأربعاء", "الاربعاء"] },
  { key: "Thursday", en: "Thursday", ar: "الخميس", alt: ["الخميس"] },
  { key: "Friday", en: "Friday", ar: "الجمعة", alt: ["الجمعة"] },
] as const;

/** Map any stored day label (English or Arabic, legacy included) to a canonical key. */
function normalizeDay(day?: string): string | null {
  if (!day) return null;
  const v = day.trim();
  const hit = DAYS.find((d) => d.en === v || d.ar === v || (d.alt as readonly string[]).includes(v));
  return hit ? hit.key : null;
}

function todayKey(): string {
  // JS: 0=Sunday … 6=Saturday
  const map = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return map[new Date().getDay()];
}

const t = {
  en: {
    title: "To-Do List",
    subtitle: "Resets every week. Plan, check off, finish strong.",
    add: "Add",
    placeholder: "Add a task…",
    empty: "No tasks yet. Add your first one above.",
    back: "Back",
    progress: "completed",
    congrats: "Amazing work!",
    congratsBody: "You completed every task on your list. Take a deep breath — you earned it.",
    close: "Awesome",
    clear: "Clear all",
    unassigned: "Unassigned",
    noTasksDay: "No tasks for this day.",
    forDay: "Day",
    sendTelegram: "Send today's tasks to Telegram",
    sending: "Sending…",
    sentOk: "Sent to your Telegram ✓",
    notLinked: "Link your Telegram first (Account → Telegram).",
    sendFail: "Could not send to Telegram.",
  },
  ar: {
    title: "قائمة المهام",
    subtitle: "تُعاد كل أسبوع. خطّط، أنجز، وأنهِ بقوة.",
    add: "إضافة",
    placeholder: "أضف مهمة…",
    empty: "لا توجد مهام بعد. أضف أول مهمة بالأعلى.",
    back: "رجوع",
    progress: "منجزة",
    congrats: "عمل رائع!",
    congratsBody: "لقد أنجزت كل المهام في قائمتك. خذ نفسًا عميقًا — أنت تستحق ذلك.",
    close: "ممتاز",
    clear: "مسح الكل",
    unassigned: "بدون يوم",
    noTasksDay: "لا توجد مهام لهذا اليوم.",
    forDay: "اليوم",
    sendTelegram: "أرسل مهام اليوم إلى تيليجرام",
    sending: "جاري الإرسال…",
    sentOk: "تم الإرسال إلى تيليجرام ✓",
    notLinked: "اربط تيليجرام أولاً من إعدادات الحساب.",
    sendFail: "تعذّر الإرسال إلى تيليجرام.",
  },
} as const;

const TodoList = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  useFeatureUsed("todo_list");
  const text = t[language];
  const [todos, setTodos] = useState<Todo[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]"); } catch { return []; }
  });
  const [input, setInput] = useState("");
  const [dayPick, setDayPick] = useState<string>(() => todayKey());
  const [showCongrats, setShowCongrats] = useState(false);
  const [sending, setSending] = useState(false);

  const sendToTelegram = async () => {
    if (sending) return;
    setSending(true);
    try {
      // Make sure the account copy is up to date, and send the current list too.
      await pushTodos(todos);
      const { data, error } = await supabase.functions.invoke("todo-telegram-reminder", {
        body: { language, items: todos },
      });
      let err = (data as { error?: string } | null)?.error;
      if (!err && error) {
        // invoke() hides the real body behind a generic non-2xx message.
        const ctx = (error as { context?: Response }).context;
        if (ctx && typeof ctx.text === "function") {
          const raw = await ctx.text().catch(() => "");
          try { err = (JSON.parse(raw) as { error?: string }).error || raw; } catch { err = raw; }
        }
        err = err || (error as { message?: string }).message || "unknown_error";
      }
      if (err === "telegram_not_linked") {
        toast({ title: text.notLinked, variant: "destructive" });
      } else if (err) {
        toast({ title: text.sendFail, description: err, variant: "destructive" });
      } else {
        toast({ title: text.sentOk });
      }
    } catch (e) {
      toast({ title: text.sendFail, description: e instanceof Error ? e.message : String(e), variant: "destructive" });
    } finally {
      setSending(false);
    }
  };

  useEffect(() => {
    const onChange = () => {
      try { setTodos(JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]")); } catch { /* noop */ }
    };
    window.addEventListener("app:todos-changed", onChange);
    return () => window.removeEventListener("app:todos-changed", onChange);
  }, []);

  // Restore todos saved to the user's account on first load (so they persist
  // across browsers/devices and don't disappear after closing the site).
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const remote = await pullTodos();
      if (cancelled || !remote) return;
      const localRaw = localStorage.getItem(STORAGE_KEY);
      const local: Todo[] = (() => { try { return JSON.parse(localRaw || "[]"); } catch { return []; } })();
      // Merge: keep all remote items, append any local items not present remotely (by id).
      const seen = new Set(remote.map((r) => r.id));
      const merged = [...remote, ...local.filter((l) => !seen.has(l.id))] as Todo[];
      setTodos(merged);
    })();
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    pushTodos(todos);
    if (todos.length > 0 && todos.every((t) => t.done)) {
      if (localStorage.getItem(CELEBRATED_KEY) !== "1") {
        setShowCongrats(true);
        localStorage.setItem(CELEBRATED_KEY, "1");
      }
    } else {
      localStorage.removeItem(CELEBRATED_KEY);
    }
  }, [todos]);

  const add = (e: React.FormEvent) => {
    e.preventDefault();
    const v = input.trim();
    if (!v) return;
    setTodos((prev) => [...prev, { id: crypto.randomUUID(), text: v, done: false, day: dayPick }]);
    setInput("");
  };
  const toggle = (id: string) =>
    setTodos((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  const remove = (id: string) => setTodos((prev) => prev.filter((t) => t.id !== id));
  const clearAll = () => { setTodos([]); localStorage.removeItem(CELEBRATED_KEY); };

  const completed = todos.filter((t) => t.done).length;

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
        aria-label={text.back}
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <section className="relative z-10 max-w-xl mx-auto">
        <header className="text-center mb-8">
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-2">{text.title}</h1>
          <p className="text-muted-foreground text-sm">{text.subtitle}</p>
        </header>

        <form onSubmit={add} className="flex gap-2 mb-4">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={text.placeholder}
            maxLength={120}
            className="flex-1 h-12 px-4 rounded-2xl bg-secondary/60 border border-white/10 focus:border-primary/60 outline-none text-sm"
          />
          <button
            type="submit"
            className="h-12 px-5 rounded-2xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />{text.add}
          </button>
        </form>

        <div className="mb-4 flex flex-wrap gap-2">
          {DAYS.map((d) => (
            <button
              key={d.key}
              type="button"
              onClick={() => setDayPick(d.key)}
              className={`px-3 h-9 rounded-xl text-xs font-semibold border transition ${
                dayPick === d.key
                  ? "border-primary/60 bg-primary/20 text-foreground"
                  : "border-white/10 bg-secondary/40 text-muted-foreground hover:text-foreground"
              }`}
            >
              {language === "ar" ? d.ar : d.en}
            </button>
          ))}
        </div>

        <button
          onClick={sendToTelegram}
          disabled={sending}
          className="w-full mb-4 h-11 rounded-2xl bg-secondary/60 border border-white/10 hover:border-primary/40 text-sm font-semibold inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
        >
          <Send className="w-4 h-4" />
          {sending ? text.sending : text.sendTelegram}
        </button>

        {todos.length > 0 && (
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-3 px-1">
            <span>{completed}/{todos.length} {text.progress}</span>
            <button onClick={clearAll} className="hover:text-foreground transition">{text.clear}</button>
          </div>
        )}

        {(() => {
          const groups = new Map<string, Todo[]>();
          for (const d of DAYS) groups.set(d.key, []);
          groups.set("__none__", []);
          for (const td of todos) {
            const key = normalizeDay(td.day) || "__none__";
            groups.get(key)!.push(td);
          }
          const sections = [
            ...DAYS.map((d) => ({ key: d.key, label: language === "ar" ? d.ar : d.en })),
            { key: "__none__", label: text.unassigned },
          ].filter((s) => s.key !== "__none__" || groups.get("__none__")!.length > 0);
          return (
            <div className="space-y-6">
              {sections.map(({ key, label }) => (
                <div key={key}>
                  <div className="flex items-center justify-between mb-2 px-1">
                    <h3 className="text-xs uppercase tracking-[0.2em] text-primary">{label}</h3>
                    <span className="text-[11px] text-muted-foreground">
                      {groups.get(key)!.filter((x) => x.done).length}/{groups.get(key)!.length}
                    </span>
                  </div>
                  {groups.get(key)!.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-white/10 bg-secondary/20 p-3 text-center text-xs text-muted-foreground">
                      {text.noTasksDay}
                    </div>
                  ) : (
                  <ul className="space-y-2">
                    <AnimatePresence initial={false}>
                      {groups.get(key)!.map((todo) => (
                        <motion.li
                          key={todo.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: language === "ar" ? -20 : 20 }}
                          transition={{ duration: 0.2 }}
                          className={`flex items-center gap-3 rounded-2xl border p-4 backdrop-blur transition ${todo.done ? "border-primary/40 bg-primary/10" : "border-white/10 bg-secondary/40"}`}
                        >
                          <button onClick={() => toggle(todo.id)} className="shrink-0">
                            {todo.done ? (
                              <CheckCircle2 className="w-6 h-6 text-primary" />
                            ) : (
                              <Circle className="w-6 h-6 text-muted-foreground" />
                            )}
                          </button>
                          <span className={`flex-1 text-sm ${todo.done ? "line-through text-muted-foreground" : "text-foreground"}`}>
                            {todo.text}
                          </span>
                          <button onClick={() => remove(todo.id)} aria-label="delete" className="text-muted-foreground hover:text-destructive transition">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </motion.li>
                      ))}
                    </AnimatePresence>
                  </ul>
                  )}
                </div>
              ))}
            </div>
          );
        })()}
      </section>

      <AnimatePresence>
        {showCongrats && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/70 backdrop-blur-md p-4"
            onClick={() => setShowCongrats(false)}
          >
            <motion.div
              initial={{ scale: 0.8, y: 30, opacity: 0 }}
              animate={{ scale: 1, y: 0, opacity: 1 }}
              exit={{ scale: 0.85, opacity: 0 }}
              transition={{ type: "spring", damping: 18, stiffness: 220 }}
              onClick={(e) => e.stopPropagation()}
              className="relative max-w-sm w-full rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/20 via-secondary/80 to-accent/20 backdrop-blur-xl p-8 text-center overflow-hidden"
            >
              <div className="pointer-events-none absolute -top-20 -right-20 w-48 h-48 rounded-full bg-primary/30 blur-3xl" />
              <div className="pointer-events-none absolute -bottom-20 -left-20 w-48 h-48 rounded-full bg-accent/30 blur-3xl" />
              <div className="relative">
                <motion.div
                  initial={{ rotate: -20, scale: 0.5 }}
                  animate={{ rotate: 0, scale: 1 }}
                  transition={{ delay: 0.1, type: "spring", stiffness: 260 }}
                  className="mx-auto w-20 h-20 rounded-3xl bg-primary/20 flex items-center justify-center mb-4"
                >
                  <PartyPopper className="w-10 h-10 text-primary" />
                </motion.div>
                <h2 className="text-3xl font-bold gradient-text mb-2">🎉 {text.congrats}</h2>
                <p className="text-sm text-muted-foreground mb-6">{text.congratsBody}</p>
                <button
                  onClick={() => setShowCongrats(false)}
                  className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold"
                >
                  {text.close}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </main>
  );
};

export default TodoList;