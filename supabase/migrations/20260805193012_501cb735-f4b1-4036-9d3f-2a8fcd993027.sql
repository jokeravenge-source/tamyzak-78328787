CREATE TABLE public.course_exam_answer_keys (
  exam_id uuid PRIMARY KEY REFERENCES public.course_exams(id) ON DELETE CASCADE,
  answer_path text,
  question_count integer NOT NULL,
  marks jsonb NOT NULL DEFAULT '[]'::jsonb,
  key_text text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT ALL ON public.course_exam_answer_keys TO service_role;

ALTER TABLE public.course_exam_answer_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct client access to answer key cache"
ON public.course_exam_answer_keys
FOR ALL
USING (false)
WITH CHECK (false);

CREATE TRIGGER course_exam_answer_keys_updated_at
BEFORE UPDATE ON public.course_exam_answer_keys
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();