import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Bot, Send, Upload, FileText, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";
import type { AppSubject } from "@/pages/Subjects";
import * as pdfjsLib from "pdfjs-dist";
import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { toast } from "sonner";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;

const MAX_CONTEXT_CHARS = 180_000;

type Msg = { role: "user" | "assistant"; content: string };

const t = {
  ar: {
    title: "المعلم الذكي",
    subtitle: "ارفع ملف الدرس (PDF أو نص) واسأل عنه ما تريد.",
    back: "رجوع",
    upload: "ارفع ملفاً",
    replace: "تغيير الملف",
    remove: "حذف",
    reading: "جاري قراءة الملف...",
    empty: "لم يتم رفع أي ملف بعد.",
    ready: (n: string) => `تم تحميل "${n}". اسأل أي سؤال عن محتواه.`,
    placeholder: "اكتب سؤالك عن الملف...",
    needFile: "ارفع ملفاً أولاً لأتمكن من الإجابة عن أسئلتك.",
    extractFail: "تعذر قراءة الملف. جرب ملفاً آخر.",
    error: "حدث خطأ، حاول مرة أخرى.",
  },
  en: {
    title: "AI Tutor",
    subtitle: "Upload the lesson file (PDF or text) and ask anything about it.",
    back: "Back",
    upload: "Upload file",
    replace: "Change file",
    remove: "Remove",
    reading: "Reading file...",
    empty: "No file uploaded yet.",
    ready: (n: string) => `"${n}" loaded. Ask anything about it.`,
    placeholder: "Ask a question about the file...",
    needFile: "Please upload a file first so I can answer your questions.",
    extractFail: "Couldn't read that file. Try another one.",
    error: "Something went wrong. Try again.",
  },
};

const SUBJECT_NAME: Record<AppSubject, { en: string; ar: string }> = {
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
  english: { en: "English", ar: "الإنجليزية" },
  french: { en: "French", ar: "الفرنسية" },
  arabic: { en: "Arabic", ar: "العربية" },
  islamic: { en: "Islamic Education", ar: "التربية الإسلامية" },
  revision: { en: "Revision", ar: "المراجعة" },
};

async function extractPdf(blob: Blob): Promise<string> {
  const pdf = await pdfjsLib.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) }).promise;
  const chunks: string[] = [];
  let chars = 0;
  try {
    for (let i = 1; i <= pdf.numPages && chars < MAX_CONTEXT_CHARS; i++) {
      const page = await pdf.getPage(i);
      try {
        const c = await page.getTextContent();
        const s = c.items.map((it) => ("str" in it ? it.str : "")).join(" ");
        if (s.trim()) chunks.push(s);
        chars += s.length;
      } finally { page.cleanup(); }
    }
  } finally { await pdf.destroy(); }
  return chunks.join("\n").slice(0, MAX_CONTEXT_CHARS);
}

const SubjectTutor = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isRTL = language === "ar";
  const L = t[language];
  const [subject, setSubject] = useState<AppSubject>(() => {
    try {
      const s = (localStorage.getItem("app_subject_focus_v1") || localStorage.getItem("app_subject_v1")) as AppSubject | null;
      return (s && SUBJECT_NAME[s]) ? s : "physics";
    } catch { return "physics"; }
  });
  const [fileName, setFileName] = useState<string>("");
  const [context, setContext] = useState<string>("");
  const [extracting, setExtracting] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages, loading]);

  const handleFile = async (f: File) => {
    setExtracting(true);
    setMessages([]);
    try {
      let text = "";
      if (f.type === "application/pdf" || f.name.toLowerCase().endsWith(".pdf")) {
        text = await extractPdf(f);
      } else {
        text = (await f.text()).slice(0, MAX_CONTEXT_CHARS);
      }
      if (!text.trim()) {
        toast.error(L.extractFail);
        setContext("");
        setFileName("");
      } else {
        setContext(text);
        setFileName(f.name);
        setMessages([{ role: "assistant", content: L.ready(f.name) }]);
      }
    } catch {
      toast.error(L.extractFail);
    } finally {
      setExtracting(false);
    }
  };

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    if (!context) { toast.error(L.needFile); return; }
    const next: Msg[] = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("subject-agent", {
        body: { subject, chapter: "user_upload", language, messages: next, clientContext: context },
      });
      if (error) throw error;
      const reply = (data as { reply?: string })?.reply ?? "";
      setMessages([...next, { role: "assistant", content: reply || L.error }]);
    } catch {
      setMessages([...next, { role: "assistant", content: L.error }]);
    } finally {
      setLoading(false);
    }
  };

  const sName = SUBJECT_NAME[subject][language];

  return (
    <main dir={isRTL ? "rtl" : "ltr"} className="min-h-screen bg-background pb-28">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          <ArrowLeft className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} />
          {L.back}
        </button>

        <header className="mb-6 flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bot className="w-6 h-6 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
              {L.title}
            </h1>
            <p className="text-sm text-muted-foreground">{sName} — {L.subtitle}</p>
          </div>
        </header>

        <div className="bg-card border border-border rounded-2xl p-4 mb-4">
          {!fileName ? (
            <button
              onClick={() => fileRef.current?.click()}
              disabled={extracting}
              className="w-full py-8 rounded-xl border-2 border-dashed border-border hover:border-primary hover:bg-primary/5 transition flex flex-col items-center justify-center gap-2 text-sm text-muted-foreground disabled:opacity-60"
            >
              {extracting ? (
                <><Loader2 className="w-6 h-6 animate-spin text-primary" /><span>{L.reading}</span></>
              ) : (
                <><Upload className="w-6 h-6 text-primary" /><span className="font-semibold text-foreground">{L.upload}</span><span className="text-xs">PDF, TXT, MD</span></>
              )}
            </button>
          ) : (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <FileText className="w-5 h-5 text-primary" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold truncate">{fileName}</p>
                <p className="text-xs text-muted-foreground">{Math.round(context.length / 1000)}k {isRTL ? "حرف" : "chars"}</p>
              </div>
              <button
                onClick={() => fileRef.current?.click()}
                className="text-xs px-3 py-1.5 rounded-lg border border-border hover:bg-secondary"
              >
                {L.replace}
              </button>
              <button
                onClick={() => { setContext(""); setFileName(""); setMessages([]); }}
                className="p-1.5 text-muted-foreground hover:text-foreground"
                aria-label={L.remove}
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.txt,.md,application/pdf,text/plain"
            className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ""; }}
          />
        </div>

        <div className="bg-card border border-border rounded-2xl overflow-hidden flex flex-col" style={{ minHeight: "50vh" }}>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.length === 0 && (
              <p className="text-sm text-muted-foreground text-center py-8">{L.empty}</p>
            )}
            {messages.map((m, i) => (
              m.role === "user" ? (
                <div key={i} className="flex justify-end">
                  <div className="max-w-[85%] rounded-2xl px-4 py-2.5 text-sm whitespace-pre-wrap leading-relaxed bg-primary text-primary-foreground">
                    {m.content}
                  </div>
                </div>
              ) : (
                <div key={i} className="flex gap-2 items-start">
                  <div className="w-7 h-7 rounded-full bg-primary/15 flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4 text-primary" />
                  </div>
                  <div className="flex-1 text-sm whitespace-pre-wrap leading-relaxed text-foreground">
                    {m.content}
                  </div>
                </div>
              )
            ))}
            {loading && (
              <div className="flex gap-2 items-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>...</span>
              </div>
            )}
            <div ref={endRef} />
          </div>
          <div className="border-t border-border p-3 flex items-end gap-2 bg-secondary/30">
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }}
              placeholder={L.placeholder}
              rows={1}
              disabled={!context}
              className="flex-1 resize-none rounded-xl bg-background border border-border px-3 py-2 text-sm focus:outline-none focus:border-primary max-h-32 disabled:opacity-60"
            />
            <button
              onClick={send}
              disabled={!input.trim() || loading || !context}
              className="h-10 w-10 rounded-xl bg-primary text-primary-foreground flex items-center justify-center disabled:opacity-50 hover:opacity-90 transition"
              aria-label="send"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </main>
  );
};

export default SubjectTutor;
