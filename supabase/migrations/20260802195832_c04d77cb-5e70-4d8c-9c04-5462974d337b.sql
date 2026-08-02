CREATE TABLE IF NOT EXISTS public.edge_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  bucket_key TEXT NOT NULL,
  feature TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  request_count INTEGER NOT NULL DEFAULT 0,
  UNIQUE (bucket_key, feature)
);

GRANT ALL ON public.edge_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.edge_rate_limits_id_seq TO service_role;

ALTER TABLE public.edge_rate_limits ENABLE ROW LEVEL SECURITY;

CREATE INDEX IF NOT EXISTS edge_rate_limits_window_idx ON public.edge_rate_limits (window_start);

CREATE OR REPLACE FUNCTION public.check_edge_rate_limit(
  _key TEXT,
  _feature TEXT,
  _max_requests INTEGER DEFAULT 10,
  _window_seconds INTEGER DEFAULT 60
) RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _count INTEGER;
BEGIN
  INSERT INTO public.edge_rate_limits (bucket_key, feature, window_start, request_count)
  VALUES (_key, _feature, now(), 1)
  ON CONFLICT (bucket_key, feature) DO UPDATE
    SET request_count = CASE
          WHEN public.edge_rate_limits.window_start < now() - make_interval(secs => _window_seconds) THEN 1
          ELSE public.edge_rate_limits.request_count + 1
        END,
        window_start = CASE
          WHEN public.edge_rate_limits.window_start < now() - make_interval(secs => _window_seconds) THEN now()
          ELSE public.edge_rate_limits.window_start
        END
  RETURNING request_count INTO _count;

  RETURN _count <= _max_requests;
END;
$$;

REVOKE ALL ON FUNCTION public.check_edge_rate_limit(TEXT, TEXT, INTEGER, INTEGER) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_edge_rate_limit(TEXT, TEXT, INTEGER, INTEGER) TO service_role;