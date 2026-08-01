CREATE TABLE public.course_students (
  user_id uuid PRIMARY KEY,
  full_name text NOT NULL,
  telegram_username text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_students TO authenticated;
GRANT ALL ON public.course_students TO service_role;
ALTER TABLE public.course_students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own course profile" ON public.course_students
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view course students" ON public.course_students
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER course_students_updated_at BEFORE UPDATE ON public.course_students
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.course_exam_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  exam_id uuid NOT NULL REFERENCES public.course_exams(id) ON DELETE CASCADE,
  course_id text NOT NULL,
  score numeric,
  graded_out_of numeric,
  completed_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, exam_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_exam_completions TO authenticated;
GRANT ALL ON public.course_exam_completions TO service_role;
ALTER TABLE public.course_exam_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Students manage own completions" ON public.course_exam_completions
  FOR ALL TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Admins view completions" ON public.course_exam_completions
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE TRIGGER course_exam_completions_updated_at BEFORE UPDATE ON public.course_exam_completions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();