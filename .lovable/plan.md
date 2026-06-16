## Goal

Turn the app into a coach-and-report study system:
1. A **follow-up link** so a parent can watch the student's progress live.
2. A **daily study report** with AI insights (strengths, weaknesses, tomorrow's plan).
3. A short **onboarding** that captures exam date + target grade to drive pacing, the daily target, and the AI's advice.

---

## 1. Onboarding — data we collect from the student

Shown once after signup (and editable later from Account Center):

- **Exam date** (date picker, required)
- **Target grade / target average** (number 0–100, required)
- **Track / grade level** (scientific / literary / etc. — uses existing subject set)
- **Weekly study hours goal** (slider, e.g. 5–40h)
- **Preferred daily study window** (morning / afternoon / evening — for reminder copy)
- **Weak subjects** (multi-select from the existing subject list — seeds priorities)
- **Parent follow-up** (optional): parent name + how they'll follow (link only, no parent account needed at first)

Stored on a new `student_profile` row, one per user.

---

## 2. Enhanced progress system

We already track: `study_sessions`, `mission_progress`, `user_points`, `summaries`, `feature_usage`. We add a derived **daily snapshot** so reports are cheap and historical:

- `study_day_stats` (one row per user per day): total focused minutes, sessions count, missions completed, points earned, subjects touched, longest streak that day, target-minutes hit (yes/no).
- Filled by a tiny scheduled job (pg_cron) at 23:55 user-UTC, and on-demand when the report is opened.
- Student dashboard gets:
  - Countdown to exam, % of target weekly hours done, current rank, current streak.
  - Per-subject progress bar (missions done vs total) + last-7-days focus minutes chart.
  - "Today's recommended next mission" — picked from weakest subject with lowest mission completion.

---

## 3. Daily report (the headline feature)

A new page **`/report`** ("تقريري اليومي"):

- Header: date, focused minutes vs daily target, streak, points earned today.
- Sections:
  1. **What you did** — sessions list, missions ticked, summaries/MCQ/essays completed.
  2. **By subject** — minutes + missions per subject for today and the 7-day trend.
  3. **AI Coach insights** (Lovable AI, `google/gemini-3-flash-preview`):
     - 2–3 sentence summary in the user's language (AR/EN).
     - Strengths (what improved vs last 7 days).
     - Weaknesses (subjects below pace for the exam date).
     - **Plan for tomorrow**: 3 concrete tasks tied to existing missions / tools (e.g. "Finish chapter 2 flashcards in Biology", "Write a 150-word essay on …").
  4. **On-track meter** for the exam: needed daily minutes to hit the target grade by the exam date, vs current 7-day average.
- "Send to my parent" button — pushes the same report to the parent follow-up view.

Generated on-demand (cached for the day) so we don't burn credits.

---

## 4. Parent follow-up system

Lightweight, no parent signup required at launch:

- Student enables follow-up → we generate a **share token** (unguessable URL): `/follow/:token`.
- Student can copy the link or share via WhatsApp/Telegram.
- The follow page (read-only, no auth) shows:
  - Student display name, current rank, exam countdown.
  - Today's focused minutes vs target, streak, weekly hours vs goal.
  - The **AI daily summary** (sanitized — no personal data beyond display name).
  - 7-day focus chart and subject progress bars.
- Student can revoke the token any time (Account Center → Follow-up).
- Optional later: parent enters email to get a daily email digest (uses existing email infra) — flagged as v2, not built now.

---

## 5. Technical layout

```text
DB (new)
  student_profile       one row per user (exam_date, target_grade, weekly_goal_hours, study_window, weak_subjects[])
  study_day_stats       one row per user per day (derived metrics)
  parent_follow_links   token, user_id, enabled, created_at, revoked_at
  daily_reports         user_id, report_date, ai_summary, ai_strengths, ai_weaknesses, ai_plan[], generated_at  (cache)

Edge functions
  generate-daily-report   pulls stats + history, calls Lovable AI, stores cached row, returns JSON
  parent-follow-view      public-readable, token -> sanitized snapshot (no PII beyond display name)
  rollup-day-stats        scheduled (pg_cron) nightly, also callable on demand

Pages
  /onboarding             first-time wizard (3 short steps)
  /report                 student daily report
  /follow/:token          parent read-only view
  AccountCenter additions: edit goals, manage follow-up link
  MainMenu addition: "تقريري اليومي" card + exam countdown chip
```

RLS: `student_profile`, `study_day_stats`, `daily_reports` scoped to `auth.uid()`. `parent_follow_links` readable only by owner; the parent page goes through the edge function so the token check stays server-side and no row is exposed via the Data API.

AI: Lovable AI Gateway, `google/gemini-3-flash-preview`, structured output (summary, strengths[], weaknesses[], plan[]). Prompt receives last 7 days of `study_day_stats`, the student's goals, exam countdown, and weakest subjects.

---

## Suggestions for the "best study system"

These are the highest-leverage additions I'd recommend on top of the above — call out which you want included now vs later:

1. **Adaptive daily target**: instead of a flat goal, compute "minutes needed today" from (target grade gap × days to exam ÷ remaining missions). Keeps pressure realistic.
2. **Spaced repetition on flashcards**: surface cards the student got wrong 1d / 3d / 7d ago — huge retention win, reuses existing flashcard data.
3. **Weekly review on Friday**: same engine as the daily report but covering the week, with a "promise for next week" the student commits to.
4. **Focus streak protection**: one "freeze day" per week so a single off-day doesn't kill motivation.
5. **Parent weekly email digest** (v2): one email/week to the parent instead of asking them to open the link.

---

## Build order (if approved)

1. Migrations: `student_profile`, `study_day_stats`, `parent_follow_links`, `daily_reports` + RLS + GRANTs.
2. Onboarding wizard + Account Center "Goals" tab.
3. `rollup-day-stats` edge function + nightly cron + on-demand call.
4. `/report` page with stats sections (no AI yet).
5. `generate-daily-report` edge function (Lovable AI, structured output) + caching.
6. Parent follow-up: token table, share UI, `parent-follow-view` edge function, `/follow/:token` page.
7. MainMenu surfaces (exam countdown chip + "Daily report" card).

---

## Open questions before I build

- Should the parent link be **public read-only by token** (easiest, no parent signup) or require the parent to enter an access code first?
- For onboarding, do you want it **forced on next login** for existing users, or only shown via a banner they can dismiss?
- Should I include suggestions 1–4 above (adaptive target, spaced repetition, weekly review, streak freeze) in this build, or ship the core system first and add them after?
