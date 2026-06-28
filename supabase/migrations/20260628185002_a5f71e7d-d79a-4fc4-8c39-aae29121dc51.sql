CREATE OR REPLACE FUNCTION public.award_points_safe(_source text, _points integer, _ref_id text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  _uid uuid := auth.uid();
  _cap integer;
  _final integer;
  _new_id uuid;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  _cap := CASE _source
    WHEN 'summary'     THEN 5
    WHEN 'flashcard'   THEN 2
    WHEN 'mcq'         THEN 5
    WHEN 'essay'       THEN 5
    WHEN 'session'     THEN 120
    WHEN 'live_battle' THEN 100
    ELSE NULL
  END;

  IF _cap IS NULL THEN
    RAISE EXCEPTION 'invalid source: %', _source;
  END IF;

  IF _points IS NULL OR _points <= 0 THEN
    RETURN NULL;
  END IF;

  _final := LEAST(_points, _cap);

  INSERT INTO public.user_points (user_id, source, points, ref_id)
  VALUES (_uid, _source, _final, _ref_id)
  ON CONFLICT (user_id, source, ref_id) WHERE ref_id IS NOT NULL DO NOTHING
  RETURNING id INTO _new_id;

  RETURN _new_id;
END;
$function$;