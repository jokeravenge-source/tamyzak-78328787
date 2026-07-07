# Activate the Laser Physics course

Right now every course card on Our Courses shows "Coming soon" and the CTA is locked. This plan unlocks only the **Laser** course while leaving the others as "Coming soon", and wires the full learn-flow behind it.

## What the user will see

On the Laser card:

- The CTA changes from "Coming soon" (locked) to **"Open course"** (active gradient button).
- Clicking it opens a full-screen course view listing every exam an admin has uploaded to the `laser` course (from the existing `course_exams` table + `course-exams` storage bucket).
- Each exam row shows: title, upload date, and two buttons — **View exam PDF** (opens a signed URL in a new tab) and **Solve & grade**.
- **Solve & grade** opens a panel with:
  - An "Add answer photos" uploader (multiple images, max 10, 5MB each — same limits as the existing Exam Generator).
  - A "Grade my answers" button.
  - After grading: a result card identical in style to the Exam Generator (total score, overall feedback, strengths, improvements, per-question breakdown), plus the existing **"Not satisfied? Send to a real teacher"** flow that forwards everything to `@soveforcejoin-bot`.

Other courses (Genetics, Organic, Space Geometry, Nuclear) keep their "Coming soon" state unchanged.

## Technical changes

### 1. `src/pages/OurCourses.tsx`
- Add an `active: boolean` field to the `Course` type; set `active: true` only on the `laser` course.
- Replace the locked CTA with a conditional: active courses render an "Open course" button that calls `setOpenCourse(c)`; inactive courses keep the current locked "Coming soon" button.
- Render a new `<CourseRunner course={openCourse} … />` modal when `openCourse` is set.

### 2. New component `CourseRunner` (same file)
- Fetches signed URLs for each exam's `exam_path` and `answer_path` from the `course-exams` bucket via `supabase.storage.from('course-exams').createSignedUrl(path, 3600)`.
- Local state: `selectedExam`, `studentImages: string[]`, `grading`, `gradeResult`, plus the human-grader state (`showHumanForm`, `tgUsername`, `humanReason`, `sendingHuman`, `humanSent`) — mirroring the Exam Generator so we reuse its UX.
- Calls a new edge function `grade-course-exam` (below) for OCR grading, and reuses the existing `send-to-human-grader` function for the "send to a real teacher" button.

### 3. New edge function `supabase/functions/grade-course-exam/index.ts`
- Input: `{ examPath, answerPath, studentImages: string[] (data URLs), language }`.
- Uses `SUPABASE_SERVICE_ROLE_KEY` to download both PDFs from the private `course-exams` bucket, converts each to base64.
- Calls Lovable AI Gateway (`google/gemini-2.5-flash`) with a multimodal message that contains:
  - The exam PDF as a `file` block (`data:application/pdf;base64,...`).
  - The answer-key PDF as a `file` block.
  - Each student image as an `image_url` block.
  - A system prompt reusing the ministerial-grader voice from `grade-ministerial-exam` (100 marks, best 5-of-6, per-question feedback in Arabic/English, JSON response).
- Returns the same JSON shape the current grading UI already renders (`total`, `graded_out_of`, `per_question`, `overall_feedback`, `strengths`, `improvements`), so no result-rendering code needs to change.
- Registered in `supabase/config.toml` with `verify_jwt = false` and gated by the shared `claimFeature(req, "essay")` entitlement (same as `grade-ministerial-exam`).

### 4. `send-to-human-grader` reuse
- No change to the function itself; `CourseRunner` will pass `subject: "Physics — Laser course"` and `chapter: <exam title>` so the grader group sees which course/exam the paper belongs to.

## Files touched

- `src/pages/OurCourses.tsx` — activate laser CTA, add `CourseRunner` component.
- `supabase/functions/grade-course-exam/index.ts` — new.
- `supabase/config.toml` — register the new function.

No database schema changes, no new secrets, no changes to the other four courses.
