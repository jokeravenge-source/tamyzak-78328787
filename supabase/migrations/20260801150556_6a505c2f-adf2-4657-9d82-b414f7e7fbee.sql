-- 1. Hide exam answer_path from clients (column-level security)
REVOKE SELECT ON public.course_exams FROM authenticated, anon;
GRANT SELECT (id, course_id, chapter, title, exam_path, created_at, created_by) ON public.course_exams TO authenticated;
GRANT INSERT, UPDATE, DELETE ON public.course_exams TO authenticated;
GRANT ALL ON public.course_exams TO service_role;

CREATE OR REPLACE FUNCTION public.get_exam_answer_path(_exam_id uuid)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT answer_path FROM public.course_exams
  WHERE id = _exam_id AND public.has_role(auth.uid(), 'admin'::app_role)
$$;
REVOKE ALL ON FUNCTION public.get_exam_answer_path(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_exam_answer_path(uuid) TO authenticated, service_role;

-- 2. Storage: course-exams -> only real exam papers for students, everything for admins
DROP POLICY IF EXISTS "course-exams read authenticated" ON storage.objects;
CREATE POLICY "course-exams read exam papers" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'course-exams'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR EXISTS (SELECT 1 FROM public.course_exams e WHERE e.exam_path = storage.objects.name)
  )
);

-- 3. Storage: files -> personal note PDFs are owner-only
DROP POLICY IF EXISTS "Auth users read files bucket" ON storage.objects;
CREATE POLICY "files read shared or own" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'files'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] <> 'notes'
    OR (storage.foldername(name))[2] = (auth.uid())::text
  )
);

-- 4. Storage: summaries -> owner or approved only
DROP POLICY IF EXISTS "Auth users read summaries files" ON storage.objects;
CREATE POLICY "summaries read own or approved" ON storage.objects
FOR SELECT TO authenticated
USING (
  bucket_id = 'summaries'
  AND (
    public.has_role(auth.uid(), 'admin'::app_role)
    OR (storage.foldername(name))[1] = (auth.uid())::text
    OR EXISTS (SELECT 1 FROM public.summaries s WHERE s.file_path = storage.objects.name AND s.approved)
  )
);

-- 5. poll_votes: stop exposing voter identities publicly
DROP POLICY IF EXISTS "poll_votes read all" ON public.poll_votes;
REVOKE SELECT ON public.poll_votes FROM anon;
CREATE POLICY "poll_votes read own" ON public.poll_votes
FOR SELECT TO authenticated
USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.poll_vote_counts(_poll_id uuid)
RETURNS TABLE (option_id uuid, votes bigint)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.option_id, count(*)::bigint
  FROM public.poll_votes v
  WHERE v.poll_id = _poll_id
  GROUP BY v.option_id
$$;
GRANT EXECUTE ON FUNCTION public.poll_vote_counts(uuid) TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.my_poll_vote(_poll_id uuid, _guest_key text DEFAULT NULL)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT v.option_id FROM public.poll_votes v
  WHERE v.poll_id = _poll_id
    AND (
      (auth.uid() IS NOT NULL AND v.user_id = auth.uid())
      OR (auth.uid() IS NULL AND _guest_key IS NOT NULL AND v.guest_key = _guest_key)
    )
  LIMIT 1
$$;
GRANT EXECUTE ON FUNCTION public.my_poll_vote(uuid, text) TO anon, authenticated, service_role;