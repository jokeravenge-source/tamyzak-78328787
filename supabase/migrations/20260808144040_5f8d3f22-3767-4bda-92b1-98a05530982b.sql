CREATE INDEX IF NOT EXISTS idx_events_user_created ON public.events (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_events_created ON public.events (created_at);
CREATE INDEX IF NOT EXISTS idx_events_name_created ON public.events (event_name, created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_user_created ON public.study_sessions (user_id, created_at);
CREATE INDEX IF NOT EXISTS idx_study_sessions_created ON public.study_sessions (created_at);
CREATE INDEX IF NOT EXISTS idx_user_points_user ON public.user_points (user_id);

CREATE OR REPLACE FUNCTION public.admin_analytics_overview()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  res jsonb;
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  WITH u AS (SELECT id, created_at FROM auth.users),
  act AS (
    SELECT user_id, created_at FROM public.events
    UNION ALL
    SELECT user_id, created_at FROM public.study_sessions
  ),
  -- One pass: for every user, how far after signup did they come back?
  ret AS (
    SELECT u.id,
           u.created_at AS signed_up,
           bool_or(a.created_at >= u.created_at + interval '1 day'
               AND a.created_at <  u.created_at + interval '2 days') AS r1,
           bool_or(a.created_at >= u.created_at + interval '6 days'
               AND a.created_at <  u.created_at + interval '8 days') AS r7,
           bool_or(a.created_at >= u.created_at + interval '29 days'
               AND a.created_at <  u.created_at + interval '32 days') AS r30
    FROM u LEFT JOIN act a ON a.user_id = u.id
    GROUP BY u.id, u.created_at
  )
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
    'd1', (SELECT round(100.0 * count(*) FILTER (WHERE COALESCE(r1,false)) / GREATEST(count(*),1), 1)
             FROM ret WHERE signed_up < now() - interval '2 days'),
    'd7', (SELECT round(100.0 * count(*) FILTER (WHERE COALESCE(r7,false)) / GREATEST(count(*),1), 1)
             FROM ret WHERE signed_up < now() - interval '8 days'),
    'd30', (SELECT round(100.0 * count(*) FILTER (WHERE COALESCE(r30,false)) / GREATEST(count(*),1), 1)
             FROM ret WHERE signed_up < now() - interval '32 days')
  ) INTO res;

  RETURN res;
END;
$function$;

CREATE OR REPLACE FUNCTION public.admin_analytics_dropoff()
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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
    SELECT u.id AS user_id,
           u.created_at AS signed_up,
           max(a.created_at) AS last_seen,
           bool_or(a.created_at >= u.created_at + interval '1 day'
               AND a.created_at <  u.created_at + interval '2 days') AS returned_next_day
    FROM auth.users u LEFT JOIN act a ON a.user_id = u.id
    GROUP BY u.id, u.created_at
  )
  SELECT jsonb_build_object(
    'inactive_7', (SELECT count(*) FROM last_act WHERE last_seen IS NULL OR last_seen < now() - interval '7 days'),
    'inactive_14', (SELECT count(*) FROM last_act WHERE last_seen IS NULL OR last_seen < now() - interval '14 days'),
    'inactive_30', (SELECT count(*) FROM last_act WHERE last_seen IS NULL OR last_seen < now() - interval '30 days'),
    'never_active', (SELECT count(*) FROM last_act WHERE last_seen IS NULL),
    'funnel', jsonb_build_object(
      'signup', (SELECT count(*) FROM last_act),
      'first_feature', (SELECT count(DISTINCT user_id) FROM public.events WHERE event_name = 'feature_used'),
      'returned_next_day', (SELECT count(*) FROM last_act WHERE COALESCE(returned_next_day,false)),
      'active_7d', (SELECT count(DISTINCT user_id) FROM act WHERE created_at >= now() - interval '7 days')
    )
  ) INTO res;

  RETURN res;
END;
$function$;