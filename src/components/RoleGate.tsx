import { Shield, GraduationCap, ArrowRight } from "lucide-react";

export type AuthRole = "student" | "admin";

export const ROLE_GATE_STORAGE_KEY = "app_auth_role_v1";

export const RoleGate = ({ onSelect }: { onSelect: (role: AuthRole) => void }) => {
  const choose = (r: AuthRole) => {
    localStorage.setItem(ROLE_GATE_STORAGE_KEY, r);
    onSelect(r);
  };
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />
      <section className="relative z-10 w-full max-w-2xl animate-fade-up">
        <h1 className="text-4xl md:text-5xl font-bold gradient-text text-center mb-3">Who are you?</h1>
        <p className="text-center text-muted-foreground mb-10">Choose how you want to continue.</p>
        <div className="grid sm:grid-cols-2 gap-5">
          <button
            onClick={() => choose("student")}
            className="group rounded-3xl p-7 border border-primary/40 bg-secondary/40 backdrop-blur hover:-translate-y-2 hover:border-primary transition-all duration-500 text-left shadow-lg hover:shadow-[var(--shadow-glow)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
              <GraduationCap className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-1">Student</h3>
            <p className="text-sm text-muted-foreground mb-3">Sign in or create an account to study.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm">Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </button>
          <button
            onClick={() => choose("admin")}
            className="group rounded-3xl p-7 border border-primary/40 bg-secondary/40 backdrop-blur hover:-translate-y-2 hover:border-primary transition-all duration-500 text-left shadow-lg hover:shadow-[var(--shadow-glow)]"
          >
            <div className="w-12 h-12 rounded-2xl bg-primary/15 flex items-center justify-center mb-5">
              <Shield className="w-6 h-6 text-primary" />
            </div>
            <h3 className="text-2xl font-semibold mb-1">Admin</h3>
            <p className="text-sm text-muted-foreground mb-3">Manage and approve uploaded summaries.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm">Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" /></span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default RoleGate;