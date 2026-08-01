DROP POLICY IF EXISTS "exams viewable by authenticated" ON public.course_exams;

CREATE OR REPLACE FUNCTION public.is_course_student()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.course_students WHERE user_id = auth.uid()
  );
$$;

REVOKE ALL ON FUNCTION public.is_course_student() FROM PUBLIC;
REVOKE ALL ON FUNCTION public.is_course_student() FROM anon;
GRANT EXECUTE ON FUNCTION public.is_course_student() TO authenticated;

CREATE POLICY "exams viewable by course participants"
ON public.course_exams
FOR SELECT
TO authenticated
USING (
  has_role(auth.uid(), 'admin'::app_role)
  OR public.is_course_student()
);