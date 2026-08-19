CREATE OR REPLACE FUNCTION public.answer_mcq_bank(_question_id uuid, _choice_index integer)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _correct integer;
  _explanation text;
  _ref text;
  _is_correct boolean;
  _already boolean;
  _delta integer := 0;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT answer_index, explanation INTO _correct, _explanation
  FROM public.mcq_banks WHERE id = _question_id;

  IF _correct IS NULL THEN
    RAISE EXCEPTION 'question not found';
  END IF;

  _is_correct := (_choice_index = _correct);
  _ref := 'mcqbank:' || _question_id::text;

  SELECT EXISTS (
    SELECT 1 FROM public.user_points
    WHERE user_id = _uid AND source = 'mcq' AND ref_id = _ref
  ) INTO _already;

  IF NOT _already THEN
    _delta := CASE WHEN _is_correct THEN 5 ELSE -5 END;
    INSERT INTO public.user_points (user_id, source, points, ref_id)
    VALUES (_uid, 'mcq', _delta, _ref)
    ON CONFLICT (user_id, source, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;

    IF NOT _is_correct THEN
      UPDATE public.user_progress
      SET lifetime_points = GREATEST(0, lifetime_points - 5), updated_at = now()
      WHERE user_id = _uid;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'correct', _is_correct,
    'answer_index', _correct,
    'explanation', _explanation,
    'points', CASE WHEN _already THEN 0 ELSE _delta END,
    'already_answered', _already
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.answer_mcq_bank(uuid, integer) TO authenticated;