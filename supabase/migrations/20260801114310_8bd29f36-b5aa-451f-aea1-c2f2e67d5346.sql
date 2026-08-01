CREATE OR REPLACE FUNCTION public.claim_daily_feature(_feature text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _used_count int;
  _daily_limit int := 5;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email = 'jokeravenge@gmail.com' THEN
    RETURN true;
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.subscriptions
    WHERE user_id = _uid
      AND status IN ('active','trialing','past_due')
      AND (current_period_end IS NULL OR current_period_end > now())
  ) THEN
    RETURN true;
  END IF;

  IF _feature = 'agent' THEN
    RETURN true;
  END IF;

  SELECT count(*) INTO _used_count
  FROM public.feature_usage
  WHERE user_id = _uid
    AND feature = _feature
    AND used_on = (now() AT TIME ZONE 'Asia/Baghdad')::date;

  IF _used_count >= _daily_limit THEN
    RETURN false;
  END IF;

  INSERT INTO public.feature_usage (user_id, feature, used_on)
  VALUES (_uid, _feature, (now() AT TIME ZONE 'Asia/Baghdad')::date);

  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.claim_daily_feature(text) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.claim_daily_feature(text) TO authenticated;

CREATE TABLE IF NOT EXISTS public.request_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feature text NOT NULL,
  requested_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.request_rate_limits TO authenticated;
GRANT ALL ON public.request_rate_limits TO service_role;

ALTER TABLE public.request_rate_limits ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users can view their own rate limit rows" ON public.request_rate_limits;
CREATE POLICY "Users can view their own rate limit rows"
ON public.request_rate_limits FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS request_rate_limits_lookup_idx
  ON public.request_rate_limits (user_id, feature, requested_at DESC);

CREATE OR REPLACE FUNCTION public.check_rate_limit(_feature text, _max_requests int DEFAULT 5, _window_seconds int DEFAULT 60)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _recent int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  DELETE FROM public.request_rate_limits
  WHERE requested_at < now() - interval '1 day';

  SELECT count(*) INTO _recent
  FROM public.request_rate_limits
  WHERE user_id = _uid
    AND feature = _feature
    AND requested_at > now() - make_interval(secs => _window_seconds);

  IF _recent >= _max_requests THEN
    RETURN false;
  END IF;

  INSERT INTO public.request_rate_limits (user_id, feature) VALUES (_uid, _feature);
  RETURN true;
END;
$function$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) FROM anon, public;
GRANT EXECUTE ON FUNCTION public.check_rate_limit(text, int, int) TO authenticated;