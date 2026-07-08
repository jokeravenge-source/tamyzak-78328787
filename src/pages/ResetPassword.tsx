import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound, Loader2 } from "lucide-react";

// Public route that handles the password-recovery link sent by an admin.
// Supabase appends the recovery tokens to the URL hash and fires a
// PASSWORD_RECOVERY auth event; we let the user pick a new password here.
const ResetPassword = () => {
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [saving, setSaving] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    // Surface obvious errors from the redirect URL.
    const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : window.location.hash;
    const params = new URLSearchParams(hash);
    const err = params.get("error_description") || params.get("error");
    if (err) setError(err);
    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 8) return toast.error("Password must be at least 8 characters.");
    if (password !== confirm) return toast.error("Passwords do not match.");
    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSaving(false);
    if (error) return toast.error(error.message);
    setDone(true);
    toast.success("Password updated. You can now sign in.");
    setTimeout(async () => {
      await supabase.auth.signOut();
      window.location.replace("/");
    }, 1500);
  };

  return (
    <main className="min-h-screen flex items-center justify-center px-4 bg-background">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-secondary/40 backdrop-blur p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
            <KeyRound className="w-5 h-5 text-primary" />
          </div>
          <h1 className="text-xl font-semibold">Reset your password</h1>
        </div>
        {error ? (
          <div className="text-sm text-red-400 mb-4">{error}</div>
        ) : null}
        {done ? (
          <p className="text-sm text-muted-foreground">Password updated. Redirecting…</p>
        ) : !ready ? (
          <p className="text-sm text-muted-foreground">Verifying your reset link…</p>
        ) : (
          <form onSubmit={submit} className="grid gap-3">
            <label className="text-sm">
              <span className="block mb-1 text-muted-foreground">New password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={8}
                required
                className="w-full h-10 px-3 rounded-lg bg-background border border-white/10"
              />
            </label>
            <label className="text-sm">
              <span className="block mb-1 text-muted-foreground">Confirm new password</span>
              <input
                type="password"
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                minLength={8}
                required
                className="w-full h-10 px-3 rounded-lg bg-background border border-white/10"
              />
            </label>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 h-10 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              Update password
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default ResetPassword;