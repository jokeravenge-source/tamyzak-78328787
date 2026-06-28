import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Heart, Loader2, Phone, ListPlus, CheckCircle2 } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import { Button } from "@/components/ui/button";
import { pushTodos, pullTodos, type SyncedTodo } from "@/lib/todosSync";

type Msg = { role: "user" | "assistant"; content: string };
type ParsedPlan = { title?: string; tasks: string[] } | null;

const STORAGE_KEY = "app_todos_v1";

function extractPlan(text: string): { clean: string; plan: ParsedPlan } {
  const re = /```plan\s*([\s\S]*?)```/i;
  const m = text.match(re);
  if (!m) return { clean: text, plan: null };
  try {
    const json = JSON.parse(m[1].trim());
    const tasks = Array.isArray(json?.tasks) ? json.tasks.filter((t: unknown) => typeof t === "string" && t.trim()) : [];
    if (!tasks.length) return { clean: text.replace(re, "").trim(), plan: null };
    return { clean: text.replace(re, "").trim(), plan: { title: typeof json.title === "string" ? json.title : undefined, tasks } };
  } catch {
    return { clean: text.replace(re, "").trim(), plan: null };
  }
}

const copy = {
  ar: {
    title: "المساعد النفسي",
    subtitle: "مساحة آمنة للتحدث عن ما يدور في بالك",
    intro: "أهلاً بك. أنا هنا للاستماع إليك ومساعدتك على تجاوز التوتر، القلق، وضغوط الدراسة. تحدث بحرية، كل ما تقوله سرّي.",
    placeholder: "اكتب ما تشعر به...",
    send: "إرسال",
    back: "رجوع",
    human: "تواصل مع متخصص بشري",
    humanDesc: "خط نجدة الصحة النفسية في العراق: 7821 / 119",
    loading: "يفكّر...",
    error: "حدث خطأ، حاول مرة أخرى.",
    planTitle: "خطة مقترحة",
    addPlan: "أضِف هذه الخطة إلى قائمة مهامي",
    planAdded: "تمت إضافة الخطة إلى قائمة المهام",
  },
  en: {
    title: "Psychological Assistant",
    subtitle: "A safe space to share what's on your mind",
    intro: "Welcome. I'm here to listen and help you with stress, anxiety, and study pressure. Speak freely, everything is confidential.",
    placeholder: "Type how you feel...",
    send: "Send",
    back: "Back",
    human: "Talk to a human specialist",
    humanDesc: "Mental health helpline (Iraq): 7821 / 119",
    loading: "Thinking...",
    error: "Something went wrong, try again.",
    planTitle: "Suggested plan",
    addPlan: "Add this plan to my to-do list",
    planAdded: "Plan added to your to-do list",
  },
} as const;

export default function PsychAssistant({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  const t = copy[language];
  const isAr = language === "ar";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [addedPlanKeys, setAddedPlanKeys] = useState<Set<number>>(new Set());
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await (supabase as any)
          .from("psych_messages")
          .select("role, content, created_at")
          .order("created_at", { ascending: true })
          .limit(200);
        if (Array.isArray(data)) {
          setMessages(data.map((r: any) => ({ role: r.role, content: r.content })));
        }
      } catch { /* ignore */ }
      setLoadingHistory(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    })();
  }, []);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    const next = [...messages, { role: "user" as const, content: text }];
    setMessages(next);
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("psych-chat", {
        body: { message: text, history: messages.slice(-20) },
      });
      if (error) throw error;
      const reply = (data as any)?.reply ?? "";
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch (e: any) {
      toast.error(t.error);
      setMessages((m) => [...m, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const addPlanToTodos = async (idx: number, plan: NonNullable<ParsedPlan>) => {
    try {
      // load existing
      let existing: SyncedTodo[] = [];
      const remote = await pullTodos();
      if (remote && Array.isArray(remote)) {
        existing = remote;
      } else {
        try {
          const raw = localStorage.getItem(STORAGE_KEY);
          if (raw) existing = JSON.parse(raw);
        } catch { /* ignore */ }
      }
      const newOnes: SyncedTodo[] = plan.tasks.map((text) => ({
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        text,
        done: false,
      }));
      const merged = [...existing, ...newOnes];
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(merged)); } catch { /* ignore */ }
      await pushTodos(merged);
      setAddedPlanKeys((s) => new Set(s).add(idx));
      toast.success(t.planAdded);
    } catch {
      toast.error(t.error);
    }
  };

  return (
    <main className="min-h-screen flex flex-col px-3 sm:px-4 py-4 sm:py-6 max-w-3xl mx-auto" dir={isAr ? "rtl" : "ltr"}>
      <header className="flex items-center justify-between mb-4">
        <button onClick={onBack} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />
          {t.back}
        </button>
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
            <Heart className="w-4 h-4 text-primary" />
          </div>
          <div className={isAr ? "text-right" : "text-left"}>
            <h1 className="text-base font-semibold leading-tight">{t.title}</h1>
            <p className="text-[11px] text-muted-foreground">{t.subtitle}</p>
          </div>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-y-auto rounded-2xl border border-border bg-secondary/30 backdrop-blur p-3 sm:p-5 space-y-4 min-h-[60vh]">
        {loadingHistory ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-sm text-foreground/80 leading-relaxed bg-card/60 border border-border rounded-xl p-4"
          >
            {t.intro}
          </motion.div>
        ) : (
          messages.map((m, i) => {
            const { clean, plan } = m.role === "assistant" ? extractPlan(m.content) : { clean: m.content, plan: null as ParsedPlan };
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18 }}
                className={`flex flex-col gap-2 ${m.role === "user" ? "items-end" : "items-start"}`}
              >
                {clean && (
                  <div
                    className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                      m.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-sm"
                        : "bg-card border border-border text-foreground rounded-bl-sm"
                    }`}
                  >
                    {clean}
                  </div>
                )}
                {plan && (
                  <div className="max-w-[85%] w-full rounded-2xl border border-primary/30 bg-primary/5 p-3 space-y-2">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wide">
                      {plan.title || t.planTitle}
                    </div>
                    <ul className="space-y-1.5">
                      {plan.tasks.map((task, ti) => (
                        <li key={ti} className="flex items-start gap-2 text-sm text-foreground">
                          <CheckCircle2 className="w-4 h-4 mt-0.5 text-primary/60 shrink-0" />
                          <span>{task}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      size="sm"
                      variant={addedPlanKeys.has(i) ? "secondary" : "default"}
                      onClick={() => addPlanToTodos(i, plan)}
                      disabled={addedPlanKeys.has(i)}
                      className="w-full mt-1 gap-2"
                    >
                      <ListPlus className="w-4 h-4" />
                      {addedPlanKeys.has(i) ? t.planAdded : t.addPlan}
                    </Button>
                  </div>
                )}
              </motion.div>
            );
          })
        )}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.loading}
          </div>
        )}
      </div>

      <div className="mt-3 flex items-end gap-2">
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
          rows={2}
          placeholder={t.placeholder}
          className="flex-1 resize-none rounded-xl border border-border bg-card/60 px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40"
        />
        <Button onClick={send} disabled={loading || !input.trim()} size="icon" className="h-11 w-11 shrink-0">
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className={`w-4 h-4 ${isAr ? "rotate-180" : ""}`} />}
        </Button>
      </div>

      <a
        href="tel:7821"
        className="mt-3 inline-flex items-center gap-2 self-center text-xs text-muted-foreground hover:text-foreground transition"
      >
        <Phone className="w-3.5 h-3.5" />
        <span className="font-medium">{t.human}</span>
        <span className="opacity-70">— {t.humanDesc}</span>
      </a>
    </main>
  );
}
