import { supabase } from "@/integrations/supabase/client";
import { buildBattleMcqs, type BattleSubject, type BattleMCQ } from "@/lib/battleMcqBank";
import type { NormalizedCard } from "./types";

/** Best-effort Ch1 pool. Prefers admin-uploaded flashcards for
 *  (subject, chapter=1). Falls back to the curated battle bank so the game
 *  never breaks when no admin content exists yet. */
export async function buildCh1Pool(subject: BattleSubject, count: number, seed: number): Promise<NormalizedCard[]> {
  const admin = await loadAdminFlashcards(subject, 1);
  if (admin.length >= 6) {
    // Use admin cards but synthesize distractors from other admin cards' answers.
    return admin.slice(0, count).map((c, i) => ({
      q: c.q,
      correct: c.correct,
      distractors: pickDistractors(admin, i, c.correct, 3),
    }));
  }
  const bank = buildBattleMcqs(subject, count, seed);
  return bank.map(fromBattle);
}

function fromBattle(m: BattleMCQ): NormalizedCard {
  const correct = m.choices[m.answer];
  return {
    q: m.q,
    correct,
    distractors: m.choices.filter((_, i) => i !== m.answer),
  };
}

async function loadAdminFlashcards(
  subject: BattleSubject,
  chapter: number,
): Promise<{ q: string; correct: string }[]> {
  // Try common encodings of "chapter 1" so we match whatever admins typed.
  const chapterCandidates = [String(chapter), `ch${chapter}`, `Ch${chapter}`, `chapter ${chapter}`, `Chapter ${chapter}`];
  const { data, error } = await supabase
    .from("custom_flashcards")
    .select("question, answer, chapter")
    .eq("subject", subject)
    .eq("approved", true)
    .in("chapter", chapterCandidates)
    .limit(64);
  if (error || !data) return [];
  return data.map((r) => ({ q: r.question, correct: r.answer }));
}

function pickDistractors(pool: { correct: string }[], selfIdx: number, exclude: string, n: number): string[] {
  const others = pool
    .map((c, i) => ({ v: c.correct, i }))
    .filter((x) => x.i !== selfIdx && x.v !== exclude);
  // deterministic shuffle by selfIdx
  const shuffled = others.sort((a, b) => ((a.i * 7 + selfIdx) % 13) - ((b.i * 7 + selfIdx) % 13));
  const out: string[] = [];
  for (const x of shuffled) {
    if (out.length >= n) break;
    if (!out.includes(x.v)) out.push(x.v);
  }
  // If we still don't have enough, pad with generic markers
  while (out.length < n) out.push("—");
  return out;
}

/** Convert normalized cards back into the shape the existing engines expect. */
export function toBattleShape(cards: NormalizedCard[], subject: BattleSubject): BattleMCQ[] {
  return cards.map((c) => {
    const choices = [c.correct, ...c.distractors].slice(0, 4);
    // shuffle deterministically per prompt
    const seed = hash(c.q);
    const idxs = [0, 1, 2, 3].sort((a, b) => ((a + seed) % 7) - ((b + seed) % 7));
    const shuffled = idxs.map((i) => choices[i] ?? "—");
    const answer = shuffled.indexOf(c.correct);
    return { q: c.q, choices: shuffled, answer: answer < 0 ? 0 : answer, subject };
  });
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = ((h << 5) - h + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}