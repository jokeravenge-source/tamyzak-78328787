# Problem Generator (مولّد المسائل)

A new standalone AI tool. User uploads a file containing sample problems; AI generates new problems in the same style, subject, difficulty, and language. Problems are shown one-by-one with a "Show solution" reveal (Practice mode). Premium-only.

## User flow

1. From "All Tools" (كل الأدوات) in the nav, user opens **Problem Generator / مولّد المسائل**.
2. Upload area accepts PDF / DOCX / TXT / image (JPG, PNG). Max ~10MB.
3. User picks count: **5 / 10 / 20**.
4. Tap **Generate** → loading state → cards appear.
5. Each card shows one problem; tap **إظهار الحل / Show solution** to reveal the step-by-step answer.
6. Navigation: Previous / Next, progress dots, and a "Regenerate" button to produce a fresh batch from the same file.

## UI

- New page `src/pages/ProblemGenerator.tsx`, styled like `PhysicsProblemSolver.tsx` (semantic theme tokens, rounded cards, motion transitions, RTL-aware).
- Upload block: dashed drop zone + native file input, with filename chip after selection.
- Count selector: 3 pill buttons (5 / 10 / 20).
- Result: a stack of Practice cards with slide-in animation matching the flashcard style; solution reveal is a collapsible section with a subtle divider.
- Sticky bottom mini-bar: `← Previous`  ·  `3 / 10`  ·  `Next →`.
- Premium lock: if not premium, show the same upgrade toast + SPA nav to Premium page used elsewhere.

## Wiring in the app

- Add `problemGenerator` to `MainMenuChoice` and register the page in `src/App.tsx` (lazy-loaded like other pages).
- Add an entry to `BottomGroupNav.tsx` inside the **All Tools** (AI-only) group.
- Register in `SubjectsHub` free/lock logic is not needed since it's not per-subject.

## Backend

New edge function `supabase/functions/generate-similar-problems/index.ts`:

- Auth-gated (Bearer JWT verified via `getClaims`, like other AI functions).
- Calls `claim_daily_feature('problemGenerator')` for entitlement (premium bypasses; free returns 429 with `upgrade: true`).
- Accepts `{ fileBase64, mime, filename, count, language }`.
- Uses Gemini via Lovable AI Gateway with multimodal input:
  - PDF → `type: file` with `file_data: data:<mime>;base64,...`
  - Image → `type: image_url` data URL
  - TXT/DOCX → server-side text extraction (DOCX via `npm:mammoth`), passed as text
- Model: `google/gemini-3-flash-preview` (default), structured output via `Output.object` with a small schema `{ problems: [{ statement, solution }] }` (no length constraints in schema — count enforced in prompt + clamped in code).
- Prompt: "You are given a file of practice problems. Produce N NEW problems in the same subject, style, difficulty, notation, and language as the source. Include a full step-by-step solution for each. Do not repeat the originals."
- Response: `{ problems: [...] }`. Handles 429/402 with clear messages.

## Client integration

- `ProblemGenerator.tsx` invokes the function with `supabase.functions.invoke`.
- Auto-detects language of file name / content for RTL layout (fallback to app language).
- Persists last-generated batch in `localStorage` (`app_problem_gen_last_v1`) so users don't lose progress on reload.
- Uses `handleAiError` from `src/lib/upgradeToast.ts` for the 429 upgrade nudge.

## Access

- **Premium only**, consistent with other AI tools. Gate at both the frontend nav entry (lock badge for free users) and the edge function (`claim_daily_feature` returns false for non-premium on this feature).

## Technical notes

- Reuse existing PDF text extraction helper if present (`src/lib/fileText.ts`); otherwise send the file as base64 to Gemini which reads PDFs directly.
- No new DB tables required.
- No new secrets — uses existing `LOVABLE_API_KEY`.
- Follow existing edge function patterns: CORS headers from `npm:@supabase/supabase-js@2/cors`, Zod validation on body, structured JSON error responses.

## Files to add / edit

- add `src/pages/ProblemGenerator.tsx`
- add `supabase/functions/generate-similar-problems/index.ts`
- edit `src/App.tsx` — lazy route + `MainMenuChoice` union
- edit `src/pages/MainMenu.tsx` (type export) if `MainMenuChoice` lives there
- edit `src/components/BottomGroupNav.tsx` — add to All Tools group
