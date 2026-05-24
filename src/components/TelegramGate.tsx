import { useEffect, useState } from "react";
import { Send, Sparkles, Loader2, RefreshCw, ExternalLink } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const STORAGE_KEY = "tg_channels_joined_v1";

const channels = [
  { handle: "@a6th_DHS", url: "https://t.me/a6th_DHS" },
  { handle: "@sad6ths", url: "https://t.me/sad6ths" },
  { handle: "@sadsworld", url: "https://t.me/sadsworld" },
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
          Subscribe to unlock the app
        </h1>
        <p className="text-muted-foreground mb-6">
          Join all three Telegram channels below, then verify with our bot. We check your subscription automatically — no shortcuts.
        </p>

        <div className="space-y-2 mb-6">
          {channels.map((c) => {
            const isMissing = missing?.includes(c.handle);
            return (
              <a
                key={c.handle}
                href={c.url}
                target="_blank"
                rel="noopener noreferrer"
                className={`w-full flex items-center justify-between gap-4 px-4 py-3 rounded-2xl border bg-background/40 transition-all duration-300 ${
                  isMissing ? "border-destructive/60" : "border-white/10 hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-primary/15 flex items-center justify-center">
                    <Send className="w-4 h-4 text-primary" />
                  </div>
                  <div className="font-semibold">{c.handle}</div>
                </div>
                {isMissing ? (
                  <span className="text-xs font-medium text-destructive">Not joined</span>
                ) : (
                  <ExternalLink className="w-4 h-4 text-muted-foreground" />
                )}
              </a>
            );
          })}
        </div>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl border border-destructive/40 bg-destructive/10 text-sm text-destructive">
            {error}
          </div>
        )}

        <button
          onClick={openBot}
          disabled={loading || !deepLink}
          className="w-full py-4 rounded-2xl font-semibold text-primary-foreground disabled:opacity-40 disabled:cursor-not-allowed transition-all duration-300 hover:scale-[1.01] flex items-center justify-center gap-2"
          style={{ background: "var(--gradient-primary)" }}
        >
          {loading ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Preparing…</>
          ) : (
            <><Send className="w-4 h-4" /> Verify with our Telegram bot</>
          )}
        </button>

        <button
          onClick={recheck}
          disabled={checking}
          className="mt-3 w-full py-3 rounded-2xl font-medium border border-white/10 bg-background/40 hover:border-primary/40 transition-all duration-300 flex items-center justify-center gap-2 disabled:opacity-50"
        >
          {checking ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
          I've joined — re-check
        </button>

        <p className="text-center text-xs text-muted-foreground mt-4">
          Tap "Verify", press <span className="font-semibold">Start</span> in Telegram, then come back. The app will unlock automatically once all three subscriptions are confirmed.
        </p>

        <button onClick={signOut} className="mt-6 w-full text-xs text-muted-foreground hover:text-foreground transition-colors">
          Sign out
        </button>
      </div>
    </main>
  );
};

export { STORAGE_KEY as TELEGRAM_GATE_STORAGE_KEY };