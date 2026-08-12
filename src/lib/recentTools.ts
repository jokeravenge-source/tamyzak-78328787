const KEY = "recent_tools_v1";
const MAX = 8;

export function getRecentTools(): string[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || "[]");
    return Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : [];
  } catch {
    return [];
  }
}

export function recordToolUse(key: string) {
  try {
    const next = [key, ...getRecentTools().filter((k) => k !== key)].slice(0, MAX);
    localStorage.setItem(KEY, JSON.stringify(next));
    window.dispatchEvent(new CustomEvent("app:recent-tools-updated"));
  } catch {
    /* storage unavailable — recents are a nicety, not critical */
  }
}