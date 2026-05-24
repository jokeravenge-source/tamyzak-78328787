
CREATE TABLE public.user_points (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  source text NOT NULL,
  points integer NOT NULL,
  ref_id text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX user_points_unique_ref
  ON public.user_points (user_id, source, ref_id)
  WHERE ref_id IS NOT NULL;

CREATE INDEX user_points_user_idx ON public.user_points (user_id);

ALTER TABLE public.user_points ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Points readable by authed"
  ON public.user_points FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "Users insert own points"
  ON public.user_points FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins delete points"
  ON public.user_points FOR DELETE
  TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Trigger: award 5 points when a summary becomes approved
CREATE OR REPLACE FUNCTION public.award_summary_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.approved = true AND (OLD.approved IS DISTINCT FROM true) THEN
    INSERT INTO public.user_points (user_id, source, points, ref_id)
    VALUES (NEW.user_id, 'summary', 5, NEW.id::text)
    ON CONFLICT (user_id, source, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER summaries_award_points
AFTER UPDATE OF approved ON public.summaries
FOR EACH ROW EXECUTE FUNCTION public.award_summary_points();
