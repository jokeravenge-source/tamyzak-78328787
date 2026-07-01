import { Check, Crown, Sparkles } from "lucide-react";
import { PublicFooter } from "./PublicLayout";

export default function Pricing() {
  const freeFeatures = [
    "Bilingual flashcards (Arabic/English)",
    "Malazam ministerial bank",
    "Study streaks, points & leaderboard",
    "Study sessions with hourly check-ins",
    "Telegram to-do reminders",
    "1 free use per day of every AI tool — resets at midnight Baghdad time (UTC+3)",
  ];
  const premiumFeatures = [
    "Everything in Free",
    "Unlimited Al-Musahhih (AI essay grader)",
    "Unlimited MCQ Generator",
    "Unlimited Video to Notes with flashcards & quizzes",
    "Text-to-Video explainer with narration",
    "Live MCQ Battles from your own files",
    "Animated Premium badge & exclusive character styles",
    "Cancel anytime — 30-day money-back guarantee",
  ];

  return (
    <main className="min-h-screen bg-background text-foreground">
      <header className="border-b border-white/10 bg-secondary/40 backdrop-blur">
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <a href="/" className="font-bold text-lg gradient-text">Tamayzak</a>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <a href="/" className="hover:text-foreground">Sign in</a>
          </nav>
        </div>
      </header>

      <section className="max-w-5xl mx-auto px-6 py-16 text-center">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-white/10 bg-secondary/40 backdrop-blur mb-6">
          <Sparkles className="w-3.5 h-3.5 text-primary" />
          <span className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Pricing</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold gradient-text mb-4">Simple pricing for serious study</h1>
        <p className="text-muted-foreground text-lg max-w-2xl mx-auto">Start free. Upgrade to Premium for 7.99 dinar/month to unlock unlimited AI tools built for the Iraqi sixth-grade scientific stream.</p>
      </section>

      <section className="max-w-5xl mx-auto px-6 pb-20 grid md:grid-cols-2 gap-6">
        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-8">
          <div className="text-sm uppercase tracking-widest text-muted-foreground mb-2">Free</div>
          <div className="flex items-baseline gap-2 mb-6">
            <span className="text-5xl font-bold">$0</span>
            <span className="text-muted-foreground">/ forever</span>
          </div>
          <ul className="space-y-3 mb-8">
            {freeFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <Check className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a href="/" className="block w-full h-12 rounded-xl border border-white/10 bg-background/60 hover:bg-background/80 transition text-center leading-[3rem] font-semibold">Create free account</a>
        </div>

        <div className="relative rounded-3xl border border-amber-400/40 bg-gradient-to-br from-amber-500/10 via-secondary/60 to-yellow-300/10 backdrop-blur-xl p-8 overflow-hidden shadow-[0_20px_60px_-20px_rgba(251,191,36,0.4)]">
          <div className="absolute top-4 right-4 opacity-20"><Crown className="w-24 h-24 text-amber-400" /></div>
          <div className="text-sm uppercase tracking-widest text-amber-400 mb-2">Premium</div>
          <div className="flex items-baseline gap-2 mb-1">
            <span className="text-5xl font-bold">7.99 dinar</span>
            <span className="text-muted-foreground">/ month</span>
          </div>
          <p className="text-xs text-muted-foreground mb-6">Activated manually via Telegram. Cancel anytime.</p>
          <ul className="space-y-3 mb-8">
            {premiumFeatures.map((f) => (
              <li key={f} className="flex items-start gap-3 text-sm">
                <div className="w-5 h-5 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0 mt-0.5">
                  <Check className="w-3 h-3 text-amber-500" strokeWidth={3} />
                </div>
                <span>{f}</span>
              </li>
            ))}
          </ul>
          <a href="https://t.me/ias404" target="_blank" rel="noopener noreferrer" className="block w-full h-12 rounded-xl font-bold text-white text-center leading-[3rem]" style={{ background: "linear-gradient(110deg,#f59e0b,#fbbf24,#f59e0b)", boxShadow: "0 10px 30px -10px rgba(251,191,36,0.6)" }}>Message @ias404 on Telegram</a>
        </div>
      </section>

      <section className="max-w-3xl mx-auto px-6 pb-16 text-sm text-muted-foreground text-center space-y-3">
        <p>Premium is activated manually. Message <a href="https://t.me/ias404" target="_blank" rel="noopener noreferrer" className="underline"><strong>@ias404</strong></a> on Telegram after signing up and your account will be upgraded.</p>
      </section>

      <PublicFooter />
    </main>
  );
}