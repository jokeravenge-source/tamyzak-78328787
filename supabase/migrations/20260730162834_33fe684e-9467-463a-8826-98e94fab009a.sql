ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS created_by uuid;

DROP POLICY IF EXISTS "poll_options user insert" ON public.poll_options;
CREATE POLICY "poll_options user insert" ON public.poll_options
FOR INSERT TO authenticated
WITH CHECK (true);

DROP POLICY IF EXISTS "poll_options delete own" ON public.poll_options;
CREATE POLICY "poll_options delete own" ON public.poll_options
FOR DELETE TO authenticated
USING (created_by = auth.uid());

DROP POLICY IF EXISTS "polls bucket user insert" ON storage.objects;
CREATE POLICY "polls bucket user insert" ON storage.objects
FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'polls');