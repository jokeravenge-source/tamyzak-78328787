import { supabase } from "@/integrations/supabase/client";

export type PointSource = "summary" | "flashcard" | "mcq" | "essay";

export const POINT_VALUES: Record<PointSource, number> = {
  summary: 5,
  flashcard: 2,
  mcq: 5,
  essay: 5,
};

const SEEN_KEY = "points_seen_ids_v1";

function getSeen(): string[] {
  try { return JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"); } catch { return []; }
}
function markSeen(ids: string[]) {
  const next = Array.from(new Set([...getSeen(), ...ids]));
  localStorage.setItem(SEEN_KEY, JSON.stringify(next));
}

export function showAward(source: PointSource, points: number) {
  window.dispatchEvent(
    new CustomEvent("app:point-award", { detail: { source, points } })
  );
}

/** Insert a point row and show the congratulation card. Safe to call repeatedly — unique constraint dedupes when refId is given. */
export async function awardPoints(source: PointSource, refId?: string) {
  const points = POINT_VALUES[source];
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data, error } = await supabase.rpc("award_points_safe", {
    _source: source,
    _points: points,
    _ref_id: refId ?? null,
  });
  if (error) {
    // server-side validation failed or duplicate — silent
    return;
  }
  if (data) markSeen([data as string]);
  showAward(source, points);
}

/** Check for unseen point awards (e.g. summary approved while offline) and surface them. */
export async function checkUnseenAwards() {
  const { data: u } = await supabase.auth.getUser();
  if (!u.user) return;
  const { data } = await supabase
    .from("user_points")
    .select("id, source, points")
    .eq("user_id", u.user.id)
    .order("created_at", { ascending: true });
  if (!data?.length) return;
  const seen = new Set(getSeen());
  const fresh = data.filter((r) => !seen.has(r.id));
  if (!fresh.length) return;
  markSeen(fresh.map((r) => r.id));
  // Stagger so multiple awards don't collide
  fresh.forEach((r, i) =>
    setTimeout(() => showAward(r.source as PointSource, r.points), i * 1400)
  );
}

export type Rank = { key: "coal" | "copper" | "silver" | "gold" | "diamond" | "royal"; label: { en: string; ar: string }; min: number; color: string };

export const RANKS: Rank[] = [
  { key: "coal",    label: { en: "Coal",    ar: "فحم" },    min: 0,   color: "#6b7280" },
  { key: "copper",  label: { en: "Copper",  ar: "نحاس" },   min: 100, color: "#b87333" },
  { key: "silver",  label: { en: "Silver",  ar: "فضي" },    min: 200, color: "#94a3b8" },
  { key: "gold",    label: { en: "Gold",    ar: "ذهبي" },   min: 300, color: "#f59e0b" },
  { key: "diamond", label: { en: "Diamond", ar: "ماسي" },   min: 400, color: "#22d3ee" },
  { key: "royal",   label: { en: "Royal",   ar: "ملكي" },   min: 500, color: "#a78bfa" },
];

export function rankFor(points: number): Rank {
  let cur = RANKS[0];
  for (const r of RANKS) if (points >= r.min) cur = r;
  return cur;
}