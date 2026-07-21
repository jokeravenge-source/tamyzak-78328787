## Daily Game — "لعبة اليوم"

A once-a-day playable 2D mini-game. The subject rotates automatically across the 7 sadis subjects, and every question inside the game is pulled from the existing curated banks in `src/lib/battleMcqBank.ts` (physics, chemistry, biology, arabic, english, french, islamic) — so content stays strictly sadis-specific, no AI, no general knowledge.

### Daily rotation
- Deterministic by date: `subjectOfDay = SUBJECTS[dayIndex % 7]` where `dayIndex = floor((today - epoch) / 1day)`.
- Same subject for everyone on the same calendar day (Baghdad time), so it feels like a shared daily.
- A seeded RNG (`seed = YYYYMMDD`) picks the question set from that subject's pool — same set for all users that day, different set next day.

### The 3 mini-games (one is picked per day, also seeded)

All are 2D, arcade-feel, touch + mouse, built in React + Tailwind (no new deps). Each round uses ~8 items from that day's pool.

1. **Falling Answers** (default for MCQ-style items)
   - The question sits at the top. Four labeled bubbles fall from above at increasing speed.
   - Tap/click the correct bubble before it hits the floor. Wrong tap or miss = life lost (3 lives).
   - Next question spawns on hit. Combo multiplier for consecutive correct hits.

2. **Answer Catcher**
   - A basket at the bottom the user drags left/right. Words drop from the top; catch only the ones that answer the current question, dodge the distractors.
   - Good for terminology-heavy subjects (arabic, islamic, biology terms).

3. **Term Match Blitz**
   - 2×N grid of tiles: half are questions, half are answers, shuffled.
   - Tap two tiles to match a Q with its A. Correct pair fades with sparkle; wrong pair flashes red. Timer counts down.

Game choice per day: `games[dayIndex % 3]`, but skip a game if the subject's pool can't feed it (fallback to Falling Answers).

### Scoring (points only, no streak, no leaderboard)
- +1 in-game point per correct action, combo x2 / x3 for 3+ / 5+ streak inside the round.
- At round end: if the user scored ≥ 60% of max, award **5 app points** via existing `awardPoints("mcq", refId)` where `refId = "daily-game-YYYY-MM-DD"` — the unique constraint on `user_points` already prevents double-claim per day.
- Below 60%: no points, "Try again tomorrow" screen. User can replay for fun but cannot re-earn.

### Entry point
- New card on `MainMenu` titled **"لعبة اليوم / Daily Game"** with today's subject label and a "Play" CTA. Card shows a green "✓ تم اللعب اليوم" state once the day's award has been claimed (checked via `user_points` where `source='mcq' AND ref_id LIKE 'daily-game-%'`).
- Route: `/daily-game` in `src/App.tsx`.

### Technical section
- New file `src/lib/dailyGame.ts`: exports `getDailySubject()`, `getDailyGameKind()`, `getDailySeed()`, and `buildDailyPool(subject, seed)` that reuses the same `isMcqFriendly`/pool filtering already in `battleMcqBank.ts` to produce ~8 QA items with 3 on-topic distractors each.
- New page `src/pages/DailyGame.tsx`: shell that reads today's subject/kind, renders the picked mini-game component, tracks score, and calls `awardPoints` at the end.
- New components under `src/components/dailyGame/`:
  - `FallingAnswers.tsx`
  - `AnswerCatcher.tsx`
  - `TermMatch.tsx`
  - `GameHUD.tsx` (lives, score, combo, timer)
- No new DB tables. Uses existing `user_points` + `award_points_safe` RPC for the per-day dedupe.
- Language: uses the app's current language flag (already present in the codebase) to show questions in AR or EN where the pool has both; falls back to whatever the QA entry contains.
- Guest mode: hidden from guests (they still only see Teachers).
