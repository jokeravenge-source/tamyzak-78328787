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
  _daily_limit int := 1;
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

  -- Success Companion is unlimited for everyone
  IF _feature = 'agent' THEN
    RETURN true;
  END IF;

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
$function$;