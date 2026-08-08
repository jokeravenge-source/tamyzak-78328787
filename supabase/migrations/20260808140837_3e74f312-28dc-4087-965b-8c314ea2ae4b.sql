-- 1) signup source on profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS source text;

-- 2) events table
CREATE TABLE IF NOT EXISTS public.events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  event_name text NOT NULL,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.events TO authenticated;
GRANT ALL ON public.events TO service_role;

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert their own events"
ON public.events FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users read their own events"
ON public.events FOR SELECT TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins read all events"
ON public.events FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX IF NOT EXISTS events_created_at_idx ON public.events (created_at DESC);
CREATE INDEX IF NOT EXISTS events_user_created_idx ON public.events (user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS events_name_created_idx ON public.events (event_name, created_at DESC);

-- 3) admin analytics functions
CREATE OR REPLACE FUNCTION public.admin_analytics_overview()
RETURNS jsonb
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH act AS (
    SELECT user_id, created_at FROM public.events
    UNION ALL
    SELECT user_id, created_at FROM public.study_sessions
  ),
  u AS (SELECT id, created_at FROM auth.users)
  SELECT jsonb_build_object(
    'total_users', (SELECT count(*) FROM u),
    'new_today', (SELECT count(*) FROM u WHERE created_at >= date_trunc('day', now())),
    'new_week', (SELECT count(*) FROM u WHERE created_at >= now() - interval '7 days'),
    'new_month', (SELECT count(*) FROM u WHERE created_at >= now() - interval '30 days'),
    'dau', (SELECT count(DISTINCT user_id) FROM act WHERE created_at >= now() - interval '1 day'),
    'wau', (SELECT count(DISTINCT user_id) FROM act WHERE created_at >= now() - interval '7 days'),
    'mau', (SELECT count(DISTINCT user_id) FROM act WHERE created_at >= now() - interval '30 days'),
    'events_total', (SELECT count(*) FROM public.events),
    'tracking_started_at', (SELECT min(created_at) FROM public.events),
    'd1', (
      SELECT round(100.0 * count(*) FILTER (WHERE ret) / GREATEST(count(*), 1), 1) FROM (
        SELECT EXISTS (SELECT 1 FROM act a WHERE a.user_id = u.id
          AND a.created_at >= u.created_at + interval '1 day'
          AND a.created_at < u.created_at + interval '2 days') AS ret
        FROM u WHERE u.created_at < now() - interval '2 days'
      ) s),
    'd7', (
      SELECT round(100.0 * count(*) FILTER (WHERE ret) / GREATEST(count(*), 1), 1) FROM (
        SELECT EXISTS (SELECT 1 FROM act a WHERE a.user_id = u.id
          AND a.created_at >= u.created_at + interval '6 days'
          AND a.created_at < u.created_at + interval '8 days') AS ret
        FROM u WHERE u.created_at < now() - interval '8 days'
      ) s),
    'd30', (
      SELECT round(100.0 * count(*) FILTER (WHERE ret) / GREATEST(count(*), 1), 1) FROM (
        SELECT EXISTS (SELECT 1 FROM act a WHERE a.user_id = u.id
          AND a.created_at >= u.created_at + interval '29 days'
          AND a.created_at < u.created_at + interval '32 days') AS ret
        FROM u WHERE u.created_at < now() - interval '32 days'
      ) s)
  ) INTO res;

  RETURN res;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_signups(_days integer DEFAULT 30)
RETURNS TABLE(day date, total bigint, telegram bigint, instagram bigint, direct bigint, referral bigint, other bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH days AS (
    SELECT generate_series(
      (now() - make_interval(days => GREATEST(_days,1) - 1))::date, now()::date, '1 day'
    )::date AS day
  ),
  su AS (
    SELECT u.created_at::date AS day,
           COALESCE(NULLIF(p.source, ''), 'unknown') AS src
    FROM auth.users u
    LEFT JOIN public.profiles p ON p.user_id = u.id
  )
  SELECT d.day,
    count(su.*),
    count(*) FILTER (WHERE su.src = 'telegram'),
    count(*) FILTER (WHERE su.src = 'instagram'),
    count(*) FILTER (WHERE su.src = 'direct'),
    count(*) FILTER (WHERE su.src = 'referral'),
    count(*) FILTER (WHERE su.src NOT IN ('telegram','instagram','direct','referral'))
  FROM days d LEFT JOIN su ON su.day = d.day
  GROUP BY d.day ORDER BY d.day;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_sources()
RETURNS TABLE(source text, users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT COALESCE(NULLIF(p.source, ''), 'unknown')::text, count(*)::bigint
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_features(_days integer DEFAULT 30)
RETURNS TABLE(feature text, uses bigint, users bigint)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT COALESCE(e.metadata->>'feature', 'unknown')::text,
         count(*)::bigint,
         count(DISTINCT e.user_id)::bigint
  FROM public.events e
  WHERE e.event_name = 'feature_used'
    AND e.created_at >= now() - make_interval(days => GREATEST(_days,1))
  GROUP BY 1 ORDER BY 2 DESC;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_engagement()
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

  WITH act AS (
    SELECT user_id, created_at FROM public.events
    UNION ALL
    SELECT user_id, created_at FROM public.study_sessions
  ),
  active_days AS (
    SELECT user_id, count(DISTINCT (created_at AT TIME ZONE 'Asia/Baghdad')::date) AS d14
    FROM act WHERE created_at >= now() - interval '14 days'
    GROUP BY user_id
  ),
  pts AS (
    SELECT user_id, sum(points)::int AS total FROM public.user_points GROUP BY user_id
  )
  SELECT jsonb_build_object(
    'streak_buckets', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', bucket, 'users', c) ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT CASE WHEN d14 >= 14 THEN '14' WHEN d14 >= 7 THEN '7-13' WHEN d14 >= 3 THEN '3-6' ELSE '1-2' END AS bucket,
               CASE WHEN d14 >= 14 THEN 4 WHEN d14 >= 7 THEN 3 WHEN d14 >= 3 THEN 2 ELSE 1 END AS ord,
               count(*)::int AS c
        FROM active_days GROUP BY 1,2
      ) s),
    'points_buckets', (
      SELECT COALESCE(jsonb_agg(jsonb_build_object('bucket', bucket, 'users', c) ORDER BY ord), '[]'::jsonb)
      FROM (
        SELECT CASE WHEN total >= 1000 THEN '1000+' WHEN total >= 500 THEN '500-999' WHEN total >= 100 THEN '100-499' WHEN total >= 20 THEN '20-99' ELSE '0-19' END AS bucket,
               CASE WHEN total >= 1000 THEN 5 WHEN total >= 500 THEN 4 WHEN total >= 100 THEN 3 WHEN total >= 20 THEN 2 ELSE 1 END AS ord,
               count(*)::int AS c
        FROM pts GROUP BY 1,2
      ) s),
    'avg_active_days_14', (SELECT COALESCE(round(avg(d14),1),0) FROM active_days),
    'full_unlock_users', (SELECT count(*) FROM active_days WHERE d14 >= 14),
    'total_users', (SELECT count(*) FROM auth.users)
  ) INTO res;

  RETURN res;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_dropoff()
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

  WITH act AS (
    SELECT user_id, created_at FROM public.events
    UNION ALL
    SELECT user_id, created_at FROM public.study_sessions
  ),
  last_act AS (
    SELECT u.id AS user_id, u.created_at AS signed_up, max(a.created_at) AS last_seen
    FROM auth.users u LEFT JOIN act a ON a.user_id = u.id
    GROUP BY u.id, u.created_at
  )
  SELECT jsonb_build_object(
    'inactive_7', (SELECT count(*) FROM last_act WHERE last_seen IS NULL OR last_seen < now() - interval '7 days'),
    'inactive_14', (SELECT count(*) FROM last_act WHERE last_seen IS NULL OR last_seen < now() - interval '14 days'),
    'inactive_30', (SELECT count(*) FROM last_act WHERE last_seen IS NULL OR last_seen < now() - interval '30 days'),
    'never_active', (SELECT count(*) FROM last_act WHERE last_seen IS NULL),
    'funnel', jsonb_build_object(
      'signup', (SELECT count(*) FROM auth.users),
      'first_feature', (SELECT count(DISTINCT user_id) FROM public.events WHERE event_name = 'feature_used'),
      'returned_next_day', (
        SELECT count(*) FROM last_act la WHERE EXISTS (
          SELECT 1 FROM act a WHERE a.user_id = la.user_id
            AND a.created_at >= la.signed_up + interval '1 day'
            AND a.created_at < la.signed_up + interval '2 days')),
      'active_7d', (SELECT count(DISTINCT user_id) FROM act WHERE created_at >= now() - interval '7 days')
    )
  ) INTO res;

  RETURN res;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_search_users(_q text)
RETURNS TABLE(user_id uuid, email text, display_name text, source text, signed_up timestamptz, last_seen timestamptz, points integer)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH act AS (
    SELECT user_id, created_at FROM public.events
    UNION ALL
    SELECT user_id, created_at FROM public.study_sessions
  )
  SELECT u.id, u.email::text, p.display_name, p.source, u.created_at,
    (SELECT max(a.created_at) FROM act a WHERE a.user_id = u.id),
    COALESCE((SELECT sum(points)::int FROM public.user_points up WHERE up.user_id = u.id), 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE _q IS NOT NULL AND length(trim(_q)) > 1
    AND (u.email ILIKE '%' || trim(_q) || '%' OR COALESCE(p.display_name,'') ILIKE '%' || trim(_q) || '%')
  ORDER BY u.created_at DESC
  LIMIT 25;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_analytics_user_timeline(_user_id uuid, _limit integer DEFAULT 100)
RETURNS TABLE(kind text, label text, detail text, at timestamptz)
LANGUAGE plpgsql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  SELECT * FROM (
    SELECT 'event'::text, e.event_name::text, COALESCE(e.metadata->>'feature', e.metadata::text)::text, e.created_at
    FROM public.events e WHERE e.user_id = _user_id
    UNION ALL
    SELECT 'session'::text, s.subject::text, (s.duration_seconds / 60)::text || ' min', s.created_at
    FROM public.study_sessions s WHERE s.user_id = _user_id
    UNION ALL
    SELECT 'points'::text, pt.source::text, pt.points::text, pt.created_at
    FROM public.user_points pt WHERE pt.user_id = _user_id
  ) t ORDER BY 4 DESC LIMIT GREATEST(_limit, 1);
END;
$$;

REVOKE ALL ON FUNCTION public.admin_analytics_overview() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_signups(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_sources() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_features(integer) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_engagement() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_dropoff() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_search_users(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.admin_analytics_user_timeline(uuid, integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.admin_analytics_overview() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_signups(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_sources() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_features(integer) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_engagement() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_dropoff() TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_search_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_analytics_user_timeline(uuid, integer) TO authenticated;