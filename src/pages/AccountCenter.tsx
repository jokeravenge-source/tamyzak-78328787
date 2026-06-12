import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Loader2, Save, Trophy, Medal, Palette, MessageCircle, Crown, Settings, Lock } from "lucide-react";
import { Clock } from "lucide-react";
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
  MALE_VARIANTS,
  FEMALE_VARIANTS,
  type CharacterVariant,
} from "@/components/CharacterAvatar";

const t = {
  en: { title: "Account Center", subtitle: "Manage your profile and username.", username: "Username", save: "Save", saving: "Saving…", back: "Back", email: "Email", saved: "Profile updated", points: "Your Points", rank: "Rank", nextRank: "to next rank", theme: "Theme", support: "Support", supportDesc: "Contact us on Telegram for help or feedback.", character: "Your Character", male: "Male", female: "Female", pickGender: "Pick your character", skin: "Skin", hairStyle: "Hair style", hairColor: "Hair color", shirt: "Shirt", glasses: "Glasses", crown: "Crown", on: "On", off: "Off", randomize: "Randomize", premiumOnly: "Premium only", upgrade: "Upgrade to unlock", manageSub: "Manage subscription", openingPortal: "Opening…", makeupRoom: "Makeup Room", lipstick: "Lipstick", eyeshadow: "Eyeshadow", musclePack: "Muscle Pack", muscleDesc: "Show off those gains", headband: "Headband", accessories: "Accessories", necklaceGold: "Gold chain", necklacePearl: "Pearl necklace", none: "None", requestSent: "Name change request submitted — waiting for admin approval", pendingReview: "Pending admin approval", pendingHint: "Your requested name is awaiting admin review.", requestName: "Request name change", noChange: "No change to save" },
  ar: { title: "مركز الحساب", subtitle: "أدر ملفك الشخصي واسم المستخدم.", username: "اسم المستخدم", save: "حفظ", saving: "جارٍ الحفظ…", back: "رجوع", email: "البريد الإلكتروني", saved: "تم تحديث الملف", points: "نقاطك", rank: "المرتبة", nextRank: "للمرتبة التالية", theme: "الثيم", support: "الدعم", supportDesc: "تواصل معنا على تيليجرام للمساعدة أو الملاحظات.", character: "شخصيتك", male: "ذكر", female: "أنثى", pickGender: "اختر شخصيتك", skin: "لون البشرة", hairStyle: "تسريحة الشعر", hairColor: "لون الشعر", shirt: "القميص", glasses: "النظارات", crown: "تاج", on: "نعم", off: "لا", randomize: "عشوائي", premiumOnly: "للبريميوم فقط", upgrade: "رقّ لفتح هذه الميزة", manageSub: "إدارة الاشتراك", openingPortal: "جاري الفتح…", makeupRoom: "غرفة المكياج", lipstick: "أحمر الشفاه", eyeshadow: "ظلال العيون", musclePack: "حزمة العضلات", muscleDesc: "أظهر عضلاتك", headband: "عصابة الرأس", accessories: "إكسسوارات", necklaceGold: "سلسلة ذهبية", necklacePearl: "عقد لؤلؤ", none: "بدون", requestSent: "تم إرسال طلب تغيير الاسم — بانتظار موافقة الإدارة", pendingReview: "بانتظار موافقة الإدارة", pendingHint: "اسمك المطلوب قيد المراجعة من قبل الإدارة.", requestName: "طلب تغيير الاسم", noChange: "لا يوجد تغيير للحفظ" },
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

const SUBJECT_LABELS: Record<string, { en: string; ar: string }> = {
  islamic: { en: "Islamic", ar: "التربية الإسلامية" },
  arabic: { en: "Arabic", ar: "العربية" },
  english: { en: "English", ar: "الإنجليزية" },
  french: { en: "French", ar: "الفرنسية" },
  math: { en: "Math", ar: "الرياضيات" },
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
};

function formatHours(totalSeconds: number, isAr: boolean) {
  const hours = totalSeconds / 3600;
  if (hours >= 1) return `${hours.toFixed(1)} ${isAr ? "س" : "h"}`;
  const mins = Math.max(0, Math.round(totalSeconds / 60));
  return `${mins} ${isAr ? "د" : "m"}`;
}

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
  const [savedName, setSavedName] = useState("");
  const [pendingRequest, setPendingRequest] = useState<{ id: string; requested_name: string } | null>(null);
  const [subjectSeconds, setSubjectSeconds] = useState<Record<string, number>>({});
  const [todaySubjectSeconds, setTodaySubjectSeconds] = useState<Record<string, number>>({});

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
      setSavedName(p?.display_name ?? "");
      setGender((p?.gender as Gender) ?? null);
      setTraits(((p as any)?.character as CharacterTraits) ?? null);
      const { data: pts } = await supabase.from("user_points").select("points").eq("user_id", u.user.id);
      setPoints((pts ?? []).reduce((s: number, r: any) => s + (r.points ?? 0), 0));
      // Aggregate study time per subject across all sessions
      {
        const totals: Record<string, number> = {};
        const todayTotals: Record<string, number> = {};
        const startOfDay = new Date();
        startOfDay.setHours(0, 0, 0, 0);
        const startMs = startOfDay.getTime();
        const pageSize = 1000;
        let from = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data: page, error } = await supabase
            .from("study_sessions")
            .select("subject,duration_seconds,created_at")
            .eq("user_id", u.user.id)
            .range(from, from + pageSize - 1);
          if (error) break;
          (page ?? []).forEach((r: any) => {
            const secs = r.duration_seconds ?? 0;
            totals[r.subject] = (totals[r.subject] ?? 0) + secs;
            if (r.created_at && new Date(r.created_at).getTime() >= startMs) {
              todayTotals[r.subject] = (todayTotals[r.subject] ?? 0) + secs;
            }
          });
          if (!page || page.length < pageSize) break;
          from += pageSize;
        }
        setSubjectSeconds(totals);
        setTodaySubjectSeconds(todayTotals);
      }
      const { data: pend } = await supabase
        .from("username_requests")
        .select("id, requested_name")
        .eq("user_id", u.user.id)
        .eq("status", "pending")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (pend) setPendingRequest(pend as any);
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
      const trimmed = name.trim();
      const { data: existing } = await supabase.from("profiles").select("id, display_name").eq("user_id", u.user.id).maybeSingle();
      const currentName = (existing as any)?.display_name ?? "";
      const nameChanged = trimmed !== currentName;

      if (!existing) {
        // First-time profile: create directly (no approval needed for initial name)
        const { error } = await supabase.from("profiles").insert({ user_id: u.user.id, display_name: trimmed, gender });
        if (error) throw error;
        setSavedName(trimmed);
        localStorage.setItem("app_display_name_v1", trimmed);
        window.dispatchEvent(new Event("app:username-changed"));
        toast.success(text.saved);
      } else if (nameChanged) {
        // Submit a request; do NOT change the profile name yet
        const { data: req, error } = await supabase
          .from("username_requests")
          .insert({ user_id: u.user.id, current_name: currentName, requested_name: trimmed, status: "pending" })
          .select("id, requested_name")
          .single();
        if (error) throw error;
        setPendingRequest(req as any);
        setName(currentName);
        toast.success(text.requestSent);
      } else {
        toast.message(text.noChange);
      }
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
                <div className="flex flex-col items-center gap-4">
                  <div className="rounded-3xl bg-background/40 border border-white/10 p-6">
                    <CharacterAvatar seed={userId} gender={gender} traits={effective} size={280} />
                  </div>
                  <div className="w-full space-y-2">
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
                  </div>
                </div>

                {/* Character style */}
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-muted-foreground mb-2">{language === "ar" ? "الشخصية" : "Character"}</p>
                  <div className="grid grid-cols-4 gap-2">
                    {(gender === "female" ? FEMALE_VARIANTS : MALE_VARIANTS).map((src, i) => {
                      const v = (i + 1) as CharacterVariant;
                      const active = (effective?.variant ?? 1) === v;
                      return (
                        <button
                          key={i}
                          onClick={() => updateTraits({ variant: v })}
                          className={`aspect-square rounded-xl border-2 bg-background/40 transition flex items-center justify-center overflow-hidden ${active ? "border-primary scale-105" : "border-white/10 hover:border-white/30"}`}
                          aria-label={`Style ${v}`}
                        >
                          <img src={src} alt="" className="w-full h-full object-contain" draggable={false} />
                        </button>
                      );
                    })}
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

        {!loading && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{language === "ar" ? "اليوم" : "Today"}</h2>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "ساعاتك اليوم لكل مادة" : "Your hours today per subject"}
                </p>
              </div>
              <div className="ms-auto text-right">
                <p className="text-2xl font-bold gradient-text leading-none">
                  {formatHours(Object.values(todaySubjectSeconds).reduce((s, n) => s + n, 0), language === "ar")}
                </p>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground mt-1">
                  {language === "ar" ? "إجمالي" : "Total"}
                </p>
              </div>
            </div>
            {Object.keys(todaySubjectSeconds).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "لم تدرس بعد اليوم." : "No study time today yet."}
              </p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(todaySubjectSeconds)
                  .sort((a, b) => b[1] - a[1])
                  .map(([subj, secs]) => {
                    const meta = SUBJECT_LABELS[subj];
                    const label = meta ? (language === "ar" ? meta.ar : meta.en) : subj;
                    return (
                      <li key={subj} className="flex items-center justify-between rounded-xl border border-white/5 bg-background/30 px-3 py-2.5">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                          {formatHours(secs, language === "ar")}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
          </div>
        )}

        {!loading && (
          <div className="rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center">
                <Clock className="w-5 h-5 text-primary" />
              </div>
              <div>
                <h2 className="text-lg font-semibold">{language === "ar" ? "إجمالي ساعات الدراسة" : "All-time Study Hours"}</h2>
                <p className="text-xs text-muted-foreground">
                  {language === "ar" ? "إجمالي وقتك لكل مادة" : "Your total time per subject"}
                </p>
              </div>
            </div>
            {Object.keys(subjectSeconds).length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {language === "ar" ? "لا توجد جلسات بعد. ابدأ جلسة دراسة!" : "No sessions yet. Start a study session!"}
              </p>
            ) : (
              <ul className="space-y-2">
                {Object.entries(subjectSeconds)
                  .sort((a, b) => b[1] - a[1])
                  .map(([subj, secs]) => {
                    const meta = SUBJECT_LABELS[subj];
                    const label = meta ? (language === "ar" ? meta.ar : meta.en) : subj;
                    return (
                      <li key={subj} className="flex items-center justify-between rounded-xl border border-white/5 bg-background/30 px-3 py-2.5">
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-sm font-mono px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/30">
                          {formatHours(secs, language === "ar")}
                        </span>
                      </li>
                    );
                  })}
              </ul>
            )}
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
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={40}
                required
                disabled={!!pendingRequest}
                className="mt-1 w-full h-11 px-3 rounded-xl bg-background/60 border border-white/10 focus:border-primary/60 outline-none text-sm disabled:opacity-60"
              />
              {pendingRequest && (
                <p className="mt-2 text-xs text-amber-300 inline-flex items-center gap-1.5">
                  <Lock className="w-3 h-3" />
                  {text.pendingReview}: <span className="font-semibold">{pendingRequest.requested_name}</span>
                </p>
              )}
            </div>
            <button type="submit" disabled={saving || !name.trim() || !!pendingRequest} className="w-full h-11 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-semibold disabled:opacity-60 inline-flex items-center justify-center gap-2">
              {saving ? <><Loader2 className="w-4 h-4 animate-spin" />{text.saving}</> : <><Save className="w-4 h-4" />{name.trim() && name.trim() !== savedName ? text.requestName : text.save}</>}
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