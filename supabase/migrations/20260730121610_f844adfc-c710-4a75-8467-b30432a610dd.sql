ALTER TABLE public.course_exam_plans
  ADD COLUMN IF NOT EXISTS full_name text,
  ADD COLUMN IF NOT EXISTS telegram_username text;