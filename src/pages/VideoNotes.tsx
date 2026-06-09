import { useState } from "react";
import { ArrowLeft, Loader2, Youtube, Copy, CheckCircle2, AlertTriangle, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    title: "Video to Notes",
    subtitle: "Paste a YouTube link — we transcribe it and turn it into clean study notes.",
    placeholder: "https://www.youtube.com/watch?v=...",
    generate: "Generate notes",
    working: "Transcribing & writing notes…",
    back: "Back",
    notes: "Notes",
    copy: "Copy",
    copied: "Copied to clipboard",
    invalid: "Please paste a valid YouTube link.",
    failed: "Could not generate notes.",
    retrying: "The AI is busy. Retrying shortly…",
    status: {
      starting: "Starting…",
      retrying: (n: number, max: number) => `AI is busy — retrying (attempt ${n} of ${max})`,
      success: "Notes ready",
      failed: "Generation failed",
    },
  },
  ar: {
    title: "من الفيديو إلى ملاحظات",
    subtitle: "ألصق رابط يوتيوب — نُفرّغه نصياً ونحوّله إلى ملاحظات دراسية مرتبة.",
    placeholder: "https://www.youtube.com/watch?v=...",
    generate: "إنشاء الملاحظات",
    working: "جاري التفريغ وكتابة الملاحظات…",
    back: "رجوع",
    notes: "الملاحظات",
    copy: "نسخ",
    copied: "تم النسخ",
    invalid: "الرجاء لصق رابط يوتيوب صالح.",
    failed: "تعذّر إنشاء الملاحظات.",
    retrying: "الذكاء الاصطناعي مشغول حالياً. سنعيد المحاولة بعد قليل…",
    status: {
      starting: "جارٍ البدء…",
      retrying: (n: number, max: number) => `الذكاء الاصطناعي مشغول — إعادة المحاولة (${n} من ${max})`,
      success: "الملاحظات جاهزة",
      failed: "فشل الإنشاء",
    },
  },
} as const;

const isYouTubeUrl = (u: string) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(u.trim());

const VideoNotes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");
  type Status =
    | { kind: "idle" }
    | { kind: "working"; message: string }
    | { kind: "retrying"; attempt: number; max: number }
    | { kind: "success" }
    | { kind: "failed"; message: string };
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  const run = async () => {
    if (!isYouTubeUrl(url)) {
      toast.error(t.invalid);
      setStatus({ kind: "failed", message: t.invalid });
      return;
    }
    setLoading(true);
    setNotes("");
    setStatus({ kind: "working", message: t.status.starting });
    try {
      const maxAttempts = 4;
      let lastErr: any = null;
      for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        if (attempt === 1) setStatus({ kind: "working", message: t.working });
        const { data, error } = await supabase.functions.invoke("video-notes", {
          body: { url: url.trim(), language },
        });
        if (error) { lastErr = error; }
        else if ((data as any)?.error) {
          lastErr = new Error((data as any).message || (data as any).error);
          if ((data as any).retryable === false) break;
        } else if ((data as any)?.notes) {
          setNotes((data as any).notes);
          setStatus({ kind: "success" });
          lastErr = null;
          break;
        } else {
          lastErr = new Error(t.failed);
        }
        if (attempt < maxAttempts) {
          setStatus({ kind: "retrying", attempt: attempt + 1, max: maxAttempts });
          const retryAfterMs = Number((data as any)?.retryAfter || 0) * 1000;
          const delay = Math.max(retryAfterMs, Math.min(8000, 600 * 2 ** (attempt - 1)) + Math.random() * 250);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
      if (lastErr) throw lastErr;
    } catch (e: any) {
      console.error(e);
      const msg = e?.message || t.failed;
      toast.error(msg);
      setStatus({ kind: "failed", message: msg });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <button
        onClick={onBack}
        aria-label={t.back}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all duration-300"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <header className="text-center max-w-3xl mx-auto z-10 relative animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Youtube className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">YouTube</span>
        </div>
        <h1 className="text-4xl md:text-6xl font-bold gradient-text leading-[1.1] mb-4">{t.title}</h1>
        <p className="text-muted-foreground md:text-lg max-w-xl mx-auto">{t.subtitle}</p>
      </header>

      <section className="max-w-2xl mx-auto mt-10 space-y-4 relative z-10">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder={t.placeholder}
          dir="ltr"
          className="h-12 text-base"
        />
        <Button onClick={run} disabled={loading || !url.trim()} className="w-full h-12 text-base">
          {loading ? (<><Loader2 className="w-4 h-4 animate-spin mr-2" />{t.working}</>) : t.generate}
        </Button>

        {status.kind !== "idle" && (
          <div
            role="status"
            aria-live="polite"
            className={
              "flex items-center gap-3 rounded-2xl border px-4 py-3 text-sm backdrop-blur " +
              (status.kind === "success"
                ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                : status.kind === "failed"
                ? "border-destructive/50 bg-destructive/10 text-destructive-foreground"
                : status.kind === "retrying"
                ? "border-amber-500/40 bg-amber-500/10 text-amber-200"
                : "border-primary/40 bg-secondary/40 text-foreground")
            }
          >
            {status.kind === "working" && <Loader2 className="w-4 h-4 animate-spin shrink-0" />}
            {status.kind === "retrying" && <RefreshCw className="w-4 h-4 animate-spin shrink-0" />}
            {status.kind === "success" && <CheckCircle2 className="w-4 h-4 shrink-0" />}
            {status.kind === "failed" && <AlertTriangle className="w-4 h-4 shrink-0" />}
            <span className="flex-1">
              {status.kind === "working" && status.message}
              {status.kind === "retrying" && t.status.retrying(status.attempt, status.max)}
              {status.kind === "success" && t.status.success}
              {status.kind === "failed" && `${t.status.failed} — ${status.message}`}
            </span>
            {status.kind === "failed" && (
              <Button size="sm" variant="outline" onClick={run} disabled={loading}>
                {language === "ar" ? "إعادة المحاولة" : "Retry"}
              </Button>
            )}
          </div>
        )}
      </section>

      {notes && (
        <section className="max-w-3xl mx-auto mt-10 relative z-10 animate-fade-up">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-2xl font-semibold gradient-text">{t.notes}</h2>
            <Button
              variant="outline"
              size="sm"
              onClick={() => { navigator.clipboard.writeText(notes); toast.success(t.copied); }}
            >
              <Copy className="w-4 h-4 mr-2" />{t.copy}
            </Button>
          </div>
          <article className="rounded-2xl border border-primary/30 bg-secondary/40 backdrop-blur p-6 whitespace-pre-wrap text-foreground leading-relaxed">
            {notes}
          </article>
        </section>
      )}
    </main>
  );
};

export default VideoNotes;