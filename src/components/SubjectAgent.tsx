import { useState, useRef, useEffect } from "react";
import { Bot, Send, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import GeminiStatus from "@/components/GeminiStatus";
import ChatBlobBackground from "@/components/ChatBlobBackground";
import type { AppSubject } from "@/pages/Subjects";
import type { AppLanguage } from "@/components/LanguageGate";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

type Msg = { role: "user" | "assistant"; content: string };
type StorageObj = { name: string; id?: string | null; metadata?: { size?: number; contentLength?: number; mimetype?: string } };

const MAX_CLIENT_CONTEXT_CHARS = 200_000;
const MAX_CLIENT_FILES = 4;

const labels = {
  en: {
    title: "AI Tutor",
    placeholder: "Ask anything about this subject...",
    welcome: (s: string) => `Hi! I'm your ${s} tutor. Ask me anything.`,
    send: "Send",
    error: "Something went wrong. Please try again.",
    pickChapter: "Which chapter would you like to study? Pick one to get started:",
    noChapters: "No chapters have been uploaded for this subject yet. Please ask an admin to add files.",
    changeChapter: "Change chapter",
    preparing: "Reading the chapter files... this may take a moment for large PDFs.",
    extractFailed: "I couldn't read the chapter files (they may be scanned images). Try a smaller PDF or ask an admin.",
  },
  ar: {
    title: "المعلم الذكي",
    placeholder: "اسأل أي سؤال عن هذه المادة...",
    welcome: (s: string) => `مرحباً! أنا معلمك في مادة ${s}. اسألني أي شيء.`,
    send: "إرسال",
    error: "حدث خطأ. حاول مرة أخرى.",
    pickChapter: "أي فصل تريد أن تدرس؟ اختر فصلاً للبدء:",
    noChapters: "لا توجد فصول مرفوعة لهذه المادة بعد. يرجى الطلب من المسؤول إضافة ملفات.",
    changeChapter: "تغيير الفصل",
    preparing: "جاري قراءة ملفات الفصل... قد يستغرق ذلك بعض الوقت للملفات الكبيرة.",
    extractFailed: "تعذر قراءة ملفات الفصل (قد تكون صوراً ممسوحة). جرب ملف PDF أصغر أو اطلب من المسؤول.",
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
  const [chapters, setChapters] = useState<string[]>([]);
  const [chapter, setChapter] = useState<string>("");
  const [chaptersLoading, setChaptersLoading] = useState(false);
  const contextCache = useRef(new Map<string, string>());
  const endRef = useRef<HTMLDivElement>(null);
  const t = labels[language];
  const sName = subjectName(subject, language);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  useEffect(() => {
    if (!open) return;
    (async () => {
      setChaptersLoading(true);
      const { data } = await supabase.rpc("list_subject_chapters", { _subject: subject });
      const list = ((data ?? []) as Array<{ chapter: string }>)
        .map((r) => r.chapter)
        .filter(Boolean);
      const order = ["general", "ch1", "ch2", "ch3", "ch4", "ch5", "ch6", "ch7", "ch8"];
      list.sort((a, b) => {
        const ai = order.indexOf(a);
        const bi = order.indexOf(b);
        if (ai !== -1 && bi !== -1) return ai - bi;
        if (ai !== -1) return -1;
        if (bi !== -1) return 1;
        return a.localeCompare(b);
      });
      setChapters(list);
      setChapter("");
      setMessages([]);
      setChaptersLoading(false);
    })();
  }, [open, subject]);

  const extractPdfText = async (blob: Blob) => {
    const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
    const chunks: string[] = [];
    let chars = 0;
    try {
      for (let pageNo = 1; pageNo <= pdf.numPages && chars < MAX_CLIENT_CONTEXT_CHARS; pageNo++) {
        const page = await pdf.getPage(pageNo);
        try {
          const content = await page.getTextContent();
          const text = content.items.map((item) => ("str" in item ? item.str : "")).join(" ");
          if (text.trim()) chunks.push(text);
          chars += text.length;
        } finally {
          page.cleanup();
        }
      }
    } finally {
      await pdf.destroy();
    }
    return chunks.join("\n");
  };

  const buildChapterContext = async (selectedChapter: string) => {
    const key = `${subject}/${selectedChapter}`;
    const cached = contextCache.current.get(key);
    if (cached) return cached;
    const folder = selectedChapter === "general" ? subject : `${subject}/${selectedChapter}`;
    const { data } = await supabase.storage.from("files").list(folder, { limit: 100 });
    const files = ((data ?? []) as StorageObj[])
      .filter((o) => o.name && !o.name.startsWith(".") && o.name !== ".lovkeep" && o.id !== null)
      .slice(0, MAX_CLIENT_FILES);
    const parts: string[] = [];
    let total = 0;
    for (const file of files) {
      if (total >= MAX_CLIENT_CONTEXT_CHARS) break;
      const path = `${folder}/${file.name}`;
      const lowerName = file.name.toLowerCase();
      const size = Number(file.metadata?.size ?? file.metadata?.contentLength ?? 0);
      const mimeType = file.metadata?.mimetype ?? "";
      const isPdf = lowerName.endsWith(".pdf") || mimeType === "application/pdf";
      const { data: blob } = await supabase.storage.from("files").download(path);
      if (!blob) continue;
      let text = "";
      try {
        text = isPdf || blob.type === "application/pdf"
          ? await extractPdfText(blob)
          : await blob.text();
      } catch {
        text = "";
      }
      const slice = text.trim().slice(0, MAX_CLIENT_CONTEXT_CHARS - total);
      if (!slice) continue;
      parts.push(`### File: ${file.name} (chapter: ${selectedChapter})\n${slice}`);
      total += slice.length;
    }
    const context = parts.join("\n\n").slice(0, MAX_CLIENT_CONTEXT_CHARS);
    if (context) contextCache.current.set(key, context);
    return context;
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading || !chapter) return;
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const clientContext = await buildChapterContext(chapter);
      const { data, error } = await supabase.functions.invoke("subject-agent", {
        body: { subject, chapter, language, messages: next, clientContext },
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

  const pickChapter = (c: string) => {
    setChapter(c);
    setMessages([]);
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
              <div className="flex items-center gap-2">
                {chapter && (
                  <>
                    <span className="text-xs px-2 py-1 rounded-lg bg-primary/15 text-primary border border-primary/30">{chapter}</span>
                    <button
                      onClick={() => { setChapter(""); setMessages([]); }}
                      className="text-xs px-2 py-1 rounded-lg border border-border hover:bg-secondary"
                    >
                      {t.changeChapter}
                    </button>
                  </>
                )}
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="relative z-10 flex-1 overflow-y-auto p-4 space-y-3">
              {!chapter && (
                <div className="space-y-4 py-4">
                  <div className="flex gap-3 items-start">
                    <span className="gemini-dot mt-1 inline-block w-5 h-5 rounded-full shrink-0" aria-hidden />
                    <div className="flex-1 text-sm leading-relaxed text-foreground">
                      {chaptersLoading ? "..." : (chapters.length === 0 ? t.noChapters : t.pickChapter)}
                    </div>
                  </div>
                  {chapters.length > 0 && (
                    <div className="flex flex-wrap gap-2 ps-8">
                      {chapters.map((c) => (
                        <button
                          key={c}
                          onClick={() => pickChapter(c)}
                          className="px-3 py-1.5 rounded-xl bg-secondary border border-border text-sm hover:border-primary hover:bg-primary/10 transition"
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}
              {chapter && messages.length === 0 && (
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
                placeholder={chapter ? t.placeholder : t.pickChapter}
                disabled={!chapter}
                rows={1}
                className="flex-1 resize-none rounded-xl bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary max-h-32 disabled:opacity-60"
              />
              <button
                onClick={send}
                disabled={!input.trim() || loading || !chapter}
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