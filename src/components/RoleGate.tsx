import { Shield, GraduationCap, ArrowRight, Sparkles, Eye } from "lucide-react";

export type AuthRole = "student" | "admin" | "guest";

export const ROLE_GATE_STORAGE_KEY = "app_auth_role_v1";

export const RoleGate = ({ onSelect }: { onSelect: (role: AuthRole) => void }) => {
  const choose = (r: AuthRole) => {
    localStorage.setItem(ROLE_GATE_STORAGE_KEY, r);
    onSelect(r);
  };
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-background">
      <section className="relative z-10 w-full max-w-3xl animate-fade-up">
        <div className="flex items-center justify-center gap-2 mb-6">
          <div className="w-9 h-9 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-4 h-4 text-primary-foreground" />
          </div>
          <span className="text-sm font-bold text-primary uppercase tracking-wider" style={{ fontFamily: "'Outfit', sans-serif" }}>
            tamayzak
          </span>
        </div>
        <h1 className="text-3xl md:text-4xl font-bold text-foreground text-center mb-3 tracking-tight" style={{ fontFamily: "'Outfit', sans-serif" }}>
          Who are you?
        </h1>
        <p className="text-center text-muted-foreground mb-10">Choose how you want to continue.</p>
        <div className="grid sm:grid-cols-3 gap-5">
          <button
            onClick={() => choose("student")}
            className="group rounded-2xl p-7 border border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <GraduationCap className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1 text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Student</h3>
            <p className="text-sm text-muted-foreground mb-5">Sign in or create an account to study.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold">
              Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          <button
            onClick={() => choose("admin")}
            className="group rounded-2xl p-7 border border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-secondary flex items-center justify-center mb-5 group-hover:bg-foreground transition-colors">
              <Shield className="w-6 h-6 text-muted-foreground group-hover:text-background" />
            </div>
            <h3 className="text-xl font-bold mb-1 text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Admin</h3>
            <p className="text-sm text-muted-foreground mb-5">Manage and approve uploaded summaries.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold opacity-0 group-hover:opacity-100 transition-opacity">
              Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
          <button
            onClick={() => choose("guest")}
            className="group rounded-2xl p-7 border border-border bg-card hover:border-primary/40 hover:shadow-[var(--shadow-card)] transition-all duration-300 text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-5 group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
              <Eye className="w-6 h-6 text-primary group-hover:text-primary-foreground" />
            </div>
            <h3 className="text-xl font-bold mb-1 text-foreground" style={{ fontFamily: "'Outfit', sans-serif" }}>Guest</h3>
            <p className="text-sm text-muted-foreground mb-5">Browse our teachers without an account.</p>
            <span className="inline-flex items-center gap-1 text-primary text-sm font-semibold">
              Continue <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </span>
          </button>
        </div>
      </section>
    </main>
  );
};

export default RoleGate;