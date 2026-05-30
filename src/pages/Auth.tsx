import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { Sparkles, Mail, Lock, ArrowRight, Shield } from "lucide-react";
import { toast } from "sonner";

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.3 29.3 35.5 24 35.5c-6.4 0-11.5-5.1-11.5-11.5S17.6 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 13.2 4.5 4.5 13.2 4.5 24S13.2 43.5 24 43.5 43.5 34.8 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
    <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12.5 24 12.5c2.9 0 5.6 1.1 7.6 2.9l5.7-5.7C33.6 6.4 29 4.5 24 4.5 16.3 4.5 9.7 8.9 6.3 14.7z"/>
    <path fill="#4CAF50" d="M24 43.5c5 0 9.5-1.9 12.9-5l-6-5.1c-2 1.4-4.4 2.2-6.9 2.2-5.3 0-9.7-3.2-11.3-7.7l-6.5 5C9.5 39 16.2 43.5 24 43.5z"/>
    <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.2-4.4 5.4l6 5.1C40 35.2 43.5 30 43.5 24c0-1.2-.1-2.4-.4-3.5z"/>
  </svg>
);

const AppleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
    <path d="M16.365 1.43c0 1.14-.42 2.2-1.26 3.07-.88.93-1.96 1.47-3.05 1.39-.13-1.13.4-2.27 1.21-3.13.86-.9 2.06-1.46 3.1-1.47.02.05.02.1 0 .14zM20.5 17.27c-.57 1.31-.84 1.9-1.57 3.06-1.02 1.61-2.46 3.62-4.25 3.63-1.59.01-2-1.04-4.16-1.03-2.16.01-2.61 1.05-4.2 1.04-1.79-.01-3.16-1.82-4.18-3.43C-.5 16.95-.83 11.55 1.42 8.68c1.6-2.04 4.12-3.23 6.5-3.23 2.42 0 3.94 1.33 5.94 1.33 1.94 0 3.12-1.33 5.92-1.33 2.11 0 4.35 1.15 5.95 3.14-5.23 2.86-4.38 10.34-5.23 8.68z"/>
  </svg>
);

export const Auth = ({ onAuthed, onGoAdmin }: { onAuthed: () => void; onGoAdmin?: () => void }) => {
  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: window.location.origin },
        });
        if (error) throw error;
        toast.success("Account created");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      }
      onAuthed();
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
    } finally {
      setLoading(false);
    }
  };

  const handleOAuth = async (provider: "google" | "apple") => {
    setLoading(true);
    const startedAt = new Date().toISOString();
    const ctx = {
      provider,
      origin: window.location.origin,
      href: window.location.href,
      ua: navigator.userAgent,
      startedAt,
    };
    console.log("[OAuth] initiate", ctx);
    try {
      const result = await lovable.auth.signInWithOAuth(provider, {
        redirect_uri: window.location.origin,
      });
      console.log("[OAuth] signInWithOAuth result", {
        provider,
        redirected: (result as any)?.redirected,
        hasError: !!result?.error,
        error: result?.error
          ? { message: (result.error as any)?.message, name: (result.error as any)?.name, status: (result.error as any)?.status, code: (result.error as any)?.code }
          : null,
      });
      if (result.error) {
        toast.error(`${provider}: ${result.error.message ?? "Sign-in failed"}`);
        setLoading(false);
        return;
      }
      if (result.redirected) {
        console.log("[OAuth] redirecting away to provider…", { provider });
        return;
      }
      console.log("[OAuth] no redirect, session set inline", { provider });
      onAuthed();
    } catch (err: any) {
      console.error("[OAuth] signInWithOAuth threw", { provider, message: err?.message, err });
      toast.error(`${provider}: ${err?.message ?? "Sign-in failed"}`);
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-8 animate-fade-up">
        <div className="flex items-start justify-between mb-6">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-background/40">
            <Sparkles className="w-3.5 h-3.5 text-primary" />
            <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
              {mode === "signin" ? "Sign in" : "Sign up"}
            </span>
          </div>
          {onGoAdmin && (
            <button
              type="button"
              onClick={onGoAdmin}
              aria-label="Admin access"
              className="w-10 h-10 rounded-full border border-white/10 bg-background/40 flex items-center justify-center text-muted-foreground hover:text-primary hover:border-primary/40 transition-all"
            >
              <Shield className="w-5 h-5" />
            </button>
          )}
        </div>

        <h1 className="text-3xl md:text-4xl font-bold gradient-text leading-tight mb-2">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin" ? "Sign in to continue to your flashcards." : "Start mastering your flashcards in seconds."}
        </p>

        <div className="space-y-3 mb-5">
          <button
            type="button"
            onClick={() => handleOAuth("google")}
            disabled={loading}
            className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-background/60 hover:bg-background/80 hover:border-primary/40 transition-all text-sm font-medium text-foreground disabled:opacity-60"
          >
            <GoogleIcon />
            Continue with Google
          </button>
          <button
            type="button"
            onClick={() => handleOAuth("apple")}
            disabled={loading}
            className="w-full h-11 inline-flex items-center justify-center gap-3 rounded-xl border border-white/10 bg-foreground text-background hover:opacity-90 transition-all text-sm font-medium disabled:opacity-60"
          >
            <AppleIcon />
            Continue with Apple
          </button>
        </div>

        <div className="flex items-center gap-3 my-5">
          <div className="h-px flex-1 bg-white/10" />
          <span className="text-xs uppercase tracking-widest text-muted-foreground">or</span>
          <div className="h-px flex-1 bg-white/10" />
        </div>

        <form onSubmit={handleEmail} className="space-y-3" noValidate>
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm"
            />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full h-11 pl-10 pr-3 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="group w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold disabled:opacity-60"
          >
            {mode === "signin" ? "Sign in" : "Create account"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>

        <p className="text-center text-sm text-muted-foreground mt-5">
          {mode === "signin" ? "New here?" : "Already have an account?"}{" "}
          <button
            type="button"
            className="text-primary hover:underline font-medium"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
          >
            {mode === "signin" ? "Create one" : "Sign in"}
          </button>
        </p>
      </section>
    </main>
  );
};

export default Auth;