
-- 1) Raw payment event log
CREATE TABLE public.payment_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id text UNIQUE,
  event_type text NOT NULL,
  user_id uuid,
  paddle_subscription_id text,
  paddle_customer_id text,
  environment text NOT NULL DEFAULT 'sandbox',
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.payment_events TO authenticated;
GRANT ALL ON public.payment_events TO service_role;

ALTER TABLE public.payment_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own payment events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins view all payment events"
  ON public.payment_events FOR SELECT
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_payment_events_user ON public.payment_events(user_id);
CREATE INDEX idx_payment_events_sub ON public.payment_events(paddle_subscription_id);

-- 2) Premium-aware daily limiter (5 uses / feature / day for free, unlimited for premium)
CREATE OR REPLACE FUNCTION public.claim_daily_feature(_feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _used_count int;
  _daily_limit int := 5;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  -- Owner bypass
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email = 'jokeravenge@gmail.com' THEN
    RETURN true;
  END IF;

  -- Premium bypass (active subscription in either environment)
  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _uid
      AND status IN ('active','trialing','past_due')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  -- Count today's usage for this feature
  SELECT count(*) INTO _used_count
  FROM public.feature_usage
  WHERE user_id = _uid
    AND feature = _feature
    AND used_on = (now() AT TIME ZONE 'utc')::date;

  IF _used_count >= _daily_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.feature_usage (user_id, feature, used_on)
  VALUES (_uid, _feature, (now() AT TIME ZONE 'utc')::date);

  RETURN true;
END;
$$;

-- Drop the obsolete unique constraint that limited usage to 1/day
ALTER TABLE public.feature_usage DROP CONSTRAINT IF EXISTS feature_usage_user_id_feature_used_on_key;

-- Helper to read remaining usage from the client
CREATE OR REPLACE FUNCTION public.feature_usage_today(_feature text)
RETURNS int
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT count(*)::int FROM public.feature_usage
  WHERE user_id = auth.uid()
    AND feature = _feature
    AND used_on = (now() AT TIME ZONE 'utc')::date;
$$;
