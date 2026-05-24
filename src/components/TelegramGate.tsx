import { useEffect, useState } from "react";
import { Send, Check, Sparkles, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "tg_channels_joined_v1";

const channels = [
  { handle: "@HD_PHYS", url: "https://t.me/HD_PHYS" },
  { handle: "@a6th_DHS", url: "https://t.me/a6th_DHS" },
  { handle: "@sad6ths", url: "https://t.me/sad6ths" },
];

export const TelegramGate = ({ onUnlock }: { onUnlock: () => void }) => {
  const [loading, setLoading] = useState(true);
  const [deepLink, setDeepLink] = useState<string | null>(null);
  const [missing, setMissing] = useState<string[] | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [userId, setUserId] = useState<string | null>(null);

  // Bootstrap: ask backend for our personal deep link.
  useEffect(() => {
    (async () => {
      try {
        const { data: u } = await supabase.auth.getUser();
        if (!u?.user) return;
        setUserId(u.user.id);
        const { data, error } = await supabase.functions.invoke("telegram-start");
        if (error) throw error;
        setDeepLink((data as { deepLink: string }).deepLink);
        if ((data as { verified: boolean }).verified) {
          localStorage.setItem(STORAGE_KEY, "1");
          onUnlock();
          return;
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to start verification");
      } finally {
        setLoading(false);
      }
    })();
  }, [onUnlock]);

  // Realtime: unlock the moment the webhook flips us to verified.
  useEffect(() => {
    if (!userId) return;
    const ch = supabase
      .channel(`tg-verify-${userId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "telegram_verifications", filter: `user_id=eq.${userId}` },
        (payload) => {
          const row = payload.new as { verified: boolean };
          if (row.verified) {
            localStorage.setItem(STORAGE_KEY, "1");
            onUnlock();
          }
        },
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [userId, onUnlock]);

  const openBot = () => {
    if (deepLink) window.open(deepLink, "_blank", "noopener,noreferrer");
  };

  const recheck = async () => {
    setChecking(true);
    setError(null);
    setMissing(null);
    try {
      const { data, error } = await supabase.functions.invoke("telegram-recheck");
      if (error) throw error;
      const r = data as { ok: boolean; linked: boolean; verified?: boolean; missing?: string[]; error?: string };
      if (!r.linked) {
        setError("Open the bot in Telegram first and send /start.");
      } else if (r.verified) {
        localStorage.setItem(STORAGE_KEY, "1");
        onUnlock();
      } else {
        setMissing(r.missing ?? []);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Re-check failed");
    } finally {
      setChecking(false);
    }
  };

  const signOut = async () => { await supabase.auth.signOut(); };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <div className="relative z-10 w-full max-w-lg rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-8 md:p-10 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-background/40 mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Join to Continue</span>
        </div>

        <h1 className="text-3xl md:text-4xl font-bold gradient-text leading-tight mb-3">
          Join our Telegram channels
        </h1>
        <p className="text-muted-foreground mb-8">
          To unlock the flashcards, please join both channels below. Tap each one, then continue.
        </p>

        <div className="space-y-3 mb-8">
          {channels.map((c) => {
            const joined = visited[c.handle];
            return (
              <button
                key={c.handle}
                onClick={() => handleJoin(c.handle, c.url)}
                className="w-full flex items-center justify-between gap-4 px-5 py-4 rounded-2xl border border-white/10 bg-background/40 hover:border-primary/40 hover:bg-background/60 transition-all duration-300 group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
                    <Send className="w-4 h-4 text-primary" />
                  </div>
                  <div className="text-left">
                    <div className="font-semibold">{c.handle}</div>
                    <div className="text-xs text-muted-foreground">Telegram channel</div>
                  </div>
                </div>
                {joined ? (
                  <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary">
                    <Check className="w-4 h-4" /> Opened
                  </span>
                ) : (
                  <span className="text-xs uppercase tracking-widest text-muted-foreground group-hover:text-foreground transition-colors">
                    Join
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <button
          onClick={handleContinue}
          disabled={!allVisited}
          className="w-full py-4 rounded-2xl font-semibold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.01]"
          style={{ background: "var(--gradient-primary)" }}
        >
          {allVisited ? "Enter the app" : "Join both channels to continue"}
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          By continuing, you confirm you've joined both channels.
        </p>
      </div>
    </main>
  );
};

export { STORAGE_KEY as TELEGRAM_GATE_STORAGE_KEY };