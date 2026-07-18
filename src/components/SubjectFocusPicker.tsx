import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Send, Loader2, CheckCircle2, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import { SUBJECT_STORAGE_KEY, type AppSubject } from "@/pages/Subjects";

export const FOCUS_SUBJECT_PICKED_KEY = "app_focus_subject_picked_v1";
export const STUDY_PLAN_STORAGE_KEY = "app_study_plan_v1";

type Msg = { role: "user" | "assistant"; content: string };

const VALID_SUBJECTS: AppSubject[] = [
  "physics",
  "chemistry",
  "biology",
  "english",
  "french",
  "arabic",
  "islamic",
];

type ParsedPlan = {
  subject?: string;
  goal?: string;
  weeks?: number;
  tools?: string[];
  days?: { day: string; tasks: (string | { title: string; start?: string; end?: string })[] }[];
} | null;

function stripMarker(text: string): { clean: string; subject: AppSubject | null } {
  const m = text.match(/\[\[SUBJECT:([a-zA-Z]+)\]\]/);
  if (!m) return { clean: text, subject: null };
  const s = m[1].toLowerCase() as AppSubject;
  const subject = VALID_SUBJECTS.includes(s) ? s : null;
  return { clean: text.replace(m[0], "").trim(), subject };
}

function extractPlan(text: string): { clean: string; plan: ParsedPlan } {
  const re = /```plan\s*([\s\S]*?)```/i;
  const m = text.match(re);
  if (!m) return { clean: text, plan: null };
  try {
    const json = JSON.parse(m[1].trim());
    return { clean: text.replace(re, "").trim(), plan: json };
  } catch {
    return { clean: text.replace(re, "").trim(), plan: null };
  }
}

const copy = {
  en: {
    badge: "Study Coach",
    title: "Tamayzak Coach",
    subtitle: "Let's build your personal study plan.",
    placeholder: "Reply to your coach…",
    thinking: "Thinking…",
    planReady: "Your plan is ready",
    startStudying: "Start studying",
    error: "Something went wrong. Try again.",
    sentToTg: "Plan sent to your Telegram ✓",
    tgNotLinked: "Telegram not linked — reminders will only show in the app.",
  },
  ar: {
    badge: "مرشد الدراسة",
    title: "مرشد تميّزك",
    subtitle: "خلّنا نبني خطة الدراسة الخاصة بك.",
    placeholder: "رد على مرشدك…",
    thinking: "يفكر…",
    planReady: "خطتك جاهزة",
    startStudying: "ابدأ الدراسة",
    error: "صار خطأ. حاول مرة ثانية.",
    sentToTg: "تم إرسال الخطة إلى تلغرامك ✓",
    tgNotLinked: "تلغرام غير مربوط — التذكيرات ستظهر داخل التطبيق فقط.",
  },
} as const;

const SubjectFocusPicker = ({
  language,
  onPick,
}: {
  language: AppLanguage;
  onPick: (subject: AppSubject) => void;
}) => {
  const text = copy[language];
  const isAr = language === "ar";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [detectedSubject, setDetectedSubject] = useState<AppSubject | null>(null);
  const [plan, setPlan] = useState<ParsedPlan>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const bootedRef = useRef(false);

  const callAgent = async (history: Msg[]) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subject-plan-chat", {
        body: { messages: history, language },
      });
      if (error) throw error;
      const raw: string = (data as { reply?: string })?.reply ?? "";
      const { clean: c1, subject } = stripMarker(raw);
      const { clean, plan: parsedPlan } = extractPlan(c1);
      if (subject) setDetectedSubject(subject);
      if (parsedPlan) {
        setPlan(parsedPlan);
        const s = (parsedPlan.subject ?? "").toLowerCase() as AppSubject;
        if (VALID_SUBJECTS.includes(s)) setDetectedSubject(s);
      }
      setMessages((m) => [...m, { role: "assistant", content: clean || raw }]);
    } catch {
      setMessages((m) => [...m, { role: "assistant", content: text.error }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  // Kick off with a greeting from the coach.
  useEffect(() => {
    if (bootedRef.current) return;
    bootedRef.current = true;
    callAgent([]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading, plan]);

  const send = async () => {
    const q = input.trim();
    if (!q || loading) return;
    setInput("");
    const next: Msg[] = [...messages, { role: "user", content: q }];
    setMessages(next);
    await callAgent(next);
  };

  const commit = () => {
    const code = detectedSubject;
    if (!code) return;
    try {
      localStorage.setItem(SUBJECT_STORAGE_KEY, code);
      localStorage.setItem(FOCUS_SUBJECT_PICKED_KEY, "1");
      if (plan) {
        localStorage.setItem(
          STUDY_PLAN_STORAGE_KEY,
          JSON.stringify({ plan, savedAt: Date.now(), language }),
        );
      }
    } catch { /* ignore */ }
    window.dispatchEvent(new Event("app:study-plan-changed"));
    // Fire-and-forget: send plan to the user's Telegram if linked.
    if (plan) {
      supabase.functions.invoke("study-plan-notify", {
        body: { kind: "plan", plan, language },
      }).catch(() => { /* ignore — client scheduler still works */ });
    }
    window.dispatchEvent(new CustomEvent("app:set-subject", { detail: { subject: code } }));
    onPick(code);
  };

  return (
    <main
      className="min-h-screen w-full relative overflow-hidden flex flex-col"
      dir={isAr ? "rtl" : "ltr"}
    >
      {/* Theme-tinted ambient background using semantic tokens */}
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/15 blur-3xl" />

      {/* Header */}
      <header className="relative z-10 px-4 sm:px-6 pt-6 pb-3 max-w-3xl w-full mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary" />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <div className="text-[11px] uppercase tracking-[0.25em] text-muted-foreground">{text.badge}</div>
            <h1 className="text-lg font-semibold text-foreground leading-tight">{text.title}</h1>
          </div>
        </div>
        <p className="mt-2 text-sm text-muted-foreground">{text.subtitle}</p>
      </header>

      {/* Conversation */}
      <div
        ref={scrollRef}
        className="relative z-10 flex-1 overflow-y-auto px-4 sm:px-6 py-4 max-w-3xl w-full mx-auto"
      >
        <div className="space-y-5">
          <AnimatePresence initial={false}>
            {messages.map((m, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
              >
                {m.role === "user" ? (
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 bg-primary text-primary-foreground text-sm leading-relaxed whitespace-pre-wrap shadow-sm">
                    {m.content}
                  </div>
                ) : (
                  <div className="max-w-[92%] text-[15px] leading-relaxed text-foreground whitespace-pre-wrap">
                    {m.content}
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>

          {loading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              {text.thinking}
            </div>
          )}

          {plan && (
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-3"
            >
              <div className="flex items-center gap-2 text-primary font-semibold text-sm">
                <CheckCircle2 className="w-4 h-4" />
                {text.planReady}
              </div>
              {plan.goal && (
                <div className="text-sm text-foreground">
                  <span className="text-muted-foreground">🎯 </span>{plan.goal}
                </div>
              )}
              {plan.tools && plan.tools.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {plan.tools.map((t, ti) => (
                    <span key={ti} className="text-[11px] px-2 py-1 rounded-full bg-primary/15 text-primary border border-primary/30">
                      {t}
                    </span>
                  ))}
                </div>
              )}
              {plan.days && plan.days.length > 0 && (
                <ul className="space-y-2 mt-1">
                  {plan.days.map((d, di) => (
                    <li key={di} className="rounded-xl border border-border bg-card/60 p-3">
                      <div className="text-xs font-semibold text-primary mb-1">{d.day}</div>
                      <ul className="space-y-1 text-sm text-foreground">
                        {(d.tasks ?? []).map((tk, ti) => {
                          const title = typeof tk === "string" ? tk : tk.title;
                          const time = typeof tk === "string" ? null : (tk.start && tk.end ? `${tk.start}–${tk.end}` : null);
                          return (
                            <li key={ti} className="flex items-start gap-2">
                              <span className="text-primary/70 mt-0.5">•</span>
                              <span className="flex-1">
                                {time && (
                                  <span className="inline-block me-2 rtl:ml-2 rtl:mr-0 text-[11px] font-mono px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/25">
                                    {time}
                                  </span>
                                )}
                                {title}
                              </span>
                            </li>
                          );
                        })}
                      </ul>
                    </li>
                  ))}
                </ul>
              )}
              {detectedSubject && (
                <button
                  onClick={commit}
                  className="w-full mt-1 inline-flex items-center justify-center gap-2 h-10 rounded-full bg-primary text-primary-foreground text-sm font-semibold hover:opacity-90 transition"
                >
                  {text.startStudying}
                  <ArrowRight className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
                </button>
              )}
            </motion.div>
          )}
        </div>
      </div>

      {/* Composer */}
      <div className="relative z-10 px-4 sm:px-6 pb-6 pt-2 max-w-3xl w-full mx-auto">
        <div className="flex items-end gap-2 rounded-2xl border border-border bg-card/70 backdrop-blur px-3 py-2 focus-within:border-primary/60 transition-colors">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send();
              }
            }}
            rows={1}
            placeholder={text.placeholder}
            dir={isAr ? "rtl" : "ltr"}
            className="flex-1 resize-none bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground max-h-40 py-1.5"
          />
          <button
            onClick={send}
            disabled={loading || !input.trim()}
            aria-label="send"
            className="w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center hover:opacity-90 transition disabled:opacity-40"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />}
          </button>
        </div>
      </div>
    </main>
  );
};

export default SubjectFocusPicker;