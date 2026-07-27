GRANT SELECT, INSERT ON public.teacher_mcq_pending_changes TO anon;

CREATE POLICY "Anyone can view pending changes"
ON public.teacher_mcq_pending_changes
FOR SELECT
TO anon
USING (true);

CREATE POLICY "Anyone can submit pending changes"
ON public.teacher_mcq_pending_changes
FOR INSERT
TO anon
WITH CHECK (status = 'pending' AND reviewed_by IS NULL AND reviewed_at IS NULL);