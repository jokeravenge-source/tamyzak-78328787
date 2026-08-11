CREATE TABLE public.player_teachers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  playlist_id text NOT NULL,
  playlist_url text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.player_teachers TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.player_teachers TO authenticated;
GRANT ALL ON public.player_teachers TO service_role;

ALTER TABLE public.player_teachers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view player teachers"
ON public.player_teachers FOR SELECT
USING (true);

CREATE POLICY "Admins manage player teachers"
ON public.player_teachers FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'::app_role))
WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER player_teachers_set_updated_at
BEFORE UPDATE ON public.player_teachers
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();