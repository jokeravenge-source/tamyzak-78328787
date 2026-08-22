import { supabase } from "@/integrations/supabase/client";

/** Local mirror of the streak. The server (`user_progress.current_streak`) is the
 * source of truth — the local copy only keeps the UI instant on cold start and
 * is always reconciled upward with the server value. */
export const STREAK_KEY = "streak_state_v1";

export type LocalStreak = { days: number; lastDate: string; celebrated?: boolean };

export function readLocalStreak(): LocalStreak {
  try {
    const raw = localStorage.getItem(STREAK_KEY);
    if (raw) {
      const p = JSON.parse(raw) as LocalStreak;
      return { days: p.days ?? 0, lastDate: p.lastDate ?? "", celebrated: p.celebrated };
    }
  } catch { /* ignore */ }
  return { days: 0, lastDate: "", celebrated: false };
}

export function writeLocalStreak(next: LocalStreak) {
  try { localStorage.setItem(STREAK_KEY, JSON.stringify(next)); } catch { /* ignore */ }
}

/** Fetch the authoritative streak from the backend and sync it into the local
 * mirror. Returns null when signed out / offline so callers keep the local value. */
export async function fetchServerStreak(): Promise<number | null> {
  try {
    const { data: u } = await supabase.auth.getUser();
    if (!u.user) return null;
    const { data, error } = await supabase
      .from("user_progress")
      .select("current_streak, last_active_date")
      .eq("user_id", u.user.id)
      .maybeSingle();
    if (error || !data) return null;
    const days = data.current_streak ?? 0;
    const prev = readLocalStreak();
    if (days !== prev.days || (data.last_active_date && data.last_active_date !== prev.lastDate)) {
      writeLocalStreak({
        days,
        lastDate: data.last_active_date ?? prev.lastDate,
        celebrated: prev.celebrated && days >= 20,
      });
      window.dispatchEvent(new CustomEvent("app:streak-synced", { detail: { days } }));
    }
    return days;
  } catch {
    return null;
  }
}
