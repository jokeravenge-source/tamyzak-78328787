
CREATE TABLE public.teacher_topic_mcqs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  questions JSONB NOT NULL,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_topic_mcqs TO authenticated;
GRANT ALL ON public.teacher_topic_mcqs TO service_role;

ALTER TABLE public.teacher_topic_mcqs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone signed-in can view teacher MCQs"
  ON public.teacher_topic_mcqs FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins can insert teacher MCQs"
  ON public.teacher_topic_mcqs FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update teacher MCQs"
  ON public.teacher_topic_mcqs FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete teacher MCQs"
  ON public.teacher_topic_mcqs FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX idx_teacher_topic_mcqs_teacher_topic
  ON public.teacher_topic_mcqs (teacher_id, topic_key, created_at DESC);
