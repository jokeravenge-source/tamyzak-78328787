
## Overview

Add a new **الدورات (Courses)** section. First course = **French**. Videos are hosted on **Bunny Stream**. Each course has **chapters** (what you called "divisions") — a named group that owns a list of lecture videos. Access is by **manual enrollment**. A new **teacher** role can manage a specific course. We track both **opened** and **% watched** per student per video.

## Secrets to add (Bunny Stream)

Requested via `add_secret`:
- `BUNNY_STREAM_API_KEY` — Bunny Stream account API key (used server-side to create videos and issue upload URLs).
- `BUNNY_STREAM_LIBRARY_ID` — Video Library ID.
- `BUNNY_STREAM_CDN_HOSTNAME` — e.g. `vz-xxxxxx.b-cdn.net` (for playback iframe / HLS URL).

## Database (one migration)

New enum + tables in `public`:

- `course_role` enum: `teacher`.
- `courses` — `id`, `slug` (unique, e.g. `french`), `title_ar`, `title_en`, `description_ar/en`, `cover_url`, `is_published`.
- `course_teachers` — `course_id`, `user_id` (unique pair). Grants teacher rights on that course.
- `course_enrollments` — `course_id`, `user_id`, `enrolled_at`, `enrolled_by`. Unique pair. Manual only.
- `course_chapters` — `course_id`, `title`, `sort_order`. (These are your "divisions".)
- `course_videos` — `chapter_id`, `title`, `description`, `duration_sec`, `bunny_video_guid`, `bunny_library_id`, `thumbnail_url`, `sort_order`, `is_published`, `created_by`.
- `course_video_views` — `video_id`, `user_id`, `opened_at`, `last_seen_at`, `max_percent` (0–100), `completed` (bool, derived when max_percent ≥ 90). Unique (`video_id`, `user_id`).

Helper security-definer functions:
- `is_course_teacher(_course uuid)` — returns true if `auth.uid()` is in `course_teachers` for `_course` OR is a global `admin` via existing `has_role`.
- `is_course_enrolled(_course uuid)` — true if user has active row in `course_enrollments`.

RLS (with matching `GRANT SELECT/INSERT/UPDATE/DELETE ... TO authenticated` and `GRANT ALL ... TO service_role`):
- `courses`: SELECT to authenticated (only `is_published` unless teacher/admin). Write: teacher/admin.
- `course_teachers`: read by teacher/admin; write by admin only.
- `course_enrollments`: user can read own rows; teacher/admin can read/write for their course.
- `course_chapters`, `course_videos`: read requires `is_course_enrolled` (or teacher/admin) AND `is_published`. Write: teacher/admin.
- `course_video_views`: user can insert/update own row; teacher/admin can read all rows for videos in their course.

Seed row: one `courses` row with slug `french`.

## Edge functions

All three use standard CORS + JWT verified in-code, and require `is_course_teacher` (checked server-side) except the tracking one.

1. `bunny-create-video` — teacher-only. Body: `{ chapter_id, title }`. Calls Bunny `POST /library/{lib}/videos` to create a video, inserts a `course_videos` row (unpublished), and returns `{ video_id, bunny_guid, upload_url, upload_headers }` where `upload_url` = `https://video.bunnycdn.com/library/{lib}/videos/{guid}` and headers include `AccessKey`. Client uploads the file directly to Bunny (PUT).
2. `bunny-finalize-video` — teacher-only. Body: `{ video_id }`. Fetches metadata from Bunny (`GET /library/{lib}/videos/{guid}`) to store `duration_sec` and `thumbnail_url`, sets `is_published = true`.
3. `course-track-view` — enrolled-user-only. Body: `{ video_id, percent }`. Upserts `course_video_views`: sets `opened_at` on first call, updates `last_seen_at`, keeps `max_percent = greatest(old, new)`, sets `completed = true` when ≥ 90.

Playback uses Bunny's iframe embed: `https://iframe.mediadelivery.net/embed/{lib}/{guid}` — no server call needed. Library must be set to "public" or "token-auth"; for v1 we go with public embed + our RLS gating who sees the GUID.

## Frontend

New pages under `src/pages/`:

- `Courses.tsx` — `/courses`. Grid of published courses the user is enrolled in (plus a locked card for others). Card → course detail.
- `CourseDetail.tsx` — `/courses/:slug`. Lists chapters as accordions; each chapter shows its videos with title, duration, watched % badge. Click → player.
- `CoursePlayer.tsx` — `/courses/:slug/v/:videoId`. Renders Bunny iframe, pings `course-track-view` on load (open) and every ~15 s / on `pagehide` with current percent (using the iframe player.js postMessage API — falls back to just "opened" if postMessage unavailable).
- `CourseAdmin.tsx` — `/admin/courses/:slug`. Only rendered if `is_course_teacher`. Three tabs:
  - **Students**: count + searchable table of enrolled users, add/remove by email.
  - **Chapters**: create/rename/reorder/delete chapters.
  - **Videos**: per chapter — upload new video (title input → calls `bunny-create-video`, uploads file to returned URL with progress bar, calls `bunny-finalize-video`), rename, delete, reorder, and a "Viewers" popover per video showing every enrolled user + their `max_percent` / opened status.

Nav integration:
- Add a new **"الدورات / Courses"** group to `BottomGroupNav.tsx` (Icon: `GraduationCap`) with the single item `courses` for now. Register `courses` as a `MainMenuChoice` in `MainMenu.tsx` and route it to `Courses.tsx`. Add routes in `App.tsx`.
- Teacher admin entry point: link on `Courses.tsx` course card ("Manage") shown only if `is_course_teacher` (checked via `course_teachers` select).

Styling reuses existing semantic tokens (`bg-card`, `text-foreground`, `text-primary`, etc.) so it matches the user's theme, per the ParentFollow refactor precedent.

## Defaults chosen

- Upload cap: 2 GB per video, mp4/mov/webm. Direct PUT to Bunny (no tus for v1).
- "Completed" threshold: 90 % watched.
- Only global admins can appoint teachers (via a small "Teachers" section inside `CourseAdmin.tsx` visible to admins only).

## Out of scope for this pass

- Per-user Bunny token-signed playback URLs (can be added later if piracy becomes a concern).
- Quizzes, comments, certificates.
- Additional courses beyond French (schema already supports them; just insert rows).

## Technical notes

- Bunny Stream REST base: `https://video.bunnycdn.com` with header `AccessKey: {BUNNY_STREAM_API_KEY}`.
- We never expose `BUNNY_STREAM_API_KEY` to the client; only the per-upload URL + `AccessKey` header value is returned, scoped to that single video PUT (Bunny doesn't offer scoped upload keys, so we accept this — teacher-only endpoint mitigates risk).
- All new `public` tables ship with GRANTs in the same migration per project rules.
