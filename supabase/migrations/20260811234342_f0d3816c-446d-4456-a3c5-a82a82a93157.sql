CREATE TABLE public.user_events (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  event_name text NOT NULL,
  props jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.user_events TO authenticated;
GRANT ALL ON public.user_events TO service_role;

ALTER TABLE public.user_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own events"
  ON public.user_events FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own events"
  ON public.user_events FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all events"
  ON public.user_events FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX user_events_user_created_idx ON public.user_events (user_id, created_at DESC);
CREATE INDEX user_events_name_idx ON public.user_events (event_name);

CREATE TABLE public.signup_attribution (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL UNIQUE,
  src text,
  code text,
  referrer text,
  landing_path text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.signup_attribution TO authenticated;
GRANT ALL ON public.signup_attribution TO service_role;

ALTER TABLE public.signup_attribution ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own attribution"
  ON public.signup_attribution FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own attribution"
  ON public.signup_attribution FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all attribution"
  ON public.signup_attribution FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER signup_attribution_set_updated_at
  BEFORE UPDATE ON public.signup_attribution
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();