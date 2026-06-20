ALTER TABLE public.subject_file_text
  ADD COLUMN IF NOT EXISTS chapter text NOT NULL DEFAULT 'general';

ALTER TABLE public.subject_file_text
  DROP CONSTRAINT IF EXISTS subject_file_text_subject_file_name_key;

ALTER TABLE public.subject_file_text
  ADD CONSTRAINT subject_file_text_subject_chapter_file_name_key
  UNIQUE (subject, chapter, file_name);

CREATE INDEX IF NOT EXISTS subject_file_text_subject_chapter_idx
  ON public.subject_file_text (subject, chapter);