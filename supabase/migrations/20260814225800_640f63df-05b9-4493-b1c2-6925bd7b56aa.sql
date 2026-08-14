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
  _daily_limit int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email = 'jokeravenge@gmail.com' THEN
    RETURN true;
  END IF;

  IF _feature IN ('agent','chat','psych','companion','tutor','subject_tutor') THEN
    _daily_limit := 5;
  ELSE
    _daily_limit := 1;
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

CREATE OR REPLACE FUNCTION public.claim_daily_feature_limit(_feature text, _limit integer DEFAULT 1)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _email text;
  _used_count int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT email INTO _email FROM auth.users WHERE id = _uid;
  IF _email = 'jokeravenge@gmail.com' THEN
    RETURN true;
  END IF;

  SELECT count(*) INTO _used_count
  FROM public.feature_usage
  WHERE user_id = _uid
    AND feature = _feature
    AND used_on = (now() AT TIME ZONE 'Asia/Baghdad')::date;

  IF _used_count >= GREATEST(_limit, 0) THEN
    RETURN false;
  END IF;

  INSERT INTO public.feature_usage (user_id, feature, used_on)
  VALUES (_uid, _feature, (now() AT TIME ZONE 'Asia/Baghdad')::date);

  RETURN true;
END;
$function$;