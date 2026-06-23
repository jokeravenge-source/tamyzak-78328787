
CREATE POLICY "Public can read stickers"
ON storage.objects FOR SELECT
USING (bucket_id = 'stickers');

CREATE POLICY "Users can upload own stickers"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'stickers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can update own stickers"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'stickers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

CREATE POLICY "Users can delete own stickers"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'stickers'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
