
CREATE TABLE IF NOT EXISTS public.mission_progress (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  subject TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, topic_key)
);

ALTER TABLE public.mission_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own mission progress"
  ON public.mission_progress FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users insert own mission progress"
  ON public.mission_progress FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own mission progress"
  ON public.mission_progress FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own mission progress"
  ON public.mission_progress FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS mission_progress_user_idx ON public.mission_progress(user_id);
