# Tamyzak Redesign — The Facet System

A focused redesign that builds the entire visual language around the rank metaphor (Coal → Royal). One bold move (the faceted rank stone), everything else disciplined and quiet.

## 1. Design tokens (foundation)

Rewrite `src/index.css` and `tailwind.config.ts` with the new token system:

- Colors (HSL): `--ink 230 19% 9%`, `--parchment 40 30% 93%`, `--ember 35 80% 57%`, `--ash 230 6% 57%`, plus existing `--physics / --chemistry / --biology` kept exact.
- Map shadcn semantics: `--background = ink`, `--foreground = parchment`, `--card = parchment` (dark-on-light in cards, light-on-dark in shell), `--primary = ember` (used sparingly — see rule below).
- Typography: load Cairo + IBM Plex Sans Arabic + Space Grotesk + Inter + JetBrains Mono via `<link>` in `index.html`. Add Tailwind font families: `font-display-ar`, `font-display`, `font-body-ar`, `font-body`, `font-mono` (JetBrains).
- Radius: drop global rounding to `--radius: 2px`. Add a utility `clip-facet` that uses `clip-path: polygon(...)` to cut a single top-end corner (logical, mirrors in RTL).
- Ember rule: enforce by convention — only `Rank`, `Streak`, `Points`, `Achievement` components import the ember utility classes.

## 2. The Facet Stone component (signature)

New `src/components/RankStone.tsx` — reusable faceted SVG with six material variants:

```text
Coal     → matte dark gradient, rough edges
Copper   → warm copper gradient + soft specular
Silver   → cool brushed gradient + sharp highlight
Gold     → warm gold gradient + ember rim
Diamond  → clear facets, refraction streaks, white sparkle
Royal    → multi-facet, ember-gold inner glow (animated)
```

Props: `rank`, `size`, `fillProgress` (0–1 for streak fill creeping up through facets), `animateRankUp` (one-shot Framer Motion sequence).

Reused at different scales in: Home dashboard (hero), Leaderboard rank markers, Live Battle (player + opponent), Achievement unlock modal, notification badge (mini facet polygon, not a circle).

## 3. Bidirectional layout (structural)

- Audit and replace `left/right`, `ml-/mr-`, `pl-/pr-` with `start/end` logical equivalents (`ms-`, `me-`, `ps-`, `pe-`, `start-0`, `end-0`).
- Set `dir` at the `<html>` level from `LanguageGate`; remove ad-hoc `dir="rtl"` overrides where logical props now handle it.
- Facet clip-path uses `inset-inline-start` math so the cut corner mirrors with language.

## 4. Key screens

**Home Dashboard (`src/pages/Basics.tsx`)**
- Hero = RankStone (large, leading edge) + streak count in JetBrains Mono next to it, ember accent. No headline, no CTA.
- Quiet search bar below the stone.
- Subject tool cards: parchment surface, one beveled corner, subject color as a 2px inline-start edge + icon tint only. No full-bleed color blocks.
- Streak tree + To-Do generate button move into secondary row, low contrast.

**Study Session (`src/pages/Sessions.tsx`)**
- Full-bleed ink background, remove most chrome.
- Timer: JetBrains Mono, very large, parchment color.
- Hourly "Continue" prompt: single faceted ember button, centered, nothing else on screen.
- To-Do dropdown collapses to thin strip at bottom.

**Flashcards (`src/components/Flashcard.tsx`, `src/pages/Index.tsx`)**
- Real 3D flip (already partly there — confirm `transform-style: preserve-3d`, smooth rotateY).
- Subject color as accent edge only (keep current subject palette overrides).
- Chapter progress as a horizontal row of small facet polygons that fill, replacing the percentage bar.

**Live Battle (`src/pages/LiveBattle.tsx`)**
- Countdown: huge JetBrains Mono numerals.
- Two RankStones mirrored across the screen (yours on the inline-start, opponent on inline-end).
- Correct answer triggers a facet-of-light pulse on your stone — the win moment.
- Loud 15s/25s timer ring.

**Daily Report + Parent Follow-Up (`src/pages/DailyReport.tsx`, `src/pages/ParentFollow.tsx`)**
- Parchment background, ink text, JetBrains Mono numerals.
- No facet decoration; calm, legible, trust-first.

**Leaderboard (`src/pages/Leaderboard.tsx`)**
- Each row's rank marker = mini RankStone in the correct material.
- Top-3 stones slightly larger.

**Bottom nav (`src/components/CurvedNavBar.tsx`)**
- Keep sticky portal behavior. Active tab indicator becomes a small facet shape instead of the rounded pill.

## 5. Motion

- One orchestrated rank-up sequence in `RankStone` — stone re-cuts, ember light spreads. Triggered from a new `useRankUpAnimation` hook listening on a `rank-up` window event (mirrors the existing `app:point-award` pattern).
- Everywhere else: hover = subtle facet-edge highlight (border-color shift), no scale/bounce.
- All animations gated by `@media (prefers-reduced-motion: reduce)`.

## 6. Copy voice

Sweep the most visible buttons/empty states in `Basics`, `Sessions`, `Index`, `TodoList` to match the voice spec ("ابدأ الجلسة / Start session", "جارية / In progress", "لا توجد بطاقات بعد — أنشئ أول بطاقة"). Not a full app-wide copy rewrite — just the surfaces a student hits daily.

## Out of scope (this pass)

- No backend changes, no new edge functions, no schema work.
- No re-skin of admin dashboard, premium/Paddle flow, or onboarding companion internals — only their entry surfaces inherit the new tokens automatically.
- No new illustrations beyond the RankStone variants (existing subject theme art stays).

## Technical notes

- Tokens land first (CSS + Tailwind), so every screen picks up the new palette/typography immediately even before per-screen passes.
- `RankStone` ships as a single file with the six material variants as inline `<defs>` gradients — no extra assets.
- Logical-property migration is mechanical; do it screen-by-screen as each is touched, not as one giant sweep.
- Keep all existing functionality, routes, points logic, Supabase calls untouched.
