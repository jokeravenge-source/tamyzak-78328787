import { useState } from "react";
import { ArrowLeft, Loader2, Youtube, Copy } from "lucide-react";
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
  },
} as const;

const isYouTubeUrl = (u: string) => /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\//i.test(u.trim());

const VideoNotes = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const t = copy[language];
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [notes, setNotes] = useState("");

  const run = async () => {
    if (!isYouTubeUrl(url)) {
      toast.error(t.invalid);
      return;
    }
    setLoading(true);
    setNotes("");
    try {
      const { data, error } = await supabase.functions.invoke("video-notes", {
        body: { url: url.trim(), language },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setNotes((data as any).notes || "");
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || t.failed);
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