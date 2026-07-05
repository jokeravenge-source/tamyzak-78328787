
CREATE TABLE public.course_exams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  course_id text NOT NULL,
  title text NOT NULL,
  exam_path text NOT NULL,
  answer_path text NOT NULL,
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_exams TO authenticated;
GRANT ALL ON public.course_exams TO service_role;

ALTER TABLE public.course_exams ENABLE ROW LEVEL SECURITY;

CREATE POLICY "exams viewable by authenticated"
  ON public.course_exams FOR SELECT TO authenticated USING (true);

CREATE POLICY "admins insert exams"
  ON public.course_exams FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins update exams"
  ON public.course_exams FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "admins delete exams"
  ON public.course_exams FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE INDEX course_exams_course_id_idx ON public.course_exams(course_id);

-- Storage policies for course-exams bucket
CREATE POLICY "course-exams read authenticated"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'course-exams');

CREATE POLICY "course-exams admin insert"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'course-exams' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "course-exams admin update"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'course-exams' AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "course-exams admin delete"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'course-exams' AND public.has_role(auth.uid(), 'admin'));
