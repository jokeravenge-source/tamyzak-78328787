ALTER TABLE public.course_playlists
  ADD COLUMN IF NOT EXISTS kind text NOT NULL DEFAULT 'playlist',
  ADD COLUMN IF NOT EXISTS video_id text;

ALTER TABLE public.course_playlists ALTER COLUMN playlist_id DROP NOT NULL;

ALTER TABLE public.course_playlists
  ADD CONSTRAINT course_playlists_kind_check CHECK (kind IN ('playlist','video')),
  ADD CONSTRAINT course_playlists_target_check CHECK (
    (kind = 'playlist' AND playlist_id IS NOT NULL)
    OR (kind = 'video' AND video_id IS NOT NULL)
  );