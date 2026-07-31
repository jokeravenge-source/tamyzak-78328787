-- 1. Lock down the MCQ moderation queue
DROP POLICY IF EXISTS "Anyone can view pending changes" ON public.teacher_mcq_pending_changes;
DROP POLICY IF EXISTS "Anyone can submit pending changes" ON public.teacher_mcq_pending_changes;

CREATE POLICY "Authenticated can submit pending changes"
ON public.teacher_mcq_pending_changes FOR INSERT TO authenticated
WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);

REVOKE ALL ON public.teacher_mcq_pending_changes FROM anon;

-- 2. Stop anonymous execution of SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.award_points_safe(text, integer, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.claim_daily_feature(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.feature_usage_today(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.has_active_premium(uuid, text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_course_enrolled(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.is_course_teacher(uuid) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.list_subject_chapters(text) FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.increment_site_visits() FROM anon, public;
REVOKE EXECUTE ON FUNCTION public.set_site_visits(bigint) FROM anon, public;

GRANT EXECUTE ON FUNCTION public.award_points_safe(text, integer, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.claim_daily_feature(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.feature_usage_today(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, app_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.has_active_premium(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_enrolled(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_course_teacher(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_subject_chapters(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.increment_site_visits() TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_site_visits(bigint) TO authenticated;

-- Trigger-only functions: nobody should call these directly
REVOKE EXECUTE ON FUNCTION public.apply_username_request() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.award_summary_points() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_on_news() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user_role() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.set_updated_at_poll_requests() FROM anon, authenticated, public;

-- 3. Public buckets should not be listable; public URLs keep working
DROP POLICY IF EXISTS "News images public read" ON storage.objects;
DROP POLICY IF EXISTS "polls bucket public read" ON storage.objects;
DROP POLICY IF EXISTS "Public can read stickers" ON storage.objects;

CREATE POLICY "Users can list own stickers"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'stickers' AND (auth.uid())::text = (storage.foldername(name))[1]);
