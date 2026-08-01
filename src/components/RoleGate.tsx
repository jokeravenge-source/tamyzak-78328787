import { Shield, GraduationCap, ArrowRight, Sparkles, Eye } from "lucide-react";

export type AuthRole = "student" | "admin" | "guest";

export const ROLE_GATE_STORAGE_KEY = "app_auth_role_v1";

const T = {
  ar: {
    tagline: "منصة دراسة السادس العلمي",
    title: "أهلاً بك في تميّزك",
    sub: "ابدأ الدراسة خلال ثانية واحدة.",
    student: "ابدأ الدراسة",
    studentSub: "سجّل دخولك أو أنشئ حساباً مجانياً",
    guest: "تصفّح كزائر بدون حساب",
    admin: "دخول المشرفين",
  },
  en: {
    tagline: "Sixth-grade science study platform",
    title: "Welcome to Tamayzak",
    sub: "Start studying in one tap.",
    student: "Start studying",
    studentSub: "Sign in or create a free account",
    guest: "Browse as a guest, no account",
    admin: "Admin sign in",
  },
} as const;

export const RoleGate = ({ onSelect }: { onSelect: (role: AuthRole) => void }) => {
  let lang: "ar" | "en" = "ar";
  try {
    lang = localStorage.getItem("app_language_v1") === "en" ? "en" : "ar";
  } catch { /* ignore */ }
  const t = T[lang];
  const isRTL = lang === "ar";
  const choose = (r: AuthRole) => {
    localStorage.setItem(ROLE_GATE_STORAGE_KEY, r);
    onSelect(r);
  };
  return (
    <main className="min-h-screen flex items-center justify-center px-5 py-12 bg-background" dir={isRTL ? "rtl" : "ltr"}>
      <section className="relative z-10 w-full max-w-sm animate-fade-up text-center">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-primary-foreground" />
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <p className="text-sm font-bold text-primary leading-none" style={{ fontFamily: "'Outfit', sans-serif" }}>tamayzak</p>
            <p className="text-[10px] text-muted-foreground mt-1">{t.tagline}</p>
          </div>
        </div>

        <h1 className="text-3xl font-bold text-foreground mb-2 tracking-tight">{t.title}</h1>
        <p className="text-muted-foreground mb-8 text-sm">{t.sub}</p>

        <button
          onClick={() => choose("student")}
          className="group w-full h-14 rounded-2xl bg-primary text-primary-foreground font-bold text-base inline-flex items-center justify-center gap-2 shadow-[var(--shadow-glow)] hover:opacity-95 active:scale-[0.99] transition-all"
        >
          <GraduationCap className="w-5 h-5" />
          {t.student}
          <ArrowRight className={`w-4 h-4 transition-transform group-hover:translate-x-1 ${isRTL ? "rotate-180 group-hover:-translate-x-1" : ""}`} />
        </button>
        <p className="mt-2 text-xs text-muted-foreground">{t.studentSub}</p>

        <button
          onClick={() => choose("guest")}
          className="mt-6 w-full h-11 rounded-xl border border-border bg-card text-sm font-semibold text-foreground/80 inline-flex items-center justify-center gap-2 hover:bg-secondary transition-colors"
        >
          <Eye className="w-4 h-4" />
          {t.guest}
        </button>

        <button
          onClick={() => choose("admin")}
          className="mt-8 inline-flex items-center gap-1.5 text-xs text-muted-foreground/70 hover:text-foreground transition-colors"
        >
          <Shield className="w-3.5 h-3.5" />
          {t.admin}
        </button>
      </section>
    </main>
  );
};

export default RoleGate;