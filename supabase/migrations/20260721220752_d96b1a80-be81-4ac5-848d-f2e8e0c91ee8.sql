CREATE TABLE public.daily_games (
  day smallint PRIMARY KEY CHECK (day BETWEEN 1 AND 31),
  month_key text NOT NULL,
  subject text NOT NULL,
  engine text NOT NULL,
  spec jsonb NOT NULL DEFAULT '{}'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.daily_games TO anon, authenticated;
GRANT ALL ON public.daily_games TO service_role;
ALTER TABLE public.daily_games ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read daily games" ON public.daily_games FOR SELECT USING (true);
CREATE POLICY "Admins manage daily games" ON public.daily_games FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE INDEX IF NOT EXISTS custom_flashcards_subj_ch_appr_idx
  ON public.custom_flashcards (subject, chapter, approved);