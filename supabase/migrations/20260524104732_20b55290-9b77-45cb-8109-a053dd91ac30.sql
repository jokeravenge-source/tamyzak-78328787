
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TABLE public.telegram_verifications (
  user_id uuid NOT NULL PRIMARY KEY,
  token text NOT NULL UNIQUE,
  telegram_user_id bigint,
  telegram_username text,
  verified boolean NOT NULL DEFAULT false,
  last_checked_at timestamptz,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_telegram_verifications_token ON public.telegram_verifications(token);
CREATE INDEX idx_telegram_verifications_tg_user ON public.telegram_verifications(telegram_user_id);

ALTER TABLE public.telegram_verifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own telegram verification"
  ON public.telegram_verifications FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_telegram_verifications_updated_at
  BEFORE UPDATE ON public.telegram_verifications
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.telegram_verifications;
ALTER TABLE public.telegram_verifications REPLICA IDENTITY FULL;
