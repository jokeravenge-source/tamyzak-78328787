
REVOKE EXECUTE ON FUNCTION public.is_course_teacher(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.is_course_enrolled(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(uuid) TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.is_course_enrolled(uuid) TO authenticated, service_role;
