import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2, Send, RefreshCw, CheckCircle2 } from "lucide-react";
import type { AppLanguage } from "./LanguageGate";

const T = {
  en: {
    title: "Connect Telegram",
    desc: "To make sure you receive important notifications, please connect your Telegram account before continuing.",
    open: "Open Telegram bot",
    check: "I've started the bot",
    checking: "Checking…",
    notLinked: "We can't see your Telegram yet. Open the bot, press Start, then try again.",
    signOut: "Sign out",
    step1: "1. Tap “Open Telegram bot” below.",
    step2: "2. Press Start in the chat with the bot.",
    step3: "3. Come back here and tap “I've started the bot”.",
  },
  ar: {
    title: "اربط حسابك بتلغرام",
    desc: "حتى تصلك الإشعارات المهمة، يرجى ربط حسابك بتلغرام قبل المتابعة.",
    open: "افتح بوت تلغرام",
    check: "لقد بدأت البوت",
    checking: "جاري التحقق…",
    notLinked: "لم نتمكن من رؤية حسابك بعد. افتح البوت واضغط Start ثم حاول مرة أخرى.",
    signOut: "تسجيل الخروج",
    step1: "١. اضغط على «افتح بوت تلغرام» بالأسفل.",
    step2: "٢. اضغط Start داخل محادثة البوت.",
    step3: "٣. ارجع هنا واضغط «لقد بدأت البوت».",
  },
} as const;

type Props = {
  language: AppLanguage;
  onVerified: () => void;
};

export default function TelegramGate({ language, onVerified }: Props) {
  const t = T[language] ?? T.en;
  const rtl = language === "ar";
  const [link, setLink] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("telegram-start");
        if (error) throw error;
        if (data?.verified) {
          onVerified();
          return;
        }
        setLink(data?.deepLink ?? null);
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    })();
  }, [onVerified]);

  const recheck = async () => {
    setChecking(true);
    setError(null);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-recheck");
      if (error) throw error;
      if (data?.linked && data?.verified) {
        onVerified();
      } else {
        setError(t.notLinked);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setChecking(false);
    }
  };

  return (
    <main
      dir={rtl ? "rtl" : "ltr"}
      className="min-h-screen flex items-center justify-center p-4 bg-background"
    >
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-6 shadow-xl">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-primary/15 text-primary flex items-center justify-center">
            <Send className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold">{t.title}</h1>
            <p className="text-xs text-muted-foreground mt-1">{t.desc}</p>
          </div>
        </div>

        <ol className="text-sm text-muted-foreground space-y-1 mb-5">
          <li>{t.step1}</li>
          <li>{t.step2}</li>
          <li>{t.step3}</li>
        </ol>

        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-6 h-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <a
              href={link ?? "#"}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground font-medium flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Send className="w-4 h-4" />
              {t.open}
            </a>
            <button
              onClick={recheck}
              disabled={checking}
              className="w-full h-11 rounded-xl border border-white/10 bg-background font-medium flex items-center justify-center gap-2 hover:border-primary/40 transition disabled:opacity-60"
            >
              {checking ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {t.checking}
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  {t.check}
                </>
              )}
            </button>
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.reload();
              }}
              className="w-full h-9 text-xs text-muted-foreground hover:text-foreground inline-flex items-center justify-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              {t.signOut}
            </button>
          </div>
        )}

        {error && (
          <p className="mt-4 text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-lg p-3">
            {error}
          </p>
        )}
      </div>
    </main>
  );
}