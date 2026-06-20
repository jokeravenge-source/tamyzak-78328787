
CREATE TABLE public.site_stats (
  id text PRIMARY KEY,
  count bigint NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.site_stats TO anon, authenticated;
GRANT ALL ON public.site_stats TO service_role;

ALTER TABLE public.site_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site stats"
  ON public.site_stats FOR SELECT
  USING (true);

INSERT INTO public.site_stats (id, count) VALUES ('global', 20000)
ON CONFLICT (id) DO NOTHING;

CREATE OR REPLACE FUNCTION public.increment_site_visits()
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  INSERT INTO public.site_stats (id, count) VALUES ('global', 20001)
  ON CONFLICT (id) DO UPDATE SET count = public.site_stats.count + 1, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.increment_site_visits() TO anon, authenticated;

CREATE OR REPLACE FUNCTION public.set_site_visits(_count bigint)
RETURNS bigint
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  new_count bigint;
BEGIN
  IF auth.uid() IS NULL OR NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'not authorized';
  END IF;
  IF _count < 0 THEN
    RAISE EXCEPTION 'count must be non-negative';
  END IF;
  INSERT INTO public.site_stats (id, count) VALUES ('global', _count)
  ON CONFLICT (id) DO UPDATE SET count = EXCLUDED.count, updated_at = now()
  RETURNING count INTO new_count;
  RETURN new_count;
END;
$$;

GRANT EXECUTE ON FUNCTION public.set_site_visits(bigint) TO authenticated;
