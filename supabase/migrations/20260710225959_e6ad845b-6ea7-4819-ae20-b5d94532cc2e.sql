ALTER TABLE public.course_exams ADD COLUMN IF NOT EXISTS chapter text NOT NULL DEFAULT 'General';
CREATE INDEX IF NOT EXISTS course_exams_course_chapter_idx ON public.course_exams(course_id, chapter);