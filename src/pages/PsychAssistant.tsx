import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Send, Heart, Loader2, Phone } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import { Button } from "@/components/ui/button";

type Msg = { role: "user" | "assistant"; content: string };

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
  },
} as const;

export default function PsychAssistant({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  const t = copy[language];
  const isAr = language === "ar";
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(true);
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
          messages.map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.18 }}
              className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[85%] whitespace-pre-wrap text-sm leading-relaxed rounded-2xl px-3.5 py-2.5 ${
                  m.role === "user"
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-card border border-border text-foreground rounded-bl-sm"
                }`}
              >
                {m.content}
              </div>
            </motion.div>
          ))
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
