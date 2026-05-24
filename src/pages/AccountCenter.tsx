import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Loader2, Save, Trophy, Medal, Palette, MessageCircle } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import CurvedNavBar from "@/components/CurvedNavBar";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { rankFor, RANKS } from "@/lib/points";
import { ThemePicker } from "@/components/ThemePicker";

const t = {
  en: { title: "Account Center", subtitle: "Manage your profile and username.", username: "Username", save: "Save", saving: "Saving…", back: "Back", email: "Email", saved: "Username updated", points: "Your Points", rank: "Rank", nextRank: "to next rank", theme: "Theme", support: "Support", supportDesc: "Contact us on Telegram for help or feedback." },
  ar: { title: "مركز الحساب", subtitle: "أدر ملفك الشخصي واسم المستخدم.", username: "اسم المستخدم", save: "حفظ", saving: "جارٍ الحفظ…", back: "رجوع", email: "البريد الإلكتروني", saved: "تم تحديث الاسم", points: "نقاطك", rank: "المرتبة", nextRank: "للمرتبة التالية", theme: "الثيم", support: "الدعم", supportDesc: "تواصل معنا على تيليجرام للمساعدة أو الملاحظات." },
} as const;

const AccountCenter = ({
  language,
  onBack,
  onNav,
}: {
  language: AppLanguage;
  onBack: () => void;
  onNav?: (c: MainMenuChoice) => void;
}) => {
  const text = t[language];
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [points, setPoints] = useState(0);

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      setName(p?.display_name ?? "");
      const { data: pts } = await supabase.from("user_points").select("points").eq("user_id", u.user.id);
      setPoints((pts ?? []).reduce((s: number, r: any) => s + (r.points ?? 0), 0));
      setLoading(false);
    })();
  }, []);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) throw new Error("Not signed in");
      const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", u.user.id).maybeSingle();
      if (existing) {
        const { error } = await supabase.from("profiles").update({ display_name: name.trim() }).eq("user_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ user_id: u.user.id, display_name: name.trim() });
        if (error) throw error;
      }
      localStorage.setItem("app_display_name_v1", name.trim());
      window.dispatchEvent(new Event("app:username-changed"));
      toast.success(text.saved);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally { setSaving(false); }
  };

  const rank = rankFor(points);
  const nextRank = RANKS.find((r) => r.min > points);
  const toNext = nextRank ? nextRank.min - points : 0;

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <section className="relative z-10 max-w-md mx-auto space-y-5 animate-fade-up">
        {!loading && (
          <div className="rounded-3xl border border-primary/40 bg-gradient-to-br from-primary/15 via-secondary/60 to-accent/15 backdrop-blur-xl p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-1">{text.points}</p>
                <p className="text-5xl font-bold gradient-text leading-none">{points}</p>
              </div>
              <div className="w-14 h-14 rounded-2xl bg-primary/20 flex items-center justify-center">
                <Trophy className="w-7 h-7 text-primary" />
              </div>
            </div>
            <div className="mt-4 flex items-center justify-between">
              <span
                className="inline-flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-full font-semibold"
                style={{ backgroundColor: `${rank.color}22`, color: rank.color, border: `1px solid ${rank.color}66` }}
              >
                <Medal className="w-3.5 h-3.5" />
                {language === "ar" ? rank.label.ar : rank.label.en}
              </span>
              {nextRank && (
                <span className="text-xs text-muted-foreground">
                  {toNext} {text.nextRank} ({language === "ar" ? nextRank.label.ar : nextRank.label.en})
                </span>
              )}
            </div>
          </div>
        )}

        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-8">
        <div className="w-14 h-14 rounded-2xl bg-primary/15 flex items-center justify-center mb-4">
          <User className="w-7 h-7 text-primary" />
        </div>
        <h1 className="text-3xl font-bold gradient-text mb-1">{text.title}</h1>
        <p className="text-sm text-muted-foreground mb-6">{text.subtitle}</p>

        {loading ? (
          <div className="flex justify-center py-6"><Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /></div>
        ) : (
          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="text-xs text-muted-foreground">{text.email}</label>
              <input value={email} disabled className="mt-1 w-full h-11 px-3 rounded-xl bg-background/40 border border-white/10 text-sm opacity-70" />
            </div>
            <div>
              <label className="text-xs text-muted-foreground">{text.username}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} required className="mt-1 w-full h-11 px-3 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm" />
            </div>
            <button type="submit" disabled={saving || !name.trim()} className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{text.saving}</> : <><Save className="w-4 h-4" />{text.save}</>}
            </button>
          </form>
        )}
        </div>

        <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <Palette className="w-5 h-5 text-primary" />
            </div>
            <h2 className="text-lg font-semibold">{text.theme}</h2>
          </div>
          <ThemePicker language={language} variant="inline" />
        </div>

        <a
          href="https://t.me/ias404"
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6 hover:border-primary/40 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
              <MessageCircle className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">{text.support}</h2>
              <p className="text-sm text-muted-foreground">{text.supportDesc}</p>
            </div>
          </div>
        </a>
      </section>
      {onNav && <CurvedNavBar language={language} active="account" onSelect={onNav} />}
    </main>
  );
};

export default AccountCenter;