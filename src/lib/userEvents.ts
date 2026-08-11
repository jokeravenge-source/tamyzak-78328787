import { supabase } from "@/integrations/supabase/client";

/**
 * Thin logger for the `user_events` table.
 * Fire-and-forget — analytics must never break or block the UI.
 */
export async function logUserEvent(eventName: string, props: Record<string, unknown> = {}) {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    await supabase.from("user_events").insert({
      user_id: u.user.id,
      event_name: eventName,
      props: props as never,
    });
  } catch {
    /* ignore */
  }
}

/* ---------------- onboarding step events ---------------- */

export function logOnboardingStepViewed(step: number, name: string, props: Record<string, unknown> = {}) {
  void logUserEvent("onboarding_step_viewed", { step, name, ...props });
}

export function logOnboardingStepCompleted(step: number, name: string, props: Record<string, unknown> = {}) {
  void logUserEvent("onboarding_step_completed", { step, name, ...props });
}

/* ---------------- lifecycle events ---------------- */

const SIGNUP_LOGGED_KEY = "tmz_signup_completed_logged_v1";

/** Logged once per account, the first time an authenticated session is seen. */
export async function logSignupCompleted(props: Record<string, unknown> = {}) {
  try {
    if (localStorage.getItem(SIGNUP_LOGGED_KEY) === "1") return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const created = u.user.created_at ? new Date(u.user.created_at).getTime() : 0;
    localStorage.setItem(SIGNUP_LOGGED_KEY, "1");
    // Only a genuinely new account (first 24h) counts as a signup.
    if (created && Date.now() - created > 86_400_000) return;
    await logUserEvent("signup_completed", props);
  } catch {
    /* ignore */
  }
}

const FIRST_TOUCH_KEY = "tmz_first_feature_touch_v1";

/** Logged the first time the student opens any feature (per account/device). */
export function logFirstFeatureTouch(feature: string) {
  try {
    if (localStorage.getItem(FIRST_TOUCH_KEY)) return;
    localStorage.setItem(FIRST_TOUCH_KEY, feature);
  } catch {
    /* ignore */
  }
  void logUserEvent("first_feature_touch", { feature });
}

export function logContentUnitCompleted(feature: string, subject?: string, props: Record<string, unknown> = {}) {
  void logUserEvent("content_unit_completed", { feature, subject, ...props });
}

/* ---------------- signup attribution ---------------- */

const ATTR_KEY = "tmz_signup_attribution_v1";
const ATTR_SYNCED_KEY = "tmz_signup_attribution_synced_v1";

type Attribution = { src: string | null; code: string | null; referrer: string | null; landing_path: string | null };

/** First-touch capture of ?src= and ?code= — call once on app boot. */
export function captureAttribution(): Attribution {
  try {
    const existing = localStorage.getItem(ATTR_KEY);
    if (existing) return JSON.parse(existing) as Attribution;
    const params = new URLSearchParams(window.location.search);
    const attribution: Attribution = {
      src: (params.get("src") || params.get("utm_source") || "").toLowerCase().trim() || null,
      code: (params.get("code") || params.get("ref") || "").trim() || null,
      referrer: document.referrer || null,
      landing_path: window.location.pathname || null,
    };
    if (!attribution.src) {
      const host = attribution.referrer ? new URL(attribution.referrer).hostname : "";
      if (!host || host.includes(window.location.hostname)) attribution.src = "direct";
      else if (host.includes("t.me") || host.includes("telegram")) attribution.src = "telegram";
      else if (host.includes("instagram")) attribution.src = "instagram";
      else attribution.src = "referral";
    }
    localStorage.setItem(ATTR_KEY, JSON.stringify(attribution));
    return attribution;
  } catch {
    return { src: "direct", code: null, referrer: null, landing_path: null };
  }
}

/** Write the remembered attribution to `signup_attribution` once we have a user. */
export async function syncAttribution() {
  try {
    if (localStorage.getItem(ATTR_SYNCED_KEY) === "1") return;
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return;
    const attribution = captureAttribution();
    await supabase.from("signup_attribution").insert({ user_id: u.user.id, ...attribution });
    localStorage.setItem(ATTR_SYNCED_KEY, "1");
  } catch {
    // Unique violation (already attributed) or offline — never retry-loop the UI.
    try { localStorage.setItem(ATTR_SYNCED_KEY, "1"); } catch { /* ignore */ }
  }
}
