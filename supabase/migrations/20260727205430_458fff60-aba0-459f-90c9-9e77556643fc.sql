
-- Polls
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.polls TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.polls TO authenticated;
GRANT ALL ON public.polls TO service_role;
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;
CREATE POLICY "polls read all" ON public.polls FOR SELECT USING (true);
CREATE POLICY "polls admin insert" ON public.polls FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "polls admin update" ON public.polls FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "polls admin delete" ON public.polls FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER polls_set_updated_at BEFORE UPDATE ON public.polls FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Poll options
CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  image_path text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.poll_options TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.poll_options TO authenticated;
GRANT ALL ON public.poll_options TO service_role;
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_options read all" ON public.poll_options FOR SELECT USING (true);
CREATE POLICY "poll_options admin insert" ON public.poll_options FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "poll_options admin update" ON public.poll_options FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "poll_options admin delete" ON public.poll_options FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE INDEX poll_options_poll_id_idx ON public.poll_options(poll_id);

-- Poll votes
CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(poll_id, user_id)
);
GRANT SELECT ON public.poll_votes TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.poll_votes TO authenticated;
GRANT ALL ON public.poll_votes TO service_role;
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "poll_votes read all" ON public.poll_votes FOR SELECT USING (true);
CREATE POLICY "poll_votes insert own" ON public.poll_votes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "poll_votes update own" ON public.poll_votes FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "poll_votes delete own" ON public.poll_votes FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE INDEX poll_votes_poll_id_idx ON public.poll_votes(poll_id);

-- Storage policies for polls bucket (public read, admin write)
CREATE POLICY "polls bucket public read" ON storage.objects FOR SELECT USING (bucket_id = 'polls');
CREATE POLICY "polls bucket admin insert" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'polls' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "polls bucket admin update" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'polls' AND public.has_role(auth.uid(), 'admin'));
CREATE POLICY "polls bucket admin delete" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'polls' AND public.has_role(auth.uid(), 'admin'));
