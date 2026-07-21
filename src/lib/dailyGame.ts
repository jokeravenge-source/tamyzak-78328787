import { buildBattleMcqs, type BattleMCQ, type BattleSubject } from "@/lib/battleMcqBank";

const SUBJECTS: BattleSubject[] = [
  "physics",
  "chemistry",
  "biology",
  "arabic",
  "english",
  "french",
  "islamic",
];

export type DailyGameKind = "falling" | "match";

/** Baghdad-day index (UTC+3), stable across timezones. */
function baghdadDayIndex(now = new Date()): number {
  const shifted = now.getTime() + 3 * 60 * 60 * 1000;
  return Math.floor(shifted / 86400000);
}

export function todayKey(now = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  const y = shifted.getUTCFullYear();
  const m = String(shifted.getUTCMonth() + 1).padStart(2, "0");
  const d = String(shifted.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function getDailySubject(now = new Date()): BattleSubject {
  return SUBJECTS[baghdadDayIndex(now) % SUBJECTS.length];
}

export function getDailyGameKind(now = new Date()): DailyGameKind {
  return baghdadDayIndex(now) % 2 === 0 ? "falling" : "match";
}

export function getDailySeed(now = new Date()): number {
  return baghdadDayIndex(now) + 101;
}

export function buildDailyPool(count = 8, now = new Date()): {
  subject: BattleSubject;
  kind: DailyGameKind;
  seed: number;
  mcqs: BattleMCQ[];
} {
  const subject = getDailySubject(now);
  const kind = getDailyGameKind(now);
  const seed = getDailySeed(now);
  const mcqs = buildBattleMcqs(subject, count, seed);
  return { subject, kind, seed, mcqs };
}

export const SUBJECT_LABEL: Record<BattleSubject, { en: string; ar: string }> = {
  physics: { en: "Physics", ar: "الفيزياء" },
  chemistry: { en: "Chemistry", ar: "الكيمياء" },
  biology: { en: "Biology", ar: "الأحياء" },
  arabic: { en: "Arabic", ar: "العربية" },
  english: { en: "English", ar: "الإنجليزية" },
  french: { en: "French", ar: "الفرنسية" },
  islamic: { en: "Islamic", ar: "الإسلامية" },
  general: { en: "General", ar: "عام" },
};

export const DAILY_GAME_REF_PREFIX = "daily-game-";