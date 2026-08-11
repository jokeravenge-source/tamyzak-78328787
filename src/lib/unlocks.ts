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
/** Human-readable earning rules — kept in sync with the `award_points` DB function. */
export type PointRule = {
  action: UnlockAction;
  points: number;
  dailyCap: number;
  ar: string;
  en: string;
  hintAr: string;
  hintEn: string;
};

export const POINT_RULES: Record<UnlockAction, PointRule> = {
  daily_login: {
    action: "daily_login",
    points: 10,
    dailyCap: 1,
    ar: "الدخول اليومي",
    en: "Daily login",
    hintAr: "ادخل الموقع كل يوم",
    hintEn: "Open the app each day",
  },
  flashcard_session: {
    action: "flashcard_session",
    points: 15,
    dailyCap: 3,
    ar: "جلسة بطاقات",
    en: "Flashcard session",
    hintAr: "أكمل مجموعة بطاقات وقيّمها بـ«فهمتها»",
    hintEn: "Finish a deck and rate it as understood",
  },
  mcq_quiz: {
    action: "mcq_quiz",
    points: 15,
    dailyCap: 3,
    ar: "اختبار اختيار من متعدد",
    en: "MCQ quiz",
    hintAr: "أكمل اختباراً كاملاً",
    hintEn: "Complete a full quiz",
  },
  ministerial_set: {
    action: "ministerial_set",
    points: 20,
    dailyCap: 3,
    ar: "مجموعة أسئلة وزارية",
    en: "Ministerial set",
    hintAr: "حل مجموعة وزارية وصححها",
    hintEn: "Solve and grade a ministerial set",
  },
  video_to_notes: {
    action: "video_to_notes",
    points: 10,
    dailyCap: 3,
    ar: "تحويل فيديو إلى ملاحظات",
    en: "Video to notes",
    hintAr: "حوّل محاضرة يوتيوب إلى ملاحظات",
    hintEn: "Turn a YouTube lecture into notes",
  },
  accuracy_bonus: {
    action: "accuracy_bonus",
    points: 10,
    dailyCap: 3,
    ar: "مكافأة الدقة (٨٠٪ فأكثر)",
    en: "Accuracy bonus (80%+)",
    hintAr: "احصل على ٨٠٪ فأكثر في الاختبار",
    hintEn: "Score 80% or higher",
  },
};

/** Streak milestones and their one-time bonuses. */
export const STREAK_BONUSES: { days: number; bonus: number }[] = [
  { days: 3, bonus: 50 },
  { days: 7, bonus: 150 },
  { days: 14, bonus: 400 },
];
