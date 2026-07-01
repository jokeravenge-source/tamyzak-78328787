Based on your preference for free AI/practice tools for physics, I recommend adding three focused tools to the Physics subject page. These will reuse existing AI infrastructure (generate-mcq, Lovable AI Gateway) and be marked as free.

## Proposed Physics Tools

### 1. Physics Problem Solver — "حل مسائل الفيزياء"
- What it does: student types or uploads a photo of a physics problem; AI returns a step-by-step Arabic solution, identifies the law used, and plugs values into the formula.
- Fit: reuses the OCR/photo pattern used in Essay/Al-Musahhih and the subject-agent AI response style.
- Edge function: create `solve-physics-problem` that accepts `{ text?, image_url? }` and returns `{ law, variables, steps, answer, unit }`.
- UI: simple form with a textarea, optional image upload, and a "Solve" button. Output is a numbered parchment-style solution card.
- Why it helps: 6th-grade scientific physics is heavy on calculations; this gives instant guided help.

### 2. Physics Quick MCQ — "اختبار الفيزياء السريع"
- What it does: student picks a physics chapter or concept, and the app generates 5–10 physics MCQs with explanations.
- Fit: reuses the existing `generate-mcq` Edge Function, but pre-filters for physics topics and uses the physics chapter list from `subjectChapters.ts`.
- UI: a compact quiz card with a timer, progress bar, and immediate feedback per answer. No file upload needed, unlike the main MCQ tool.
- Why it helps: fast self-testing before class or exams, focused only on physics.

### 3. Physics Laws & Unit Converter — "قوانين ووحدات الفيزياء"
- What it does: two tabs in one tool.
  - Laws tab: searchable cards of common 6th-grade physics laws (speed, density, force, pressure, work, power, Ohm's law, etc.) with formula and a one-line Arabic explanation.
  - Converter tab: converts between units used in physics — km/h ↔ m/s, J ↔ cal, kg ↔ g, C ↔ F, etc.
- Fit: no AI needed; lightweight static data + a small utility. Can be built client-side.
- UI: faceted cards and a clean converter form. Responsive and safe for mobile.
- Why it helps: students often lose marks on unit mistakes; quick reference saves time during homework.

## Integration Plan

1. Add the three choices to `MainMenuChoice` in `src/pages/MainMenu.tsx`:
   - `physicsProblemSolver`
   - `physicsQuickMcq`
   - `physicsLaws`

2. Add the three tools to the Physics subject list in `src/pages/SubjectsHub.tsx`, marked with new icons (e.g., `Calculator`, `Clock`, `Ruler` from lucide-react).

3. Add the new keys to `FREE_TOOLS` in `src/pages/SubjectsHub.tsx` so every user can access them regardless of premium status.

4. Add routing and lazy loading in `src/App.tsx`:
   - `src/pages/PhysicsProblemSolver.tsx`
   - `src/pages/PhysicsQuickMcq.tsx`
   - `src/pages/PhysicsLaws.tsx`

5. Create the `solve-physics-problem` Edge Function for the problem solver (optional image OCR via existing `ocr-images` if needed). The Quick MCQ can reuse `generate-mcq` with a physics prompt prefix. The Laws tool can be fully client-side.

6. Make sure the subject page auto-sets `physics` when launching from the Physics hub, so no subject picker is shown.

## Technical Notes
- All three tools are client-side pages + one new Edge Function, keeping the scope small.
- No schema changes are needed.
- The UI will follow the existing facet/parchment design system and use semantic tokens.
- The tools will be free by default, as requested.

## Suggested Order of Implementation
1. Physics Laws & Unit Converter (fastest, no backend)
2. Physics Quick MCQ (reuses generate-mcq)
3. Physics Problem Solver (new edge function + optional image upload)

If you want to start with fewer tools, I recommend building the Problem Solver first because it has the highest learning value, then the Laws/Converter for quick reference.