import { supabase } from "@/integrations/supabase/client";
import type { BattleSubject } from "@/lib/battleMcqBank";
import type { DailyGameRow, EngineKey, GameSpec } from "./types";
import { IMPLEMENTED_ENGINES } from "./types";

const SUBJECT_ROTATION: BattleSubject[] = [
  "physics", "chemistry", "biology", "arabic", "english", "french", "islamic",
];

/** Baghdad-time day-of-month (1..31). */
export function baghdadDayOfMonth(now = new Date()): number {
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return shifted.getUTCDate();
}

export function baghdadMonthKey(now = new Date()): string {
  const shifted = new Date(now.getTime() + 3 * 60 * 60 * 1000);
  return `${shifted.getUTCFullYear()}-${String(shifted.getUTCMonth() + 1).padStart(2, "0")}`;
}

/** Deterministic fallback used when the AI-generated manifest has no entry
 *  for today. Keeps the game playable from day one. */
export function fallbackForDay(day: number): { subject: BattleSubject; engine: EngineKey; spec: GameSpec } {
  const subject = SUBJECT_ROTATION[(day - 1) % SUBJECT_ROTATION.length];
  const engine: EngineKey = day % 2 === 0 ? "match" : "falling";
  const spec: GameSpec = {
    engine,
    title: {
      en: engine === "falling" ? "Falling Answers" : "Term Match Blitz",
      ar: engine === "falling" ? "الإجابات المتساقطة" : "مطابقة المصطلحات",
    },
    tutorial: {
      en: engine === "falling"
        ? "Tap the correct answer before it hits the floor."
        : "Match each question with its correct answer.",
      ar: engine === "falling"
        ? "اضغط على الإجابة الصحيحة قبل أن تسقط."
        : "طابق كل سؤال مع إجابته الصحيحة.",
    },
    count: 8,
    timerSec: engine === "match" ? 75 : undefined,
    passThreshold: 0.6,
    theme: {
      gradient: "from-sky-500/20 via-fuchsia-500/10 to-amber-500/10",
      accent: "sky",
      motif: "✨",
    },
  };
  return { subject, engine, spec };
}

/** Load today's entry from the DB, falling back to a deterministic default. */
export async function loadTodayGame(now = new Date()): Promise<DailyGameRow> {
  const day = baghdadDayOfMonth(now);
  const monthKey = baghdadMonthKey(now);
  try {
    const { data } = await supabase
      .from("daily_games")
      .select("*")
      .eq("day", day)
      .eq("month_key", monthKey)
      .maybeSingle();
    if (data) {
      const engine = coerceEngine(String(data.engine));
      const spec = (data.spec ?? {}) as Partial<GameSpec>;
      return {
        day,
        month_key: monthKey,
        subject: (data.subject as BattleSubject) ?? SUBJECT_ROTATION[0],
        engine,
        spec: { ...fallbackForDay(day).spec, ...spec, engine },
      };
    }
  } catch {
    // network / permissions -> fallback
  }
  const fb = fallbackForDay(day);
  return { day, month_key: monthKey, subject: fb.subject, engine: fb.engine, spec: fb.spec };
}

/** If the AI picks an engine we have not yet implemented, degrade to a
 *  shipped one so the day is still playable. */
function coerceEngine(e: string): EngineKey {
  const key = e as EngineKey;
  if (IMPLEMENTED_ENGINES.includes(key)) return key;
  return "falling";
}