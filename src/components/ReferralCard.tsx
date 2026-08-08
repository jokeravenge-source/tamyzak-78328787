import { useEffect, useState } from "react";
import { Gift, Copy, Check, Share2 } from "lucide-react";
import { toast } from "sonner";
import { getMyReferralCode, getMyReferralStats, referralLink } from "@/lib/referral";

const t = {
  en: {
    title: "Invite friends",
    desc: "Share your invite link. When a friend signs up, you both get 30 points.",
    copy: "Copy link",
    copied: "Copied!",
    share: "Share",
    invited: "Friends joined",
    earned: "Points earned",
    code: "Your code",
  },
  ar: {
    title: "ادعُ أصدقاءك",
    desc: "شارك رابط الدعوة. عند تسجيل صديقك، يحصل كلاكما على 30 نقطة.",
    copy: "نسخ الرابط",
    copied: "تم النسخ!",
    share: "مشاركة",
    invited: "أصدقاء انضموا",
    earned: "النقاط المكتسبة",
    code: "الرمز الخاص بك",
  },
} as const;

export const ReferralCard = ({ language = "en" }: { language?: "en" | "ar" }) => {
  const s = t[language];
  const [code, setCode] = useState<string | null>(null);
  const [stats, setStats] = useState({ invited: 0, points: 0 });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    void (async () => {
      setCode(await getMyReferralCode());
      setStats(await getMyReferralStats());
    })();
  }, []);

  const link = code ? referralLink(code) : "";

  const copy = async () => {
    if (!link) return;
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      toast.success(s.copied);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error(link);
    }
  };

  const share = async () => {
    if (!link) return;
    if (navigator.share) {
      try { await navigator.share({ title: "Tamayzak", text: s.desc, url: link }); } catch { /* cancelled */ }
    } else {
      void copy();
    }
  };

  return (
    <section
      dir={language === "ar" ? "rtl" : "ltr"}
      className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur p-5 space-y-4"
    >
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-2xl bg-primary/15 border border-primary/30 flex items-center justify-center">
          <Gift className="w-5 h-5 text-primary" />
        </div>
        <div>
          <h3 className="font-semibold">{s.title}</h3>
          <p className="text-xs text-muted-foreground">{s.desc}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0 h-11 px-3 rounded-xl bg-background/60 border border-white/10 flex items-center text-xs text-muted-foreground truncate">
          {link || "…"}
        </div>
        <button
          type="button"
          onClick={copy}
          disabled={!link}
          className="h-11 px-3 rounded-xl bg-primary text-primary-foreground text-sm font-semibold inline-flex items-center gap-2 disabled:opacity-50"
        >
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          <span className="hidden sm:inline">{copied ? s.copied : s.copy}</span>
        </button>
        <button
          type="button"
          onClick={share}
          disabled={!link}
          className="h-11 w-11 rounded-xl border border-white/10 bg-background/60 inline-flex items-center justify-center disabled:opacity-50"
          aria-label={s.share}
        >
          <Share2 className="w-4 h-4" />
        </button>
      </div>

      <div className="grid grid-cols-3 gap-2 text-center">
        <div className="rounded-2xl bg-background/50 border border-white/10 py-3">
          <div className="text-lg font-bold">{stats.invited}</div>
          <div className="text-[11px] text-muted-foreground">{s.invited}</div>
        </div>
        <div className="rounded-2xl bg-background/50 border border-white/10 py-3">
          <div className="text-lg font-bold text-primary">+{stats.points}</div>
          <div className="text-[11px] text-muted-foreground">{s.earned}</div>
        </div>
        <div className="rounded-2xl bg-background/50 border border-white/10 py-3">
          <div className="text-lg font-bold tracking-widest">{code ?? "…"}</div>
          <div className="text-[11px] text-muted-foreground">{s.code}</div>
        </div>
      </div>
    </section>
  );
};

export default ReferralCard;
