ALTER TABLE public.active_sessions
  ADD COLUMN IF NOT EXISTS elapsed_seconds integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS is_running boolean NOT NULL DEFAULT false;