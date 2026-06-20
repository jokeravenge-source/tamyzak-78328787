CREATE OR REPLACE FUNCTION public.increment_site_visits()
 RETURNS bigint
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  new_count bigint;
  bump int;
BEGIN
  -- Random bump between 3 and 9 so the counter visibly grows for each visit
  bump := 3 + floor(random() * 7)::int;
  INSERT INTO public.site_stats (id, count) VALUES ('global', 20000 + bump)
  ON CONFLICT (id) DO UPDATE SET count = public.site_stats.count + bump, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$function$;