import { useEffect, useRef, useState } from "react";
import { ShieldCheck } from "lucide-react";
import { type AppLanguage } from "@/components/LanguageGate";
import { supabase } from "@/integrations/supabase/client";
import { RECAPTCHA_SITE_KEY, isCaptchaConfigured } from "@/config/captcha";

export const CAPTCHA_GATE_STORAGE_KEY = "app_captcha_gate_v1";

/** True when the visitor already passed the human check this session (or it is disabled). */
export const isCaptchaPassed = () => {
  if (typeof window === "undefined") return true;
  if (!isCaptchaConfigured()) return true;
  try {
    return sessionStorage.getItem(CAPTCHA_GATE_STORAGE_KEY) === "1";
  } catch {
    return true;
  }
};

const copy = {
  en: {
    badge: "Security check",
    title: "Confirm you're human",
    desc: "Complete the check below to continue to the app.",
    error: "Verification failed — please try again.",
    verifying: "Verifying…",
  },
  ar: {
    badge: "تحقّق أمني",
    title: "أكّد أنك لست روبوتاً",
    desc: "أكمل التحقق أدناه للمتابعة إلى التطبيق.",
    error: "فشل التحقق — يرجى المحاولة مرة أخرى.",
    verifying: "جارٍ التحقق…",
  },
} as const;

const SCRIPT_ID = "recaptcha-v2-script";

const loadRecaptcha = () =>
  new Promise<void>((resolve, reject) => {
    const w = window as any;
    if (w.grecaptcha?.render) return resolve();
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://www.google.com/recaptcha/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    const started = Date.now();
    const tick = () => {
      if ((window as any).grecaptcha?.render) return resolve();
      if (Date.now() - started > 15000) return reject(new Error("recaptcha-timeout"));
      window.setTimeout(tick, 150);
    };
    tick();
  });

const CaptchaGate = ({ language = "ar", onPassed }: { language?: AppLanguage; onPassed: () => void }) => {
  const t = copy[language] ?? copy.ar;
  const boxRef = useRef<HTMLDivElement>(null);
  const rendered = useRef(false);
  const [error, setError] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;

    const verify = async (token: string) => {
      setBusy(true);
      setError(false);
      try {
        const { data, error: fnError } = await supabase.functions.invoke("verify-captcha", {
          body: { token },
        });
        if (fnError || !data?.success) throw fnError ?? new Error("failed");
        try {
          sessionStorage.setItem(CAPTCHA_GATE_STORAGE_KEY, "1");
        } catch { /* ignore */ }
        onPassed();
      } catch {
        setError(true);
        try { (window as any).grecaptcha?.reset(); } catch { /* ignore */ }
      } finally {
        setBusy(false);
      }
    };

    loadRecaptcha()
      .then(() => {
        if (cancelled || rendered.current || !boxRef.current) return;
        rendered.current = true;
        (window as any).grecaptcha.render(boxRef.current, {
          sitekey: RECAPTCHA_SITE_KEY,
          theme: "dark",
          callback: verify,
          "expired-callback": () => setError(true),
        });
      })
      .catch(() => setError(true));

    return () => { cancelled = true; };
  }, [onPassed]);

  return (
    <main
      className="min-h-screen flex items-center justify-center px-4 py-12 relative overflow-hidden"
      dir={language === "ar" ? "rtl" : "ltr"}
    >
      <div className="pointer-events-none absolute -top-40 -left-40 w-[26rem] h-[26rem] rounded-full bg-primary/20 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[26rem] h-[26rem] rounded-full bg-accent/20 blur-3xl" />

      <section className="relative z-10 w-full max-w-md rounded-3xl border border-primary/30 bg-secondary/40 backdrop-blur p-8 text-center shadow-lg">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/60 mb-6">
          <ShieldCheck className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.25em] text-muted-foreground">{t.badge}</span>
        </div>
        <h1 className="text-2xl font-bold mb-2">{t.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{t.desc}</p>

        <div className="flex justify-center min-h-[78px]">
          <div ref={boxRef} />
        </div>

        {busy && <p className="mt-4 text-sm text-muted-foreground">{t.verifying}</p>}
        {error && !busy && <p className="mt-4 text-sm text-destructive">{t.error}</p>}
      </section>
    </main>
  );
};

export default CaptchaGate;
