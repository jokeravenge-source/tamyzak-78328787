import { useState } from "react";
import { Shield, Mail, Lock, ArrowRight, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const ADMIN_EMAIL = "majs11@gmail.com";
const ADMIN_PASSWORD = "majs11";

export const AdminLogin = ({ onAuthed, onBack }: { onAuthed: () => void; onBack: () => void }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (email.trim().toLowerCase() !== ADMIN_EMAIL || password !== ADMIN_PASSWORD) {
      toast.error("Invalid admin credentials");
      return;
    }
    setLoading(true);
    try {
      // Try sign in; if no account exists, sign up (trigger grants admin role)
      let { error } = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
      if (error) {
        const { error: signUpErr } = await supabase.auth.signUp({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          options: { emailRedirectTo: window.location.origin },
        });
        if (signUpErr) throw signUpErr;
        const retry = await supabase.auth.signInWithPassword({ email: ADMIN_EMAIL, password: ADMIN_PASSWORD });
        if (retry.error) throw retry.error;
      }
      toast.success("Welcome, admin");
      onAuthed();
    } catch (err: any) {
      toast.error(err?.message ?? "Admin sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      <button
        onClick={onBack}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-primary/40 transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
      <section className="relative z-10 w-full max-w-md rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-8 animate-fade-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-background/40 mb-6">
          <Shield className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Admin access</span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold gradient-text mb-2">Admin sign-in</h1>
        <p className="text-sm text-muted-foreground mb-6">Enter admin credentials to manage summaries.</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="relative">
            <Mail className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="admin email" className="w-full h-11 pl-10 pr-3 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm" />
          </div>
          <div className="relative">
            <Lock className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="password" className="w-full h-11 pl-10 pr-3 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm" />
          </div>
          <button type="submit" disabled={loading} className="group w-full h-11 inline-flex items-center justify-center gap-2 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 transition-all text-sm font-semibold disabled:opacity-60">
            {loading ? "Signing in…" : "Enter dashboard"}
            <ArrowRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
          </button>
        </form>
      </section>
    </main>
  );
};

export default AdminLogin;