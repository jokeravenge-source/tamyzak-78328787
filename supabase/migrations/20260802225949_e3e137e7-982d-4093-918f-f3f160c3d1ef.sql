
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TABLE public.challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  language text NOT NULL DEFAULT 'ar',
  status text NOT NULL DEFAULT 'draft',
  seconds_per_question integer NOT NULL DEFAULT 15,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  question text NOT NULL,
  choices jsonb NOT NULL,
  answer_index integer NOT NULL,
  explanation text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.challenge_attempts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id uuid NOT NULL REFERENCES public.challenges(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Student',
  correct_count integer NOT NULL DEFAULT 0,
  total_count integer NOT NULL DEFAULT 0,
  total_ms integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (challenge_id, user_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenges TO authenticated;
GRANT ALL ON public.challenges TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_questions TO authenticated;
GRANT ALL ON public.challenge_questions TO service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.challenge_attempts TO authenticated;
GRANT ALL ON public.challenge_attempts TO service_role;

ALTER TABLE public.challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_questions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.challenge_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Published challenges are viewable" ON public.challenges
  FOR SELECT TO authenticated
  USING (status = 'published' OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage challenges" ON public.challenges
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Questions of published challenges are viewable" ON public.challenge_questions
  FOR SELECT TO authenticated
  USING (
    public.has_role(auth.uid(), 'admin')
    OR EXISTS (SELECT 1 FROM public.challenges c WHERE c.id = challenge_id AND c.status = 'published')
  );

CREATE POLICY "Admins manage challenge questions" ON public.challenge_questions
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Attempts are viewable by authenticated" ON public.challenge_attempts
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users insert own attempt" ON public.challenge_attempts
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update own attempt" ON public.challenge_attempts
  FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete attempts" ON public.challenge_attempts
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_challenges_updated_at BEFORE UPDATE ON public.challenges
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_challenge_questions_updated_at BEFORE UPDATE ON public.challenge_questions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_challenge_attempts_updated_at BEFORE UPDATE ON public.challenge_attempts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX idx_challenge_questions_challenge ON public.challenge_questions(challenge_id, sort_order);
CREATE INDEX idx_challenge_attempts_board ON public.challenge_attempts(challenge_id, correct_count DESC, total_ms ASC);
