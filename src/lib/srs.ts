import { supabase } from "@/integrations/supabase/client";
import type { Flashcard } from "@/data/flashcards";

/**
 * Lightweight SM-2 style spaced repetition for flashcards.
 * Reviews sync to `flashcard_reviews` for signed-in students and fall back
 * to localStorage for guests, so the queue always works offline/logged out.
 */

export type SrsRating = "forgot" | "hard" | "good" | "easy";

export interface SrsState {
  cardKey: string;
  ease: number;
  intervalDays: number;
  reps: number;
  lapses: number;
  lastRating: SrsRating | null;
  dueAt: number; // epoch ms
}

const LOCAL_KEY = "srs_reviews_v1";
const MIN_EASE = 1.3;
const MAX_EASE = 2.8;
const MAX_INTERVAL = 120;
const DAY = 86_400_000;

/** Stable identity for a card — question text is the natural key. */
export function cardKey(subject: string, chapter: string, question: string): string {
  const norm = question.replace(/\s+/g, " ").trim().slice(0, 180);
  return `${subject}:${chapter}:${norm}`;
}

export function defaultState(key: string): SrsState {
  return { cardKey: key, ease: 2.5, intervalDays: 0, reps: 0, lapses: 0, lastRating: null, dueAt: 0 };
}

export function isDue(s: SrsState | undefined, now = Date.now()): boolean {
  return !s || s.dueAt <= now;
}

/** Pure scheduler — returns the next state for a rating. */
export function schedule(prev: SrsState, rating: SrsRating, now = Date.now()): SrsState {
  let { ease, intervalDays, reps, lapses } = prev;

  if (rating === "forgot") {
    ease = Math.max(MIN_EASE, ease - 0.25);
    lapses += 1;
    reps = 0;
    intervalDays = 0;
    return { ...prev, ease, intervalDays, reps, lapses, lastRating: rating, dueAt: now + 10 * 60_000 };
  }

  reps += 1;
  if (rating === "hard") {
    ease = Math.max(MIN_EASE, ease - 0.15);
    intervalDays = intervalDays <= 0 ? 1 : Math.max(1, intervalDays * 1.2);
  } else if (rating === "good") {
    intervalDays = intervalDays <= 0 ? 1 : intervalDays === 1 ? 3 : intervalDays * ease;
  } else {
    ease = Math.min(MAX_EASE, ease + 0.15);
    intervalDays = intervalDays <= 0 ? 3 : intervalDays * ease * 1.3;
  }
  intervalDays = Math.min(MAX_INTERVAL, Math.round(intervalDays * 10) / 10);

  return { ...prev, ease, intervalDays, reps, lapses, lastRating: rating, dueAt: now + intervalDays * DAY };
}

/** Human label for the interval a rating would produce. */
export function previewInterval(prev: SrsState, rating: SrsRating, language: "ar" | "en"): string {
  const next = schedule(prev, rating);
  if (rating === "forgot") return language === "ar" ? "10 د" : "10m";
  const d = next.intervalDays;
  if (d < 1) return language === "ar" ? "اليوم" : "today";
  if (d < 30) return language === "ar" ? `${Math.round(d)} ي` : `${Math.round(d)}d`;
  return language === "ar" ? `${Math.round(d / 30)} ش` : `${Math.round(d / 30)}mo`;
}

/* ---------------- local storage fallback ---------------- */

type LocalMap = Record<string, SrsState>;

function readLocal(): LocalMap {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_KEY) || "{}") as LocalMap;
  } catch {
    return {};
  }
}

function writeLocal(map: LocalMap) {
  try {
    localStorage.setItem(LOCAL_KEY, JSON.stringify(map));
  } catch {
    /* quota — ignore */
  }
}

/* ---------------- data access ---------------- */

async function uid(): Promise<string | null> {
  const { data } = await supabase.auth.getUser();
  return data.user?.id ?? null;
}

/** Load review states for one deck (subject + chapter). */
export async function loadDeckStates(subject: string, chapter: string): Promise<Map<string, SrsState>> {
  const out = new Map<string, SrsState>();
  const local = readLocal();
  Object.values(local).forEach((s) => {
    if (s.cardKey.startsWith(`${subject}:${chapter}:`)) out.set(s.cardKey, s);
  });

  const user = await uid();
  if (!user) return out;

  const { data } = await supabase
    .from("flashcard_reviews")
    .select("card_key, ease, interval_days, reps, lapses, last_rating, due_at")
    .eq("user_id", user)
    .eq("subject", subject)
    .eq("chapter", chapter);

  (data ?? []).forEach((r) => {
    out.set(r.card_key, {
      cardKey: r.card_key,
      ease: Number(r.ease),
      intervalDays: Number(r.interval_days),
      reps: r.reps,
      lapses: r.lapses,
      lastRating: (r.last_rating as SrsRating | null) ?? null,
      dueAt: new Date(r.due_at).getTime(),
    });
  });
  return out;
}

/** Rate a card and persist the new schedule. Returns the new state. */
export async function rateCard(opts: {
  subject: string;
  chapter: string;
  language: "ar" | "en";
  card: Flashcard;
  rating: SrsRating;
  prev?: SrsState;
}): Promise<SrsState> {
  const key = cardKey(opts.subject, opts.chapter, opts.card.q);
  const prev = opts.prev ?? defaultState(key);
  const next = schedule({ ...prev, cardKey: key }, opts.rating);

  const local = readLocal();
  local[key] = next;
  writeLocal(local);

  const user = await uid();
  if (user) {
    await supabase.from("flashcard_reviews").upsert(
      {
        user_id: user,
        card_key: key,
        subject: opts.subject,
        chapter: String(opts.chapter),
        question: opts.card.q,
        answer: opts.card.a,
        language: opts.language,
        ease: next.ease,
        interval_days: next.intervalDays,
        reps: next.reps,
        lapses: next.lapses,
        last_rating: next.lastRating,
        last_reviewed_at: new Date().toISOString(),
        due_at: new Date(next.dueAt).toISOString(),
      },
      { onConflict: "user_id,card_key" },
    );
  }
  return next;
}

/** Total number of cards due right now across every deck the student has studied. */
export async function totalDueCount(): Promise<number> {
  const now = Date.now();
  const local = readLocal();
  const localDue = Object.values(local).filter((s) => s.dueAt <= now).length;

  const user = await uid();
  if (!user) return localDue;

  const { count } = await supabase
    .from("flashcard_reviews")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user)
    .lte("due_at", new Date(now).toISOString());
  return count ?? localDue;
}

/** Cards the student has repeatedly failed — the "leech" / weak-points list. */
export type DueGroup = { subject: string; chapter: string; count: number };

/** Due cards grouped by subject + chapter, so the student knows what is waiting. */
export async function dueBreakdown(limit = 4): Promise<DueGroup[]> {
  const now = Date.now();
  const map = new Map<string, DueGroup>();
  const add = (subject: string, chapter: string) => {
    const key = `${subject}|${chapter}`;
    const g = map.get(key) ?? { subject, chapter, count: 0 };
    g.count += 1;
    map.set(key, g);
  };

  Object.values(readLocal()).forEach((s) => {
    if (s.dueAt > now) return;
    const [subject, chapter] = s.cardKey.split(":");
    if (subject) add(subject, chapter ?? "");
  });

  const user = await uid();
  if (user) {
    const { data } = await supabase
      .from("flashcard_reviews")
      .select("subject, chapter")
      .eq("user_id", user)
      .lte("due_at", new Date(now).toISOString());
    if (data?.length) {
      map.clear();
      data.forEach((r) => add(r.subject, String(r.chapter ?? "")));
    }
  }

  return Array.from(map.values()).sort((a, b) => b.count - a.count).slice(0, limit);
}

export async function loadLeeches(limit = 20) {
  const user = await uid();
  if (!user) return [];
  const { data } = await supabase
    .from("flashcard_reviews")
    .select("card_key, subject, chapter, question, answer, lapses")
    .eq("user_id", user)
    .gte("lapses", 3)
    .order("lapses", { ascending: false })
    .limit(limit);
  return data ?? [];
}
