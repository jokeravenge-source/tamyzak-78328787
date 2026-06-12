import { useState, useRef, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GeminiStatus from "@/components/GeminiStatus";
import ChatBlobBackground from "@/components/ChatBlobBackground";
import type { AppSubject } from "@/pages/Subjects";
import type { AppLanguage } from "@/components/LanguageGate";

type Msg = { role: "user" | "assistant"; content: string };

const labels = {
  en: {
    title: "AI Tutor",
    placeholder: "Ask anything about this subject...",
    welcome: (s: string) => `Hi! I'm your ${s} tutor. Ask me anything.`,
    send: "Send",
    error: "Something went wrong. Please try again.",
  },
  ar: {
    title: "المعلم الذكي",
    placeholder: "اسأل أي سؤال عن هذه المادة...",
    welcome: (s: string) => `مرحباً! أنا معلمك في مادة ${s}. اسألني أي شيء.`,
    send: "إرسال",
    error: "حدث خطأ. حاول مرة أخرى.",
  },
};

const subjectName = (s: AppSubject, lang: AppLanguage) => {
  const map: Record<AppSubject, { en: string; ar: string }> = {
    physics: { en: "Physics", ar: "الفيزياء" },
    chemistry: { en: "Chemistry", ar: "الكيمياء" },
    biology: { en: "Biology", ar: "الأحياء" },
    english: { en: "English", ar: "الإنجليزية" },
    french: { en: "French", ar: "الفرنسية" },
    arabic: { en: "Arabic", ar: "العربية" },
    islamic: { en: "Islamic Education", ar: "التربية الإسلامية" },
    revision: { en: "Revision", ar: "المراجعة" },
  };
  return map[s][lang];
};

const SubjectAgent = ({ subject, language }: { subject: AppSubject; language: AppLanguage }) => {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  const t = labels[language];
  const sName = subjectName(subject, language);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subject-agent", {
        body: { subject, language, messages: next },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "";
      setMessages([...next, { role: "assistant", content: reply || t.error }]);
    } catch {
      setMessages([...next, { role: "assistant", content: t.error }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t.title}
        className="fixed bottom-24 right-6 z-[55] inline-flex items-center gap-2 h-12 px-4 rounded-full border border-accent/40 bg-secondary/80 backdrop-blur text-foreground shadow-lg hover:scale-105 hover:border-accent transition-all duration-300"
      >
        <Bot className="w-5 h-5 text-primary" />
        <span className="text-sm font-medium hidden sm:inline">{t.title} · {sName}</span>
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[80] bg-background/60 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={() => setOpen(false)}
        >
          <div
            dir={language === "ar" ? "rtl" : "ltr"}
            className="relative w-full sm:max-w-lg h-[85vh] sm:h-[600px] flex flex-col rounded-t-3xl sm:rounded-3xl border border-primary/30 gemini-chat-bg shadow-[var(--shadow-glow)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <ChatBlobBackground />
            <div className="relative z-10 flex items-center justify-between px-4 py-3 border-b border-border bg-secondary/40">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5 text-primary" />
                <div>
                  <div className="font-semibold text-sm">{t.title}</div>
                  <div className="text-xs text-muted-foreground">{sName}</div>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3">
              {messages.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-8">{t.welcome(sName)}</div>
              )}
              {messages.map((m, i) => (
                m.role === "user" ? (
                  <div key={i} className="flex justify-end">
                    <div className="max-w-[85%] rounded-3xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed bg-secondary text-foreground border border-border">
                      {m.content}
                    </div>
                  </div>
                ) : (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="gemini-dot mt-1 inline-block w-5 h-5 rounded-full shrink-0" aria-hidden />
                    <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                      {m.content}
                    </div>
                  </div>
                )
              ))}
              {loading && <GeminiStatus language={language} />}
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
                aria-label={t.send}
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default SubjectAgent;