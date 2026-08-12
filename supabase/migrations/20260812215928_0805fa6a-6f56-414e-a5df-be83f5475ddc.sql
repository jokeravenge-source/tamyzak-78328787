CREATE OR REPLACE FUNCTION public.public_student_profile(_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'user_id', _user_id,
    'display_name', COALESCE((SELECT p.display_name FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1), 'Student'),
    'gender', (SELECT p.gender FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1),
    'character', (SELECT p.character FROM public.profiles p WHERE p.user_id = _user_id LIMIT 1),
    'lifetime_points', COALESCE((SELECT up.lifetime_points FROM public.user_progress up WHERE up.user_id = _user_id), 0),
    'current_streak', COALESCE((SELECT up.current_streak FROM public.user_progress up WHERE up.user_id = _user_id), 0),
    'longest_streak', COALESCE((SELECT up.longest_streak FROM public.user_progress up WHERE up.user_id = _user_id), 0),
    'total_seconds', COALESCE((SELECT SUM(s.duration_seconds) FROM public.study_sessions s WHERE s.user_id = _user_id), 0)
  )
$$;

REVOKE ALL ON FUNCTION public.public_student_profile(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.public_student_profile(uuid) TO authenticated;