import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { User, Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";
import CurvedNavBar from "@/components/CurvedNavBar";
import type { MainMenuChoice } from "@/pages/MainMenu";

const t = {
  en: { title: "Account Center", subtitle: "Manage your profile and username.", username: "Username", save: "Save", saving: "Saving…", back: "Back", email: "Email", saved: "Username updated" },
  ar: { title: "مركز الحساب", subtitle: "أدر ملفك الشخصي واسم المستخدم.", username: "اسم المستخدم", save: "حفظ", saving: "جارٍ الحفظ…", back: "رجوع", email: "البريد الإلكتروني", saved: "تم تحديث الاسم" },
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

  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      setEmail(u.user.email ?? "");
      const { data: p } = await supabase.from("profiles").select("display_name").eq("user_id", u.user.id).maybeSingle();
      setName(p?.display_name ?? "");
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

  return (
    <main className="min-h-screen px-4 py-12 md:py-20 pb-32 relative overflow-hidden" dir={language === "ar" ? "rtl" : "ltr"}>
      <div className="pointer-events-none absolute -top-40 -left-40 w-[28rem] h-[28rem] rounded-full bg-primary/20 blur-3xl animate-float" />
      <div className="pointer-events-none absolute -bottom-40 -right-40 w-[28rem] h-[28rem] rounded-full bg-accent/20 blur-3xl animate-float" style={{ animationDelay: "2s" }} />

      <section className="relative z-10 max-w-md mx-auto rounded-3xl border border-white/10 bg-secondary/40 backdrop-blur-xl p-8 animate-fade-up">
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
      </section>
      {onNav && <CurvedNavBar language={language} active="account" onSelect={onNav} />}
    </main>
  );
};

export default AccountCenter;