import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Send, Loader2, CheckCircle2, RefreshCw, Unlink } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";

const T = {
  en: {
    title: "Telegram",
    desc: "Link Telegram to receive task and exam reminders.",
    linked: "Linked",
    notLinked: "Not linked",
    link: "Link Telegram",
    relink: "Re-link Telegram",
    disconnect: "Disconnect",
    open: "Open the bot & press Start",
    check: "I've started the bot",
    checking: "Checking…",
    stillNot: "We can't see your Telegram yet. Open the bot, press Start, then try again.",
    done: "Telegram linked successfully",
    removed: "Telegram disconnected",
  },
  ar: {
    title: "تيليجرام",
    desc: "اربط تيليجرام لتصلك تذكيرات المهام والامتحانات.",
    linked: "مرتبط",
    notLinked: "غير مرتبط",
    link: "ربط تيليجرام",
    relink: "إعادة ربط تيليجرام",
    disconnect: "فصل الربط",
    open: "افتح البوت واضغط Start",
    check: "لقد بدأت البوت",
    checking: "جاري التحقق…",
    stillNot: "لم نتمكن من رؤية حسابك بعد. افتح البوت واضغط Start ثم حاول مرة أخرى.",
    done: "تم ربط تيليجرام بنجاح",
    removed: "تم فصل تيليجرام",
  },
} as const;

export function TelegramLinkCard({ language }: { language: AppLanguage }) {
  const t = T[language] ?? T.en;
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [verified, setVerified] = useState(false);
  const [username, setUsername] = useState<string | null>(null);
  const [link, setLink] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const load = async () => {
    try {
      const { data, error } = await supabase.functions.invoke("telegram-start");
      if (error) throw error;
      setVerified(!!data?.verified);
      setUsername(data?.telegramUsername ?? null);
      setLink(data?.deepLink ?? null);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const act = async (action: "relink" | "disconnect") => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-start", { body: { action } });
      if (error) throw error;
      setVerified(false);
      setUsername(null);
      setLink(data?.deepLink ?? null);
      if (action === "disconnect") {
        setPending(false);
        toast.success(t.removed);
        await load();
      } else {
        setPending(true);
        if (data?.deepLink) window.open(data.deepLink, "_blank", "noopener,noreferrer");
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  const recheck = async () => {
    setBusy(true);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-recheck");
      if (error) throw error;
      if (data?.linked) {
        setPending(false);
        toast.success(t.done);
        await load();
      } else {
        toast.error(t.stillNot);
      }
    } catch (e: any) {
      toast.error(e?.message ?? "Failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6 space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
          <Send className="w-5 h-5 text-primary" />
        </div>
        <div className="min-w-0">
          <h2 className="text-lg font-semibold">{t.title}</h2>
          <p className="text-sm text-muted-foreground">{t.desc}</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
      ) : (
        <>
          <div className="rounded-xl border border-white/10 bg-background/40 p-3 flex items-center justify-between gap-3">
            <span className={`text-xs font-semibold ${verified ? "text-emerald-400" : "text-muted-foreground"}`}>
              {verified ? t.linked : t.notLinked}
            </span>
            {verified && username && <span className="text-xs text-muted-foreground truncate">@{username}</span>}
          </div>

          {pending && link && (
            <a
              href={link}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full h-11 rounded-xl bg-primary text-primary-foreground text-sm font-semibold flex items-center justify-center gap-2 hover:opacity-90 transition"
            >
              <Send className="w-4 h-4" />
              {t.open}
            </a>
          )}

          <div className="flex flex-col gap-2">
            {pending && (
              <button
                onClick={recheck}
                disabled={busy}
                className="w-full h-11 rounded-xl border border-white/10 bg-background/40 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:border-primary/40 transition disabled:opacity-60"
              >
                {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                {busy ? t.checking : t.check}
              </button>
            )}
            <button
              onClick={() => act("relink")}
              disabled={busy}
              className="w-full h-11 rounded-xl border border-white/10 bg-background/40 text-sm font-semibold inline-flex items-center justify-center gap-2 hover:border-primary/40 transition disabled:opacity-60"
            >
              <RefreshCw className="w-4 h-4 text-primary" />
              {verified ? t.relink : t.link}
            </button>
            {verified && (
              <button
                onClick={() => act("disconnect")}
                disabled={busy}
                className="w-full h-10 rounded-xl border border-destructive/40 text-destructive text-xs font-semibold inline-flex items-center justify-center gap-2 hover:bg-destructive/10 transition disabled:opacity-60"
              >
                <Unlink className="w-3.5 h-3.5" />
                {t.disconnect}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
