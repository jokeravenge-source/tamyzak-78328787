import { supabase } from "@/integrations/supabase/client";

export type UnlockAction =
  | "daily_login"
  | "flashcard_session"
  | "mcq_quiz"
  | "ministerial_set"
  | "video_to_notes"
  | "accuracy_bonus";

export type FeatureKey = "mind_maps" | "notebooks" | "canvas" | "math_tools_suite";

export type FeatureTier = {
  feature_key: FeatureKey;
  display_name_en: string;
  display_name_ar: string;
  unlock_threshold: number;
  sort_order: number;
  icon: string;
};

export type UserProgress = {
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  last_active_date: string | null;
};

export type AwardResult = {
  awarded: number;
  streak_bonus: number;
  streak_action: string | null;
  lifetime_points: number;
  current_streak: number;
  longest_streak: number;
  new_unlocks: FeatureKey[];
};

/** Which in-app screen each gated feature opens. `null` = no screen yet. */
export const FEATURE_MENU: Record<FeatureKey, string | null> = {
  mind_maps: "mindmap",
  notebooks: "notes",
  canvas: "canvas",
  math_tools_suite: null,
};

/** Reverse lookup: is this menu key gated, and by which feature? */
export const MENU_FEATURE: Record<string, FeatureKey> = {
  mindmap: "mind_maps",
  notes: "notebooks",
  canvas: "canvas",
};

export function isGatedMenu(menu: string): FeatureKey | null {
  return MENU_FEATURE[menu] ?? null;
}

export async function fetchTiers(): Promise<FeatureTier[]> {
  const { data } = await supabase
    .from("feature_unlocks")
    .select("feature_key, display_name_en, display_name_ar, unlock_threshold, sort_order, icon")
    .order("sort_order", { ascending: true });
  return (data ?? []) as FeatureTier[];
}

export async function fetchProgress(): Promise<UserProgress> {
  const { data: u } = await supabase.auth.getUser();
  const empty: UserProgress = { lifetime_points: 0, current_streak: 0, longest_streak: 0, last_active_date: null };
  if (!u.user) return empty;
  const { data } = await supabase
    .from("user_progress")
    .select("lifetime_points, current_streak, longest_streak, last_active_date")
    .eq("user_id", u.user.id)
    .maybeSingle();
  return (data as UserProgress | null) ?? empty;
}

export async function fetchUnlockedKeys(): Promise<FeatureKey[]> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return [];
  const { data } = await supabase
    .from("user_feature_unlocks")
    .select("feature_key")
    .eq("user_id", u.user.id);
  return (data ?? []).map((r: { feature_key: string }) => r.feature_key as FeatureKey);
}

/**
 * Award points for a completed free action. All validation, daily caps, streak
 * maths and unlock detection happen server-side — the client never mutates points.
 */
export async function awardAction(
  action: UnlockAction,
  metadata: Record<string, unknown> = {},
): Promise<AwardResult | null> {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return null;
  const { data, error } = await supabase.rpc("award_points", {
    _action_type: action,
    _metadata: metadata as never,
  });
  if (error || !data) return null;
  const res = data as unknown as AwardResult;

  if (res.streak_bonus > 0) {
    window.dispatchEvent(
      new CustomEvent("app:streak-bonus", {
        detail: { bonus: res.streak_bonus, streak: res.current_streak },
      }),
    );
  }
  if (res.new_unlocks?.length) {
    window.dispatchEvent(
      new CustomEvent("app:feature-unlocked", { detail: { features: res.new_unlocks } }),
    );
  }
  window.dispatchEvent(new CustomEvent("app:progress-updated", { detail: res }));
  return res;
}

const LOGIN_KEY = "daily_login_awarded_v1";

function baghdadToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Baghdad" }).format(new Date());
}

/** Awards `daily_login` at most once per Baghdad day (server enforces the real cap). */
export async function ensureDailyLogin() {
  const today = baghdadToday();
  try {
    if (localStorage.getItem(LOGIN_KEY) === today) return;
  } catch {
    /* storage unavailable — the server cap still protects us */
  }
  const res = await awardAction("daily_login", { day: today });
  if (res) {
    try { localStorage.setItem(LOGIN_KEY, today); } catch { /* ignore */ }
  }
}