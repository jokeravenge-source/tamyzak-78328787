## Goal

1. Stop forcing the Noir & Gold palette globally — restore the original Cloud White default theme so the user's settings choice (Light / Dark / Sepia / Slate / Forest / Rose / Nord / Noir & Gold) is respected everywhere.
2. Keep the new layout language (Syne headings, Plus Jakarta body, bento sections, progress ring, brass-edged Live Battle banner) but rebuild every screen using **semantic design tokens** (`bg-background`, `text-foreground`, `bg-card`, `border-border`, `text-primary`, `bg-muted`, …) so the same UI naturally restyles itself when the user picks any theme.

## Steps

### 1. Restore theme system
- `src/index.css`: revert the `:root` block back to the original Cloud White token values. Keep the Syne / Plus Jakarta font stack changes (those work for every theme).
- Add a brand-new `.theme-noir-gold` class with the brass tokens, so users who want Noir & Gold can opt in from Settings instead of it being forced.
- `src/pages/Settings.tsx` (or wherever the theme switcher lives): add "Noir & Gold" as a selectable theme option alongside the existing ones.

### 2. De-hardcode the dashboard
- `src/pages/Basics.tsx`: replace every literal hex (`#0d0d0d`, `#1a1a1a`, `#c9a84c`, `#f0d78c`, `bg-white`, `text-white`, etc.) inside the dashboard branch with semantic tokens:
  - canvas wrapper → `bg-background text-foreground`
  - bento cards → `bg-card border-border text-card-foreground`
  - progress ring stroke → `stroke-primary` with `stroke-muted` track
  - gold accents → `text-primary` / `bg-primary/10` / `border-primary/30`
  - Live Battle banner → `bg-gradient-to-r from-primary to-primary-glow` outer + `bg-background` inner
  - brass aura → `bg-[radial-gradient(circle,hsl(var(--primary)/0.10),transparent)]`
- Remove the negative-margin full-bleed wrapper so the page sits inside the regular `<main>` background.

### 3. Apply the new layout language to the other top-level screens
For each page below, keep current functionality and componentry; restructure the outer shell into the same bento style as the dashboard, using only semantic tokens so it inherits whichever theme the user picked:

- `src/pages/Sessions.tsx`
- `src/pages/TodoList.tsx`
- `src/pages/DailyReport.tsx`
- `src/pages/Notes.tsx`
- `src/pages/SubjectsHub.tsx`
- `src/pages/YoutubePlayer.tsx`
- `src/pages/LiveBattle.tsx`
- `src/pages/OrganicEquations.tsx`
- `src/pages/VideoNotes.tsx`
- `src/pages/Canvas.tsx`
- `src/pages/ParentFollow.tsx`
- `src/pages/Settings.tsx`

Per page:
- Add a Syne page header (title + subtitle + a streak/stat chip when relevant).
- Wrap primary content in 12-col bento (`grid grid-cols-12 gap-5`) with `rounded-3xl bg-card border border-border p-6` panels.
- Use `text-primary` for highlights, brass-style gradient borders only on the page's hero CTA (e.g. "Start session", "Join battle", "Generate notes") via `bg-gradient-to-r from-primary to-primary-glow p-[1px]` wrappers.
- Lean on Plus Jakarta for body copy through the global `body` font; force Syne only on `h1`–`h4`.

### 4. Verify
- Cycle through every theme from Settings and confirm the dashboard + each redesigned page recolors cleanly (no white-on-white, no invisible brass-on-cream).
- Confirm Noir & Gold is no longer the default but is available as a choice.

## Technical notes

- The `<main>` shell in each page typically already uses `bg-background`. The fix is to remove any hardcoded `bg-white`, `text-black`, or hex values inside the page body and replace them with shadcn tokens defined in `src/index.css`.
- Sidebar / bottom nav already consume `--sidebar-*` tokens; no further change needed once those tokens are theme-driven again.
- Avoid editing `src/integrations/supabase/*`, `.env`, and `supabase/config.toml`.

## Out of scope

- No backend, schema, or RLS changes.
- No new pages or features — only visual restructuring of existing ones.
