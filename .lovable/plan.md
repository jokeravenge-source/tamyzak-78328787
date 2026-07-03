# Expand Subject Tools

Add a large set of new study tools to every subject in `src/pages/SubjectsHub.tsx`. Each new tool routes through the existing `MainMenuChoice` dispatch in `src/App.tsx` and reuses existing infrastructure (AI Gateway edge functions, flashcards engine, MCQ engine, etc.). Free tier stays the same; new tools default to Premium-locked via the existing `FREE_TOOLS` set.

## New tools per subject

Each tool below is a new entry in the subject's `tools` array with an icon, EN/AR label, and a `MainMenuChoice` key. Tools marked **(reuse)** wire to an existing page with a preset subject; tools marked **(new page)** need a lightweight new route + page component.

### Physics
- Formula Sheet **(new page)** — searchable chapter-indexed formulas
- Unit Converter **(new page)** — SI ↔ common units
- Concept Explainer **(reuse SubjectTutor preset)**
- Past Paper Solver **(reuse PhysicsProblemSolver preset)**
- Diagram Reader **(new page)** — upload circuit/diagram, AI explains
- Mistake Journal **(new page)** — log wrong answers, spaced review

### Chemistry
- Periodic Table **(new page)** — interactive element info
- Reaction Balancer **(new page)** — AI balances equations
- Nomenclature Trainer **(new page)** — IUPAC naming drills
- Lab Safety Cards **(reuse flashcards preset)**
- Quick MCQ **(reuse generic MCQ preset)**
- Molar Mass Calculator **(new page)**

### Biology
- Anatomy Explorer **(new page)** — labeled body-system diagrams
- Term Glossary **(reuse flashcards preset)**
- Life-Cycle Diagrams **(reuse BiologyDrawings preset)**
- Quick MCQ **(reuse)**
- Case Study Analyzer **(reuse SubjectTutor preset)**
- Mnemonics Pack **(new page)**

### English
- Grammar Drills **(new page)** — tenses, articles, prepositions
- Vocabulary Builder **(reuse flashcards preset)**
- Reading Comprehension **(new page)** — AI passage + questions
- Pronunciation Coach **(reuse tts-speak)**
- Writing Feedback **(reuse Essay preset)**
- Idioms & Phrasal Verbs **(reuse flashcards preset)**

### French
- Conjugation Trainer **(new page)** — verbs across tenses
- Dictée (Dictation) **(new page)** — TTS + typed answer check
- Grammar Rules **(reuse flashcards preset)**
- Reading Passages **(new page)**
- Translation Practice **(reuse SubjectTutor preset)**
- Pronunciation Coach **(reuse tts-speak)**

### Arabic
- Grammar (النحو) Drills **(new page)**
- Balaghah Cards **(reuse flashcards preset)**
- Diacritics (تشكيل) Trainer **(new page)** — AI adds/checks tashkeel
- Poetry Meter Analyzer **(reuse PoemsChecker)**
- Composition Feedback **(reuse Essay preset)**
- Word Roots Explorer **(new page)**

### Islamic
- Tajweed Rules **(reuse flashcards preset)**
- Hadith Explorer **(reuse HadithChecker)**
- Fiqh Q&A **(reuse SubjectTutor preset)**
- Seerah Timeline **(new page)**
- Duaa Memorizer **(reuse flashcards preset)**
- Surah Audio Player **(reuse IslamicSurahs)**

### Revision (new subject card)
- Full Exam Simulator **(new page)** — timed mixed MCQ
- Weakness Report **(new page)** — analyzes wrong answers
- Spaced Repetition Queue **(new page)**
- Cheatsheet Generator **(reuse ai-notes-generate)**

## Technical section

1. **`src/pages/MainMenu.tsx`** — extend `MainMenuChoice` union with all new keys (e.g. `physicsFormulaSheet`, `chemPeriodicTable`, `frenchConjugation`, `revisionExamSim`, …).
2. **`src/pages/SubjectsHub.tsx`** — add tool entries in each subject's `tools` array; add the `revision` subject entry.
3. **`src/App.tsx`** — for each new key, either:
   - Map to an existing page component with a subject preset (via `localStorage.app_subject_v1`), or
   - Lazy-import a new placeholder page under `src/pages/` that renders a "Coming soon" scaffold using the existing card/tutor patterns so nothing breaks.
4. **New page scaffolds** (minimal, consistent styling) for the "(new page)" tools listed above. Each is a single-file page reusing shadcn components; AI-backed ones call existing edge functions where possible (`subject-agent`, `generate-mcq`, `ai-notes-generate`, `tts-speak`) — no new edge functions in this pass.
5. **Free vs Premium** — leave `FREE_TOOLS` unchanged so new tools are Premium-locked by default (matches current behavior).
6. No backend/schema changes.

## Out of scope
- New edge functions or DB tables
- Full implementations of every new page (scaffolds only; can be fleshed out in follow-ups)
- Design system changes

Confirm and I'll build it. If you'd rather I fully implement a subset (say, pick 2 subjects to build end-to-end now), tell me which.