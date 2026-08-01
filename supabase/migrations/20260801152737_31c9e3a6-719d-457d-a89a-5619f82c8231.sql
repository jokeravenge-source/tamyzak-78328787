DROP POLICY IF EXISTS "exams viewable by course participants" ON public.course_exams;
CREATE POLICY "exams viewable by authenticated users"
ON public.course_exams FOR SELECT TO authenticated USING (true);