CREATE OR REPLACE FUNCTION public.admin_analytics_search_users(_q text)
 RETURNS TABLE(user_id uuid, email text, display_name text, source text, signed_up timestamp with time zone, last_seen timestamp with time zone, points integer)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin'::app_role) THEN
    RAISE EXCEPTION 'not authorized';
  END IF;

  RETURN QUERY
  WITH act AS (
    SELECT e.user_id AS uid, e.created_at AS seen_at FROM public.events e
    UNION ALL
    SELECT s.user_id AS uid, s.created_at AS seen_at FROM public.study_sessions s
  )
  SELECT u.id, u.email::text, p.display_name, p.source, u.created_at,
    (SELECT max(a.seen_at) FROM act a WHERE a.uid = u.id),
    COALESCE((SELECT sum(points)::int FROM public.user_points up WHERE up.user_id = u.id), 0)
  FROM auth.users u
  LEFT JOIN public.profiles p ON p.user_id = u.id
  WHERE _q IS NOT NULL AND length(trim(_q)) > 1
    AND (u.email ILIKE '%' || trim(_q) || '%' OR COALESCE(p.display_name,'') ILIKE '%' || trim(_q) || '%')
  ORDER BY u.created_at DESC
  LIMIT 25;
END;
$function$;