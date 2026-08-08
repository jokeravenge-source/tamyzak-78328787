import { supabase } from "@/integrations/supabase/client";

/** Date tracking went live — shown in the admin dashboard so numbers aren't
 * mistaken for full historical data. */
export const TRACKING_STARTED_AT = "2026-08-08";

export type SignupSource = "telegram" | "instagram" | "direct" | "referral" | "other";
const VALID: SignupSource[] = ["telegram", "instagram", "direct", "referral", "other"];

const SOURCE_KEY = "tmz_signup_source_v1";
const SOURCE_SYNCED_KEY = "tmz_signup_source_synced_v1";

/** Read ?src= / ?utm_source= on first visit and remember it forever (first touch wins). */
export function captureSignupSource(): SignupSource {
  let stored = "";
  try { stored = localStorage.getItem(SOURCE_KEY) || ""; } catch { /* ignore */ }
  if (VALID.includes(stored as SignupSource)) return stored as SignupSource;

  let src: SignupSource = "direct";
  try {
    const params = new URLSearchParams(window.location.search);
    const raw = (params.get("src") || params.get("utm_source") || "").toLowerCase().trim();
    if (raw) {
      src = VALID.includes(raw as SignupSource) ? (raw as SignupSource) : "other";
    } else if (document.referrer) {
      const host = new URL(document.referrer).hostname;
      if (!host.includes(window.location.hostname)) {
        if (host.includes("t.me") || host.includes("telegram")) src = "telegram";
        else if (host.includes("instagram")) src = "instagram";
        else src = "referral";
      }
    }
    localStorage.setItem(SOURCE_KEY, src);
  } catch { /* ignore */ }
  return src;
}

export function getSignupSource(): SignupSource {
  try {
    const s = localStorage.getItem(SOURCE_KEY) || "";
    if (VALID.includes(s as SignupSource)) return s as SignupSource;
  } catch { /* ignore */ }
  return "direct";
}

/** Write the remembered source onto the user's profile once it exists. */
export async function syncSignupSource() {
  try {
    if (localStorage.getItem(SOURCE_SYNCED_KEY) === "1") return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const { data: p } = await supabase
      .from("profiles")
      .select("id, source")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (!p) return; // profile not created yet — retry next launch
    if (!(p as any).source) {
      await supabase.from("profiles").update({ source: getSignupSource() }).eq("id", (p as any).id);
    }
    localStorage.setItem(SOURCE_SYNCED_KEY, "1");
  } catch { /* ignore */ }
}

/** Fire-and-forget event logging. Never throws, never blocks the UI. */
export async function trackEvent(eventName: string, metadata: Record<string, unknown> = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("events").insert({
      user_id: u.user.id,
      event_name: eventName,
      metadata: metadata as any,
    });
  } catch { /* analytics must never break the app */ }
}

const featureThrottle = new Map<string, number>();
/** Log a feature interaction (throttled to once per feature per 60s per tab). */
export function trackFeature(feature: string, metadata: Record<string, unknown> = {}) {
  const now = Date.now();
  const last = featureThrottle.get(feature) ?? 0;
  if (now - last < 60_000) return;
  featureThrottle.set(feature, now);
  void trackEvent("feature_used", { feature, ...metadata });
}

export function trackPointsEarned(source: string, points: number) {
  void trackEvent("points_earned", { source, points });
}

export function trackStreakUpdated(days: number) {
  void trackEvent("streak_updated", { days });
}

export function trackFeatureUnlocked(feature: string, points?: number) {
  void trackEvent("feature_unlocked", { feature, points });
}

let sessionStarted = false;
/** Start an app session and register the matching session_end. */
export function startAnalyticsSession() {
  if (sessionStarted) return;
  sessionStarted = true;
  const startedAt = Date.now();
  captureSignupSource();
  void trackEvent("session_start", { source: getSignupSource(), path: window.location.pathname });
  void syncSignupSource();

  const end = () => {
    void trackEvent("session_end", { duration_seconds: Math.round((Date.now() - startedAt) / 1000) });
  };
  let ended = false;
  const onHidden = () => {
    if (document.visibilityState === "hidden" && !ended) { ended = true; end(); }
  };
  document.addEventListener("visibilitychange", onHidden);
  window.addEventListener("pagehide", onHidden);
}
