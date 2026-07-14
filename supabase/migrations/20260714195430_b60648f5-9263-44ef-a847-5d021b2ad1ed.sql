CREATE TABLE public.course_playlists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  course_id TEXT NOT NULL,
  title TEXT NOT NULL,
  playlist_id TEXT NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_playlists TO authenticated;
GRANT ALL ON public.course_playlists TO service_role;

ALTER TABLE public.course_playlists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view course playlists"
  ON public.course_playlists FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert course playlists"
  ON public.course_playlists FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update course playlists"
  ON public.course_playlists FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete course playlists"
  ON public.course_playlists FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_course_playlists_updated_at
  BEFORE UPDATE ON public.course_playlists
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX idx_course_playlists_course_id ON public.course_playlists(course_id);