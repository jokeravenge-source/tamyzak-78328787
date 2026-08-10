DROP POLICY IF EXISTS "Users update own attempt" ON public.challenge_attempts;
CREATE UNIQUE INDEX IF NOT EXISTS challenge_attempts_one_per_user ON public.challenge_attempts (challenge_id, user_id);