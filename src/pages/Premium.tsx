import { useEffect } from "react";
import { ArrowLeft, Check, Crown, Loader2, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { usePaddleCheckout } from "@/hooks/usePaddleCheckout";
import { useSubscription } from "@/hooks/useSubscription";
import { PremiumBadge } from "@/components/PremiumBadge";
import type { AppLanguage } from "@/components/LanguageGate";

const copy = {
  en: {
    back: "Back",
    badge: "Premium",
    title: "Unlock Premium",
    subtitle: "Unlimited AI everywhere, plus exclusive looks for your character.",
    price: "$2",
    per: "/ month",
    cta: "Upgrade now",
    loading: "Opening checkout…",
    active: "You're a Premium member",
    activeDesc: "Enjoy unlimited AI and your premium perks.",
    features: [
      "Unlimited Al-Musahhih, MCQ Generator & Video to Notes",
      "Animated Premium badge next to your name",
      "Exclusive character styles & royal crown accessory",
      "Cancel anytime",
    ],
  },
  ar: {
    back: "رجوع",
    badge: "بريميوم",
    title: "افتح ميزات البريميوم",
    subtitle: "استخدام غير محدود للذكاء الاصطناعي وأزياء حصرية لشخصيتك.",
    price: "٢$",
    per: "/ شهرياً",
    cta: "ترقية الآن",
    loading: "جاري فتح الدفع…",
    active: "أنت عضو بريميوم",
    activeDesc: "استمتع بذكاء اصطناعي غير محدود ومميزاتك البريميوم.",
    features: [
      "استخدام غير محدود لمدرّب المقالات ومولد الأسئلة وملاحظات الفيديو",
      "شارة بريميوم متحركة بجانب اسمك",
      "أزياء حصرية للشخصية وتاج ملكي",
      "إلغاء في أي وقت",
    ],
  },
} as const;

export default function Premium({ language, onBack }: { language: AppLanguage; onBack: () => void }) {
  const t = copy[language];
  const { openCheckout, loading } = usePaddleCheckout();
  const { isPremium, loading: subLoading } = useSubscription();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get("premium") === "success") {
      toast.success(language === "ar" ? "🎉 مرحباً بك في البريميوم!" : "🎉 Welcome to Premium!");
      const url = new URL(window.location.href);
      url.searchParams.delete("premium");
      window.history.replaceState({}, "", url.toString());
    }
  }, [language]);

  const buy = async () => {
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        toast.error(language === "ar" ? "سجّل دخولك أولاً" : "Please sign in first");
        return;
      }
      await openCheckout({
        priceId: "premium_monthly",
        customerEmail: u.user.email ?? undefined,
        customData: { userId: u.user.id },
        successUrl: `${window.location.origin}/?premium=success`,
      });
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open checkout");
    }
  };

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-amber-500/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-yellow-300/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <button
        onClick={onBack}
        aria-label={t.back}
        className="absolute top-6 left-6 z-20 w-11 h-11 rounded-full border border-white/10 bg-secondary/60 backdrop-blur flex items-center justify-center text-muted-foreground hover:text-foreground transition"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="relative z-10 max-w-lg mx-auto"
      >
        <div className="text-center mb-8">
          <div className="inline-flex mb-4"><PremiumBadge size="lg" label={t.badge} /></div>
          <h1 className="text-4xl md:text-5xl font-bold gradient-text mb-3">{t.title}</h1>
          <p className="text-muted-foreground">{t.subtitle}</p>
        </div>

        <motion.div
          whileHover={{ y: -4 }}
          className="relative rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-secondary/60 to-yellow-300/10 backdrop-blur-xl p-8 overflow-hidden shadow-[0_20px_60px_-20px_rgba(251,191,36,0.4)]"
        >
          <div className="absolute top-4 right-4 opacity-20">
            <Crown className="w-24 h-24 text-amber-400" />
          </div>

          <div className="relative flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-bold text-foreground">{t.price}</span>
            <span className="text-muted-foreground">{t.per}</span>
          </div>

          <ul className="relative space-y-3 mb-8">
            {t.features.map((f, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + i * 0.07 }}
                className="flex items-start gap-3 text-sm"
              >
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-amber-500" strokeWidth={3} />
                </div>
                <span className="text-foreground/90">{f}</span>
              </motion.li>
            ))}
          </ul>

          {subLoading ? (
            <div className="h-12 rounded-xl bg-background/40 animate-pulse" />
          ) : isPremium ? (
            <div className="relative rounded-2xl border border-amber-400/40 bg-amber-500/10 p-4 text-center">
              <div className="inline-flex mb-2"><PremiumBadge size="md" /></div>
              <p className="font-semibold text-foreground">{t.active}</p>
              <p className="text-xs text-muted-foreground mt-1">{t.activeDesc}</p>
            </div>
          ) : (
            <button
              onClick={buy}
              disabled={loading}
              className="relative w-full h-12 rounded-xl font-bold text-white inline-flex items-center justify-center gap-2 transition disabled:opacity-60"
              style={{
                background: "linear-gradient(110deg, #f59e0b, #fbbf24, #f59e0b)",
                boxShadow: "0 10px 30px -10px rgba(251, 191, 36, 0.6)",
              }}
            >
              {loading ? <><Loader2 className="w-4 h-4 animate-spin" />{t.loading}</> : <><Sparkles className="w-4 h-4" />{t.cta}</>}
            </button>
          )}
        </motion.div>
      </motion.section>
    </main>
  );
}