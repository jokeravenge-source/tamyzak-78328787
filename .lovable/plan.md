# Daily Game — 30 unique mechanisms for Ch1

## Goal
For every day of the month (1–30), the Daily Game shows a **distinct 2D mini-game** whose mechanic and content are tailored to that day's subject and Chapter 1 flashcards. Content prefers admin-uploaded flashcards for that subject+chapter, falls back to the curated `battleMcqBank` Ch1 items.

## How the "different every day" promise is delivered

Building 30 fully bespoke game engines in code is not realistic and would ship shallow, broken games. Instead:

1. **~8 solid 2D game engines** are hand-built as React components (reliable, tested, mobile-friendly).
2. **A real AI (Lovable AI Gateway, `google/gemini-3.1-pro-preview`) designs 30 game instances** — one per day — by receiving that day's subject, chapter=1, and the flashcard list, then returning a strict JSON spec: which engine to use, difficulty, timers, distractor style, visual theme (palette, background motif, character), win condition, tutorial copy in AR/EN.
3. Each day's spec is stored in a manifest committed to the repo (`src/lib/dailyGames/manifest.json`). The runtime loads day N, picks the engine, and skins/parameterizes it from the spec — so no two consecutive days look, feel, or play the same.

This is what the user meant by "ask Claude to design a 2D game then copy the instructions and apply it" — I do the AI call at build time, save the design, and the runtime executes it.

## The 8 base engines (all touch + mouse)

1. **Falling Answers** — choices fall, tap the right one before it hits the floor.
2. **Term Match Blitz** — 2D pair-matching against a timer.
3. **Memory Flip** — flip tiles to pair term↔definition.
4. **Bubble Pop** — bubbles carry answers; pop only the correct ones.
5. **Lane Sort** — drag flashcards into the right bin (e.g. metal / non-metal).
6. **Path Doors** — walk a lane, pick the correct door each round.
7. **Word Cannon** — aim & shoot the correct term at a moving target.
8. **Reveal Grid** — pixel/tile grid uncovers as you answer; wrong = obscures.

Every engine reads the same `GameSpec` shape, so a single spec can drive any of them, and the AI can freely pick per day.

## Content pipeline (Ch1)

`buildCh1Pool(subject)`:
1. Query `custom_flashcards` where `subject = ? AND chapter = 1 AND approved = true` (add `chapter` column if missing).
2. If < 8 usable items, fall back to `battleMcqBank` Ch1 for that subject.
3. Normalize to `{ prompt, correct, distractors[] }`.

## Build-time AI generator

`scripts/generate-daily-games.ts` (run once per month, or when Ch1 flashcards change):
- For each day 1–30, resolve subject (existing rotation) and load Ch1 pool.
- Call Lovable AI Gateway with a strict `Output.object` schema requiring `{ engineKey, theme, difficulty, timing, rules, tutorial, winCondition }`.
- Persist to `src/lib/dailyGames/manifest.json` and commit.

I'll wire this as a callable edge function (`generate-daily-games`) so the owner can regenerate from the Admin panel with a single click — no shell needed.

## Runtime

`src/pages/DailyGame.tsx` becomes a thin router:
- Read today's day-of-month → look up manifest entry → load Ch1 pool → mount matching engine with the spec.
- Show a 3-slide tutorial (from spec) before play.
- Reward: keep the existing 5-point award on ≥60% correct, deduped per day.

## Delivery in stages

This is genuinely multi-turn. I'll implement in this order, one PR-sized turn each:

**Turn 1 (this turn)**: Foundation
- `GameSpec` type + shared engine contract.
- Ch1 pool builder (admin + bank fallback), plus a `chapter` column on `custom_flashcards`.
- Edge function `generate-daily-games` that calls the AI and produces the 30-entry manifest.
- Empty manifest committed; runtime skeleton in `DailyGame.tsx` that reads the manifest.
- Two engines fully working: **Falling Answers** and **Term Match Blitz** (already in the app; refactored to accept `GameSpec`).
- Admin button "Regenerate 30 games" in the Admin dashboard.

**Turn 2**: Engines 3–5 (Memory Flip, Bubble Pop, Lane Sort).

**Turn 3**: Engines 6–8 (Path Doors, Word Cannon, Reveal Grid) + polish, sound, transitions.

After Turn 1, running "Regenerate 30 games" already produces a full 30-day manifest; days that reference not-yet-built engines fall back to the two shipped ones so the game is never broken.

## Technical notes

- Schema for `custom_flashcards`: add `chapter smallint` if missing, index on `(subject, chapter, approved)`.
- AI call uses `generateText` + `Output.object` with a small strict schema (no bounds), guarded with `NoObjectGeneratedError` fallback (per `ai-sdk-lovable-gateway`).
- Manifest is a plain JSON file bundled with the app — no runtime AI on the student's request path.
- Day-of-month uses Baghdad time (matches the existing rotation).
- Ties into existing points system via `award_points_safe('mcq', 5, 'daily-game-YYYY-MM-DD')`.

## Confirm to start Turn 1

Reply "go" and I'll ship the foundation + Falling Answers + Term Match Blitz + the AI generator this turn.
