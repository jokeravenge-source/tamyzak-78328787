CREATE OR REPLACE FUNCTION public.admin_points_overview(_limit integer DEFAULT 50)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'total_points', (SELECT COALESCE(sum(points),0)::bigint FROM public.user_points),
    'total_entries', (SELECT count(*)::bigint FROM public.user_points),
    'points_today', (SELECT COALESCE(sum(points),0)::bigint FROM public.user_points
                      WHERE (created_at AT TIME ZONE 'Asia/Baghdad')::date = (now() AT TIME ZONE 'Asia/Baghdad')::date),
    'points_week', (SELECT COALESCE(sum(points),0)::bigint FROM public.user_points WHERE created_at >= now() - interval '7 days'),
    'by_source', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', s.source, 'points', s.pts, 'entries', s.cnt, 'users', s.usr) ORDER BY s.pts DESC), '[]'::jsonb)
      FROM (
        SELECT source, sum(points)::bigint AS pts, count(*)::bigint AS cnt, count(DISTINCT user_id)::bigint AS usr
        FROM public.user_points GROUP BY source
      ) s),
    'by_day', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('day', d.day, 'points', d.pts) ORDER BY d.day), '[]'::jsonb)
      FROM (
        SELECT (created_at AT TIME ZONE 'Asia/Baghdad')::date AS day, sum(points)::bigint AS pts
        FROM public.user_points WHERE created_at >= now() - interval '30 days'
        GROUP BY 1
      ) d),
    'top_users', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object(
          'user_id', t.user_id, 'points', t.pts, 'entries', t.cnt,
          'display_name', COALESCE(p.display_name, 'Student'), 'email', u.email
        ) ORDER BY t.pts DESC), '[]'::jsonb)
      FROM (
        SELECT user_id, sum(points)::bigint AS pts, count(*)::bigint AS cnt
        FROM public.user_points GROUP BY user_id ORDER BY 2 DESC LIMIT GREATEST(_limit,1)
      ) t
      LEFT JOIN public.profiles p ON p.user_id = t.user_id
      LEFT JOIN auth.users u ON u.id = t.user_id)
  ) INTO res;

  RETURN res;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_points_user_detail(_user_id uuid, _limit integer DEFAULT 200)
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  SELECT jsonb_build_object(
    'user_id', _user_id,
    'display_name', COALESCE((SELECT display_name FROM public.profiles WHERE user_id = _user_id LIMIT 1), 'Student'),
    'email', (SELECT email FROM auth.users WHERE id = _user_id),
    'lifetime_points', COALESCE((SELECT lifetime_points FROM public.user_progress WHERE user_id = _user_id), 0),
    'sum_points', COALESCE((SELECT sum(points)::bigint FROM public.user_points WHERE user_id = _user_id), 0),
    'by_source', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('source', source, 'points', pts, 'entries', cnt) ORDER BY pts DESC), '[]'::jsonb)
      FROM (SELECT source, sum(points)::bigint AS pts, count(*)::bigint AS cnt
            FROM public.user_points WHERE user_id = _user_id GROUP BY source) s),
    'entries', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('id', id, 'source', source, 'points', points, 'ref_id', ref_id, 'created_at', created_at) ORDER BY created_at DESC), '[]'::jsonb)
      FROM (SELECT id, source, points, ref_id, created_at FROM public.user_points
            WHERE user_id = _user_id ORDER BY created_at DESC LIMIT GREATEST(_limit,1)) e)
  ) INTO res;

  RETURN res;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_grant_points(_user_id uuid, _points integer, _reason text DEFAULT NULL)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE _new_id uuid;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _points IS NULL OR _points = 0 OR abs(_points) > 5000 THEN
    RAISE EXCEPTION 'invalid points amount';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM auth.users WHERE id = _user_id) THEN
    RAISE EXCEPTION 'user not found';
  END IF;

  INSERT INTO public.user_points (user_id, source, points, ref_id)
  VALUES (_user_id, 'admin_grant', _points,
          'admin:' || auth.uid()::text || ':' || COALESCE(NULLIF(trim(_reason), ''), 'manual') || ':' || gen_random_uuid()::text)
  RETURNING id INTO _new_id;

  IF _points < 0 THEN
    UPDATE public.user_progress
      SET lifetime_points = GREATEST(0, lifetime_points + _points), updated_at = now()
      WHERE user_id = _user_id;
  END IF;

  RETURN jsonb_build_object('ok', true, 'id', _new_id,
    'lifetime_points', COALESCE((SELECT lifetime_points FROM public.user_progress WHERE user_id = _user_id), 0));
END;
$$;