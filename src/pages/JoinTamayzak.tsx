import { useState } from "react";
import { Loader2, Send, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { AppLanguage } from "@/components/LanguageGate";

const JoinTamayzak = ({ language, onBack }: { language: AppLanguage; onBack: () => void }) => {
  const isAr = language === "ar";
  const [fullName, setFullName] = useState("");
  const [telegram, setTelegram] = useState("");
  const [cv, setCv] = useState("");
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName.trim() || !telegram.trim() || !cv.trim()) {
      toast.error(isAr ? "يرجى ملء جميع الحقول" : "Please fill all fields");
      return;
    }
    setSending(true);
    try {
      const { data, error } = await supabase.functions.invoke("join-tamayzak", {
        body: {
          full_name: fullName.trim(),
          telegram_username: telegram.trim(),
          cv: cv.trim(),
        },
      });
      if (error || (data as { error?: string })?.error) throw new Error(error?.message ?? "failed");
      setDone(true);
      toast.success(isAr ? "تم إرسال طلبك بنجاح" : "Your request was sent");
    } catch {
      toast.error(isAr ? "تعذّر الإرسال، حاول مرة أخرى" : "Could not send, please try again");
    } finally {
      setSending(false);
    }
  };

  return (
    <main className="min-h-screen bg-background pb-28" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto px-4 sm:px-6 pt-6">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 h-9 px-3 rounded-lg border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors mb-6"
        >
          {isAr ? "رجوع" : "Back"}
        </button>

        <h1 className="text-2xl font-bold mb-1">{isAr ? "انضم الى تميزك" : "Join Tamayzak"}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {isAr ? "املأ بياناتك وسيتم التواصل معك عبر تيليجرام." : "Fill in your details and we'll contact you on Telegram."}
        </p>

        {done ? (
          <div className="rounded-2xl border border-border bg-card p-6 text-center">
            <CheckCircle2 className="w-10 h-10 mx-auto text-primary mb-3" />
            <p className="font-semibold">{isAr ? "تم استلام طلبك!" : "Request received!"}</p>
            <p className="text-sm text-muted-foreground mt-1">
              {isAr ? "سنتواصل معك قريباً على تيليجرام." : "We'll reach out to you on Telegram soon."}
            </p>
          </div>
        ) : (
          <form onSubmit={submit} className="rounded-2xl border border-border bg-card p-5 space-y-4">
            <div>
              <label className="block text-sm font-medium mb-1.5">{isAr ? "الاسم الكامل" : "Full name"}</label>
              <input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                maxLength={120}
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                placeholder={isAr ? "اكتب اسمك الكامل" : "Your full name"}
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">{isAr ? "معرّف تيليجرام" : "Telegram username"}</label>
              <input
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                maxLength={60}
                dir="ltr"
                className="w-full h-11 px-3 rounded-lg border border-border bg-background text-sm"
                placeholder="@username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5">
                {isAr ? "السيرة الذاتية" : "Your CV"}
              </label>
              <textarea
                value={cv}
                onChange={(e) => setCv(e.target.value)}
                maxLength={4000}
                rows={7}
                className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm resize-y leading-relaxed"
                placeholder={
                  isAr
                    ? "اكتب سيرتك الذاتية: خبرتك، المواد التي تدرّسها، إنجازاتك..."
                    : "Write your CV: experience, subjects you teach, achievements..."
                }
              />
              <p className="text-[11px] text-muted-foreground mt-1">{cv.length}/4000</p>
            </div>
            <button
              type="submit"
              disabled={sending}
              className="w-full h-11 rounded-lg bg-primary text-primary-foreground font-semibold inline-flex items-center justify-center gap-2 disabled:opacity-60"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              {isAr ? "إرسال" : "Send"}
            </button>
          </form>
        )}
      </div>
    </main>
  );
};

export default JoinTamayzak;
