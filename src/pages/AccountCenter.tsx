import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Loader2, Save, Trophy, Medal, Palette, MessageCircle, Crown, Settings, Lock } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import CurvedNavBar from "@/components/CurvedNavBar";
import type { MainMenuChoice } from "@/pages/MainMenu";
import { rankFor, RANKS } from "@/lib/points";
import { ThemePicker } from "@/components/ThemePicker";
import { PremiumBadge } from "@/components/PremiumBadge";
import { useSubscription } from "@/hooks/useSubscription";
import { getPaddleEnvironment } from "@/lib/paddle";
import {
  CharacterAvatar,
  type Gender,
  type CharacterTraits,
  SKIN_COLORS,
  HAIR_COLORS,
  SHIRT_COLORS,
  MALE_HAIRSTYLES,
  FEMALE_HAIRSTYLES,
  getAvatarStyle,
  LIPSTICK_COLORS,
  EYESHADOW_COLORS,
  HEADBAND_COLORS,
} from "@/components/CharacterAvatar";

const t = {
  en: { title: "Account Center", subtitle: "Manage your profile and username.", username: "Username", save: "Save", saving: "Saving…", back: "Back", email: "Email", saved: "Profile updated", points: "Your Points", rank: "Rank", nextRank: "to next rank", theme: "Theme", support: "Support", supportDesc: "Contact us on Telegram for help or feedback.", character: "Your Character", male: "Male", female: "Female", pickGender: "Pick your character", skin: "Skin", hairStyle: "Hair style", hairColor: "Hair color", shirt: "Shirt", glasses: "Glasses", crown: "Crown", on: "On", off: "Off", randomize: "Randomize", premiumOnly: "Premium only", upgrade: "Upgrade to unlock", manageSub: "Manage subscription", openingPortal: "Opening…", makeupRoom: "Makeup Room", lipstick: "Lipstick", eyeshadow: "Eyeshadow", musclePack: "Muscle Pack", muscleDesc: "Show off those gains", headband: "Headband", accessories: "Accessories", necklaceGold: "Gold chain", necklacePearl: "Pearl necklace", none: "None" },
  ar: { title: "مركز الحساب", subtitle: "أدر ملفك الشخصي واسم المستخدم.", username: "اسم المستخدم", save: "حفظ", saving: "جارٍ الحفظ…", back: "رجوع", email: "البريد الإلكتروني", saved: "تم تحديث الملف", points: "نقاطك", rank: "المرتبة", nextRank: "للمرتبة التالية", theme: "الثيم", support: "الدعم", supportDesc: "تواصل معنا على تيليجرام للمساعدة أو الملاحظات.", character: "شخصيتك", male: "ذكر", female: "أنثى", pickGender: "اختر شخصيتك", skin: "لون البشرة", hairStyle: "تسريحة الشعر", hairColor: "لون الشعر", shirt: "القميص", glasses: "النظارات", crown: "تاج", on: "نعم", off: "لا", randomize: "عشوائي", premiumOnly: "للبريميوم فقط", upgrade: "رقّ لفتح هذه الميزة", manageSub: "إدارة الاشتراك", openingPortal: "جاري الفتح…", makeupRoom: "غرفة المكياج", lipstick: "أحمر الشفاه", eyeshadow: "ظلال العيون", musclePack: "حزمة العضلات", muscleDesc: "أظهر عضلاتك", headband: "عصابة الرأس", accessories: "إكسسوارات", necklaceGold: "سلسلة ذهبية", necklacePearl: "عقد لؤلؤ", none: "بدون" },
} as const;

const HAIR_LABELS: Record<string, { en: string; ar: string }> = {
  short: { en: "Short", ar: "قصير" },
  buzz: { en: "Buzz", ar: "حلاقة" },
  spiky: { en: "Spiky", ar: "منتصب" },
  curly: { en: "Curly", ar: "مجعد" },
  fade: { en: "Fade", ar: "متدرج" },
  messy: { en: "Messy", ar: "فوضوي" },
  long: { en: "Long", ar: "طويل" },
  bun: { en: "Bun", ar: "كعكة" },
  ponytail: { en: "Ponytail", ar: "ذيل حصان" },
  bob: { en: "Bob", ar: "بوب" },
  curly_long: { en: "Curly Long", ar: "مجعد طويل" },
  braids: { en: "Braids", ar: "ضفائر" },
};

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
  const [userId, setUserId] = useState<string>("");
  const [gender, setGender] = useState<Gender | null>(null);
  const [traits, setTraits] = useState<CharacterTraits | null>(null);
  const { isPremium, subscription } = useSubscription();
  const [portalLoading, setPortalLoading] = useState(false);

  const tryPremium = (apply: () => void) => {
    if (!isPremium) {
      toast.error(text.upgrade, {
        action: onNav ? { label: language === "ar" ? "افتح" : "Open", onClick: () => onNav("premium") } : undefined,
      });
      return;
    }
    apply();
  };

  const openPortal = async () => {
    setPortalLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("paddle-portal", {
        body: { environment: getPaddleEnvironment() },
      });
      if (error) throw error;
      if (!data?.url && !data?.overview) throw new Error("No portal URL");
      window.open(data.url || data.overview, "_blank", "noopener,noreferrer");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to open portal");
    } finally {
      setPortalLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      setUserId(u.user.id);
      const { data: p } = await supabase.from("profiles").select("display_name, gender, character").eq("user_id", u.user.id).maybeSingle();
      setName(p?.display_name ?? "");
      setGender((p?.gender as Gender) ?? null);
      setTraits(((p as any)?.character as CharacterTraits) ?? null);
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
        const { error } = await supabase.from("profiles").update({ display_name: name.trim(), gender }).eq("user_id", u.user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("profiles").insert({ user_id: u.user.id, display_name: name.trim(), gender });
        if (error) throw error;
      }
      localStorage.setItem("app_display_name_v1", name.trim());
      window.dispatchEvent(new Event("app:username-changed"));
      toast.success(text.saved);
    } catch (err: any) {
      toast.error(err?.message ?? "Failed");
    } finally { setSaving(false); }
  };

  const pickGender = async (g: Gender) => {
    setGender(g);
    const base = getAvatarStyle(userId || "anon", g);
    setTraits((prev) => prev ?? base);
    try {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      const { data: existing } = await supabase.from("profiles").select("id").eq("user_id", u.user.id).maybeSingle();
      if (existing) {
        await supabase.from("profiles").update({ gender: g }).eq("user_id", u.user.id);
      } else {
        await supabase.from("profiles").insert({ user_id: u.user.id, display_name: name.trim() || "Student", gender: g });
      }
    } catch {}
  };

  const updateTraits = async (patch: Partial<CharacterTraits>) => {
    const next: CharacterTraits = {
      ...(traits ?? getAvatarStyle(userId || "anon", gender ?? "male")),
      ...patch,
    };
    setTraits(next);
    try {
      if (!userId) return;
      await supabase.from("profiles").update({ character: next as any }).eq("user_id", userId);
    } catch {}
  };

  const randomize = () => {
    if (!gender) return;
    const seed = String(Date.now()) + Math.random();
    updateTraits(getAvatarStyle(seed, gender));
  };

  const effective: CharacterTraits | null = gender
    ? { ...getAvatarStyle(userId || "anon", gender), ...(traits ?? {}) }
    : null;
  const hairOptions = gender === "female" ? FEMALE_HAIRSTYLES : MALE_HAIRSTYLES;

  const rank = rankFor(points);
  const nextRank = RANKS.find((r) => r.min > points);
  const toNext = nextRank ? nextRank.min - points : 0;

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <section className="relative z-10 max-w-md mx-auto space-y-5 animate-fade-up">
        {!loading && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6">
            <p className="text-xs uppercase tracking-[0.25em] text-muted-foreground mb-4">{text.character}</p>
            {gender ? (
              <div className="space-y-5">
                <div className="flex items-center gap-5">
                  <div className="rounded-2xl bg-background/40 border border-white/10 p-2">
                    <CharacterAvatar seed={userId} gender={gender} traits={effective} size={120} />
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex gap-2">
                      <button
                        onClick={() => pickGender("male")}
                        className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${gender === "male" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"}`}
                      >{text.male}</button>
                      <button
                        onClick={() => pickGender("female")}
                        className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${gender === "female" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"}`}
                      >{text.female}</button>
                    </div>
                    <button
                      onClick={randomize}
                      className="w-full h-9 rounded-lg text-xs font-semibold border border-white/10 bg-background/40 text-muted-foreground hover:text-foreground transition"
                    >🎲 {text.randomize}</button>
                  </div>
                </div>

                {/* Skin */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-2">{text.skin}</p>
                  <div className="flex flex-wrap gap-2">
                    {SKIN_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateTraits({ skin: c })}
                        className={`w-8 h-8 rounded-full border-2 transition ${effective?.skin === c ? "border-primary scale-110" : "border-white/20 hover:border-white/40"}`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                    {PREMIUM_SKIN_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => tryPremium(() => updateTraits({ skin: c }))}
                        className={`relative w-8 h-8 rounded-full border-2 transition ${effective?.skin === c ? "border-amber-400 scale-110" : "border-amber-400/60 hover:border-amber-400"} ${!isPremium ? "opacity-70" : ""}`}
                        style={{ backgroundColor: c }}
                        aria-label={`${c} (premium)`}
                      >
                        {!isPremium && <Lock className="w-3 h-3 text-amber-200 absolute -top-1 -right-1 bg-amber-600 rounded-full p-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Hair style */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{text.hairStyle}</p>
                  <div className="grid grid-cols-3 gap-2">
                    {hairOptions.map((h) => (
                      <button
                        key={h}
                        onClick={() => updateTraits({ hair: h })}
                        className={`h-9 px-2 rounded-lg text-[11px] font-semibold border transition ${effective?.hair === h ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"}`}
                      >{HAIR_LABELS[h]?.[language] ?? h}</button>
                    ))}
                  </div>
                </div>

                {/* Hair color */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{text.hairColor}</p>
                  <div className="flex flex-wrap gap-2">
                    {HAIR_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateTraits({ hairColor: c })}
                        className={`w-8 h-8 rounded-full border-2 transition ${effective?.hairColor === c ? "border-primary scale-110" : "border-white/20 hover:border-white/40"}`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                    {PREMIUM_HAIR_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => tryPremium(() => updateTraits({ hairColor: c }))}
                        className={`relative w-8 h-8 rounded-full border-2 transition ${effective?.hairColor === c ? "border-amber-400 scale-110" : "border-amber-400/60 hover:border-amber-400"} ${!isPremium ? "opacity-70" : ""}`}
                        style={{ backgroundColor: c }}
                        aria-label={`${c} (premium)`}
                      >
                        {!isPremium && <Lock className="w-3 h-3 text-amber-200 absolute -top-1 -right-1 bg-amber-600 rounded-full p-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Shirt color */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{text.shirt}</p>
                  <div className="flex flex-wrap gap-2">
                    {SHIRT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateTraits({ shirt: c })}
                        className={`w-8 h-8 rounded-full border-2 transition ${effective?.shirt === c ? "border-primary scale-110" : "border-white/20 hover:border-white/40"}`}
                        style={{ backgroundColor: c }}
                        aria-label={c}
                      />
                    ))}
                    {PREMIUM_SHIRT_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => tryPremium(() => updateTraits({ shirt: c }))}
                        className={`relative w-8 h-8 rounded-full border-2 transition ${effective?.shirt === c ? "border-amber-400 scale-110" : "border-amber-400/60 hover:border-amber-400"} ${!isPremium ? "opacity-70" : ""}`}
                        style={{ backgroundColor: c }}
                        aria-label={`${c} (premium)`}
                      >
                        {!isPremium && <Lock className="w-3 h-3 text-amber-200 absolute -top-1 -right-1 bg-amber-600 rounded-full p-0.5" />}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Glasses */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{text.glasses}</p>
                  <div className="flex gap-2">
                    <button
                      onClick={() => updateTraits({ accessory: "glasses" })}
                      className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${effective?.accessory === "glasses" ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"}`}
                    >{text.on}</button>
                    <button
                      onClick={() => updateTraits({ accessory: null })}
                      className={`flex-1 h-9 rounded-lg text-xs font-semibold border transition ${effective?.accessory == null ? "bg-primary text-primary-foreground border-primary" : "border-white/10 bg-background/40 text-muted-foreground hover:text-foreground"}`}
                    >{text.off}</button>
                    <button
                      onClick={() => tryPremium(() => updateTraits({ accessory: "crown" }))}
                      className={`relative flex-1 h-9 rounded-lg text-xs font-semibold border transition inline-flex items-center justify-center gap-1 ${effective?.accessory === "crown" ? "bg-gradient-to-r from-amber-500 to-yellow-400 text-amber-950 border-amber-400" : "border-amber-400/40 bg-background/40 text-amber-300 hover:border-amber-400"} ${!isPremium ? "opacity-80" : ""}`}
                    >
                      <Crown className="w-3.5 h-3.5" />{text.crown}
                      {!isPremium && <Lock className="w-3 h-3 absolute -top-1 -right-1 bg-amber-600 text-amber-50 rounded-full p-0.5" />}
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <p className="text-sm text-muted-foreground mb-4">{text.pickGender}</p>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => pickGender("male")}
                    className="rounded-2xl border border-white/10 bg-background/40 p-4 hover:border-primary/60 transition flex flex-col items-center gap-2"
                  >
                    <CharacterAvatar seed={userId} gender="male" size={80} />
                    <span className="text-sm font-semibold">{text.male}</span>
                  </button>
                  <button
                    onClick={() => pickGender("female")}
                    className="rounded-2xl border border-white/10 bg-background/40 p-4 hover:border-primary/60 transition flex flex-col items-center gap-2"
                  >
                    <CharacterAvatar seed={userId} gender="female" size={80} />
                    <span className="text-sm font-semibold">{text.female}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

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
            {isPremium && (
              <div className="flex items-center justify-between gap-3 pt-2">
                <PremiumBadge size="sm" />
                <button
                  type="button"
                  onClick={openPortal}
                  disabled={portalLoading}
                  className="inline-flex items-center gap-2 text-xs px-3 py-2 rounded-lg border border-amber-400/40 bg-amber-500/10 text-amber-300 hover:bg-amber-500/20 transition disabled:opacity-60"
                >
                  {portalLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Settings className="w-3.5 h-3.5" />}
                  {portalLoading ? text.openingPortal : text.manageSub}
                </button>
              </div>
            )}
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