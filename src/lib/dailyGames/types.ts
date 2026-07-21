import type { BattleSubject } from "@/lib/battleMcqBank";

/** Engines that the runtime can render. Add a new key here + a component in
 *  DailyGame.tsx's engine registry to expand what the AI can generate. */
export type EngineKey = "falling" | "match" | "memory" | "bubblePop" | "laneSort" | "pathDoors" | "wordCannon" | "revealGrid";

export const ALL_ENGINES: EngineKey[] = [
  "falling", "match", "memory", "bubblePop", "laneSort", "pathDoors", "wordCannon", "revealGrid",
];

/** Engines that already ship a working component in the runtime. Others
 *  fall back to one of these until they are implemented. */
export const IMPLEMENTED_ENGINES: EngineKey[] = ["falling", "match"];

export type GameTheme = {
  /** Tailwind gradient utility body, e.g. "from-sky-500/20 via-fuchsia-500/10 to-amber-500/10" */
  gradient?: string;
  /** Accent tailwind color name, e.g. "sky", "emerald", "amber" */
  accent?: string;
  /** Emoji/motif shown in header, e.g. "⚛️" */
  motif?: string;
};

export type GameSpec = {
  engine: EngineKey;
  /** Copy shown before the round starts. */
  title: { ar: string; en: string };
  tutorial: { ar: string; en: string };
  /** How many flashcards to consume. Runtime clamps to what the pool has. */
  count: number;
  /** Seconds for time-based engines (match, bubblePop…). */
  timerSec?: number;
  /** Fraction (0..1) of correct answers required to award today's points. */
  passThreshold: number;
  theme: GameTheme;
};

export type DailyGameRow = {
  day: number;
  month_key: string;
  subject: BattleSubject;
  engine: EngineKey;
  spec: GameSpec;
};

export type NormalizedCard = {
  q: string;
  correct: string;
  distractors: string[];
};