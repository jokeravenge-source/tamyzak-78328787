// Small localStorage cache keyed by the Baghdad (UTC+3) calendar day.
// Used for expensive, low-churn reads (points totals, leaderboard) so they are
// fetched once per day per device instead of on every focus/poll.
export function baghdadDayKey(d: Date = new Date()): string {
  const b = new Date(d.getTime() + 3 * 3600 * 1000);
  return `${b.getUTCFullYear()}-${String(b.getUTCMonth() + 1).padStart(2, "0")}-${String(b.getUTCDate()).padStart(2, "0")}`;
}

export function readDaily<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(`daily_cache_v1:${key}`);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as { day: string; value: T };
    if (parsed.day !== baghdadDayKey()) return null;
    return parsed.value;
  } catch {
    return null;
  }
}

export function writeDaily<T>(key: string, value: T) {
  try {
    localStorage.setItem(`daily_cache_v1:${key}`, JSON.stringify({ day: baghdadDayKey(), value }));
  } catch {
    /* quota / private mode — cache is best-effort */
  }
}
