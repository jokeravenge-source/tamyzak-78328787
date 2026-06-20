CREATE OR REPLACE FUNCTION public.list_subject_chapters(_subject text)
RETURNS TABLE(chapter text, has_files boolean)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, storage
AS $$
  WITH parts AS (
    SELECT
      CASE
        WHEN split_part(name, '/', 3) <> '' THEN split_part(name, '/', 2)
        ELSE 'general'
      END AS chapter,
      name
    FROM storage.objects
    WHERE bucket_id = 'files'
      AND name LIKE (_subject || '/%')
      AND name NOT LIKE '%/.lovkeep'
      AND name NOT LIKE '%/.%'
  )
  SELECT chapter, true AS has_files
  FROM parts
  GROUP BY chapter
  ORDER BY chapter;
$$;

GRANT EXECUTE ON FUNCTION public.list_subject_chapters(text) TO authenticated;