
CREATE TABLE IF NOT EXISTS public.feature_usage (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  feature text NOT NULL,
  used_on date NOT NULL DEFAULT (now() AT TIME ZONE 'utc')::date,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, feature, used_on)
);

ALTER TABLE public.feature_usage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own feature usage"
  ON public.feature_usage FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.claim_daily_feature(_feature text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _inserted int;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;
  INSERT INTO public.feature_usage (user_id, feature, used_on)
  VALUES (_uid, _feature, (now() AT TIME ZONE 'utc')::date)
  ON CONFLICT (user_id, feature, used_on) DO NOTHING;
  GET DIAGNOSTICS _inserted = ROW_COUNT;
  RETURN _inserted > 0;
END;
$$;
