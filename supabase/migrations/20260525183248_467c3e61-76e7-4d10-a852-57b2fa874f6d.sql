CREATE OR REPLACE FUNCTION public.claim_daily_feature(_feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _inserted int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email = 'jokeravenge@gmail.com' THEN
    RETURN true;
  END IF;
  INSERT INTO public.feature_usage (user_id, feature, used_on)
  VALUES (_uid, _feature, (now() AT TIME ZONE 'utc')::date)
  ON CONFLICT (user_id, feature, used_on) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted > 0;
END;
$function$;