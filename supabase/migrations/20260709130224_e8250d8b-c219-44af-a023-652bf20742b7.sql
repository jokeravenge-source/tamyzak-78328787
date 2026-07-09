
CREATE TABLE public.teacher_topic_videos (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  youtube_url TEXT NOT NULL,
  video_id TEXT,
  title TEXT,
  transcript TEXT,
  notes_parts JSONB NOT NULL DEFAULT '[]'::jsonb,
  approved BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_topic_videos TO authenticated;
GRANT ALL ON public.teacher_topic_videos TO service_role;

ALTER TABLE public.teacher_topic_videos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View approved or own or admin"
  ON public.teacher_topic_videos FOR SELECT
  TO authenticated
  USING (
    approved = true
    OR created_by = auth.uid()
    OR public.has_role(auth.uid(), 'admin')
  );

CREATE POLICY "Admins insert videos"
  ON public.teacher_topic_videos FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins update videos"
  ON public.teacher_topic_videos FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete videos"
  ON public.teacher_topic_videos FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_teacher_topic_videos_topic
  ON public.teacher_topic_videos (teacher_id, topic_key, approved);

CREATE TRIGGER trg_teacher_topic_videos_updated_at
  BEFORE UPDATE ON public.teacher_topic_videos
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
