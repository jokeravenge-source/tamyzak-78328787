ALTER TABLE public.course_exams
  ADD COLUMN IF NOT EXISTS question_count integer,
  ADD COLUMN IF NOT EXISTS question_marks jsonb;