import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const PENDING_KEY = "tmz_pending_referral_v1";
const DONE_KEY = "tmz_referral_redeemed_v1";

/** Read ?ref=CODE from the URL on first visit and remember it until signup. */
export function captureReferralCode() {
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("ref") || params.get("referral") || "").trim().toUpperCase();
    if (raw && /^[A-Z0-9]{4,16}$/.test(raw) && !localStorage.getItem(DONE_KEY)) {
      localStorage.setItem(PENDING_KEY, raw);
    }
  } catch { /* ignore */ }
}

/** Redeem a stored invite code once the user is signed in. Both sides get 30 points. */
export async function redeemPendingReferral(language: "en" | "ar" = "en") {
  let code = "";
  try {
    if (localStorage.getItem(DONE_KEY) === "1") return;
    code = localStorage.getItem(PENDING_KEY) || "";
  } catch { /* ignore */ }
  if (!code) return;

  try {
    const { data, error } = await supabase.rpc("redeem_referral", { _code: code });
    if (error) return; // keep the code, retry next launch
    const res = data as { ok?: boolean; reason?: string } | null;
    localStorage.setItem(DONE_KEY, "1");
    localStorage.removeItem(PENDING_KEY);
    if (res?.ok) {
      toast.success(
        language === "ar"
          ? "🎁 حصلت أنت وصديقك على 30 نقطة هدية!"
          : "🎁 You and your friend each earned 30 points!"
      );
    }
  } catch { /* ignore */ }
}

export async function getMyReferralCode(): Promise<string | null> {
  const { data, error } = await supabase.rpc("get_my_referral_code");
  if (error) return null;
  return (data as string) ?? null;
}

export function referralLink(code: string) {
  return `${window.location.origin}/?ref=${code}`;
}

export async function getMyReferralStats(): Promise<{ invited: number; points: number }> {
  const { data, error } = await supabase.rpc("my_referral_stats");
  if (error || !data) return { invited: 0, points: 0 };
  const d = data as { invited?: number; points?: number };
  return { invited: Number(d.invited ?? 0), points: Number(d.points ?? 0) };
}
