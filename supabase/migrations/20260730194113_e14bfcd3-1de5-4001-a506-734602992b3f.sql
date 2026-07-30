
DROP POLICY IF EXISTS "polls bucket guest insert" ON storage.objects;
CREATE POLICY "polls bucket guest insert" ON storage.objects FOR INSERT TO anon
WITH CHECK (bucket_id = 'polls');
