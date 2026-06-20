import { useEffect, useRef, useState } from "react";
import { Sparkles, X, Send, CalendarDays, HeartHandshake, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GeminiStatus from "@/components/GeminiStatus";
import ChatBlobBackground from "@/components/ChatBlobBackground";
import type { AppLanguage } from "@/components/LanguageGate";
import { pushTodos } from "@/lib/todosSync";

type Msg = { role: "user" | "assistant"; content: string };
type Mode = "schedule" | "problem";
type PlanTask = { day: string; text: string };

const TODOS_KEY = "app_todos_v1";
const WEEK_KEY = "app_todos_week_v1";

const labels = {
  en: {
    fab: "Excellence Companion",
    title: "Excellence Companion",
    subtitle: "Pick how I can help you today",
    schedule: "Organize my schedule",
    scheduleDesc: "Tell me your subjects and I'll plan your week.",
    problem: "Solve my problem",
    problemDesc: "Share what's on your mind and we'll fix it together.",
    placeholder: "Type your message…",
    welcomeSchedule: "Hi! Tell me which subjects you want to study this week, how many sessions for each, and which days work for you.",
    welcomeProblem: "Hi! I'm here to help. What's the problem you'd like to work on?",
    approve: "Approve plan & add to my to-do list",
    approved: "Plan added to your weekly to-do list ✓",
    back: "Back",
    error: "Something went wrong. Please try again.",
  },
  ar: {
    fab: "رفيق التميز",
    title: "رفيق التميز",
    subtitle: "اختر كيف أقدر أساعدك اليوم",
    schedule: "نظم جدولي",
    scheduleDesc: "أخبرني بموادك وسأنظّم لك أسبوعك.",
    problem: "حلي مشكلتي",
    problemDesc: "شاركني مشكلتك وسنحلها سوياً.",
    placeholder: "اكتب رسالتك…",
    welcomeSchedule: "أهلاً! أخبرني بالمواد التي تريد دراستها هذا الأسبوع، وكم مرة لكل مادة، وأي أيام مناسبة لك؟",
    welcomeProblem: "أهلاً! أنا هنا لمساعدتك. ما المشكلة التي تريد العمل عليها؟",
    approve: "وافق على الخطة وأضفها لقائمة مهامي",
    approved: "تمت إضافة الخطة لقائمة مهامك الأسبوعية ✓",
    back: "رجوع",
    error: "حدث خطأ. حاول مرة أخرى.",
  },
};

function getISOWeek(d = new Date()): string {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  const day = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${weekNo}`;
}

function extractPlan(text: string): PlanTask[] | null {
  const m = text.match(/```json\s*([\s\S]*?)```/i);
  if (!m) return null;
  try {
    const parsed = JSON.parse(m[1].trim());
    if (parsed && Array.isArray(parsed.tasks)) {
      const tasks = parsed.tasks
        .filter((t: unknown): t is PlanTask =>
          !!t && typeof (t as PlanTask).day === "string" && typeof (t as PlanTask).text === "string"
        )
        .map((t) => ({ day: t.day.trim(), text: t.text.trim() }));
      return tasks.length ? tasks : null;
    }
  } catch {
    return null;
  }
  return null;
}

function stripPlanBlock(text: string): string {
  return text.replace(/```json\s*[\s\S]*?```/gi, "").trim();
}

const ExcellenceCompanion = ({ language, embedded = false }: { language: AppLanguage; embedded?: boolean }) => {
  const [open, setOpen] = useState(embedded);
  const [mode, setMode] = useState<Mode | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [approved, setApproved] = useState(false);

  useEffect(() => {
    if (embedded) return;
    const onOpen = () => setOpen(true);
    window.addEventListener("app:open-excellence-companion", onOpen);
    return () => window.removeEventListener("app:open-excellence-companion", onOpen);
  }, [embedded]);
  const endRef = useRef<HTMLDivElement>(null);
  const t = labels[language];

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const reset = () => {
    setMode(null);
    setMessages([]);
    setInput("");
    setApproved(false);
  };

  const pickMode = (m: Mode) => {
    setMode(m);
    setMessages([{ role: "assistant", content: m === "schedule" ? t.welcomeSchedule : t.welcomeProblem }]);
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !mode) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("excellence-companion", {
        body: { mode, language, messages: next },
      });
      const replyFromData = (data as { reply?: string; error?: string } | null)?.reply;
      if (error && !replyFromData) {
        const ctx = (error as { context?: { error?: string; upgrade?: boolean } }).context;
        const upgrade = ctx?.upgrade || /Premium|free uses/i.test(String(ctx?.error || ""));
        // Never surface the raw "Edge Function returned a non-2xx status code" string.
        const rawMsg = String(ctx?.error || error.message || "");
        const isNon2xx = /non-2xx/i.test(rawMsg);
        const msg = upgrade
          ? (language === "ar"
              ? "استهلكت 5 استخدامات اليومية. رقّ إلى البريميوم للاستخدام غير المحدود."
              : "You've used your 5 free uses today. Upgrade to Premium for unlimited access.")
          : (isNon2xx || !ctx?.error
              ? (language === "ar"
                  ? "تعذّر الرد الآن. حاول مرة أخرى بعد لحظات."
                  : "Could not respond just now. Please try again in a moment.")
              : ctx.error);
        setMessages([...next, { role: "assistant", content: msg }]);
        return;
      }
      const reply = replyFromData ?? t.error;
      setMessages([...next, { role: "assistant", content: reply }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant");
  const pendingPlan = lastAssistant ? extractPlan(lastAssistant.content) : null;

  const approvePlan = () => {
    if (!pendingPlan) return;
    const currentWeek = getISOWeek();
    const storedWeek = localStorage.getItem(WEEK_KEY);
    let existing: Array<{ id: string; text: string; done: boolean; day?: string }> = [];
    if (storedWeek === currentWeek) {
      try { existing = JSON.parse(localStorage.getItem(TODOS_KEY) || "[]"); } catch { existing = []; }
    } else {
      localStorage.setItem(WEEK_KEY, currentWeek);
    }
    const newTodos = pendingPlan.map((p) => ({
      id: crypto.randomUUID(),
      text: p.text,
      done: false,
      day: p.day,
    }));
    const merged = [...existing, ...newTodos];
    localStorage.setItem(TODOS_KEY, JSON.stringify(merged));
    localStorage.removeItem("app_todos_celebrated_v1");
    window.dispatchEvent(new Event("app:todos-changed"));
    pushTodos(merged);
    setApproved(true);
  };

  const panel = (
          <div
            dir={language === "ar" ? "rtl" : "ltr"}
            className={
              embedded
                ? "relative w-full h-[640px] flex flex-col rounded-3xl border border-primary/30 gemini-chat-bg shadow-[var(--shadow-glow)] overflow-hidden"
                : "relative w-full sm:max-w-lg h-[88vh] sm:h-[640px] flex flex-col rounded-t-3xl sm:rounded-3xl border border-primary/30 gemini-chat-bg shadow-[var(--shadow-glow)] overflow-hidden"
            }
            onClick={(e) => e.stopPropagation()}
          >
            <ChatBlobBackground />
            <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-semibold text-sm">{t.title}</div>
                  {mode && (
                    <button onClick={reset} className="text-xs text-muted-foreground hover:text-foreground">
                      ← {t.back}
                    </button>
                  )}
                </div>
              </div>
              {!embedded && (
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              )}
            </div>

            {!mode ? (
              <div className="relative z-10 flex-1 overflow-y-auto p-6 flex flex-col gap-4 justify-center">
                <p className="text-center text-sm text-muted-foreground mb-2">{t.subtitle}</p>
                <button
                  onClick={() => pickMode("schedule")}
                  className="group rounded-2xl p-5 border border-primary/30 bg-secondary/40 hover:border-primary hover:-translate-y-1 transition-all text-start"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-xl bg-primary/15 flex items-center justify-center">
                      <CalendarDays className="w-5 h-5 text-primary" />
                    </div>
                    <h3 className="font-semibold">{t.schedule}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.scheduleDesc}</p>
                </button>
                <button
                  onClick={() => pickMode("problem")}
                  className="group rounded-2xl p-5 border border-accent/30 bg-secondary/40 hover:border-accent hover:-translate-y-1 transition-all text-start"
                >
                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-11 h-11 rounded-xl bg-accent/15 flex items-center justify-center">
                      <HeartHandshake className="w-5 h-5 text-accent" />
                    </div>
                    <h3 className="font-semibold">{t.problem}</h3>
                  </div>
                  <p className="text-xs text-muted-foreground">{t.problemDesc}</p>
                </button>
              </div>
            ) : (
              <>
                <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3">
                  {messages.map((m, i) => {
                    const display = m.role === "assistant" ? stripPlanBlock(m.content) : m.content;
                    return m.role === "user" ? (
                      <div key={i} className="flex justify-end">
                        <div className="max-w-[85%] rounded-3xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed bg-secondary text-foreground border border-border">
                          {display}
                        </div>
                      </div>
                    ) : (
                      <div key={i} className="flex gap-3 items-start">
                        <span className="gemini-dot mt-1 inline-block w-5 h-5 rounded-full shrink-0" aria-hidden />
                        <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                          {display}
                        </div>
                      </div>
                    );
                  })}
                  {loading && <GeminiStatus language={language} />}
                  {pendingPlan && !approved && (
                    <button
                      onClick={approvePlan}
                      className="w-full mt-2 inline-flex items-center justify-center gap-2 h-11 rounded-xl bg-primary text-primary-foreground hover:opacity-90 text-sm font-semibold"
                    >
                      <CheckCircle2 className="w-4 h-4" /> {t.approve}
                    </button>
                  )}
                  {approved && (
                    <div className="rounded-xl border border-primary/40 bg-primary/10 px-4 py-3 text-sm text-primary text-center">
                      {t.approved}
                    </div>
                  )}
                  <div ref={endRef} />
                </div>

                <div className="relative z-10 border-t border-border p-3 flex items-end gap-2 bg-secondary/30">
                  <textarea
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && !e.shiftKey) {
                        e.preventDefault();
                        send();
                      }
                    }}
                    placeholder={t.placeholder}
                    rows={1}
                    className="flex-1 resize-none rounded-xl bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary max-h-32"
                  />
                  <button
                    onClick={send}
                    disabled={!input.trim() || loading}
                    className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              </>
            )}
          </div>
  );

  if (embedded) return panel;

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.fab}
        className="fixed bottom-32 right-5 z-[55] inline-flex items-center gap-2 h-12 px-4 rounded-full border border-primary/50 bg-gradient-to-r from-primary/90 to-accent/90 text-primary-foreground shadow-lg hover:scale-105 transition-all duration-300"
      >
        <Sparkles className="w-4 h-4" />
        <span className="text-sm font-semibold">{t.fab}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-background/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          {panel}
        </div>
      )}
    </>
  );
};

export default ExcellenceCompanion;