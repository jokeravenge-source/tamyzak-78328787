CREATE TABLE public.mcq_banks (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  subject text NOT NULL CHECK (subject IN ('physics','chemistry','biology','english','french','arabic','islamic')),
  chapter integer NOT NULL DEFAULT 1,
  chapter_title text,
  section text,
  language text NOT NULL DEFAULT 'ar',
  question text NOT NULL,
  choices jsonb NOT NULL DEFAULT '[]'::jsonb,
  answer_index integer NOT NULL DEFAULT 0,
  explanation text,
  difficulty text NOT NULL DEFAULT 'medium',
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT ON public.mcq_banks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.mcq_banks TO authenticated;
GRANT ALL ON public.mcq_banks TO service_role;

ALTER TABLE public.mcq_banks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read mcq banks"
ON public.mcq_banks FOR SELECT
USING (true);

CREATE POLICY "Admins manage mcq banks"
ON public.mcq_banks FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE INDEX mcq_banks_subject_chapter_idx ON public.mcq_banks (subject, chapter, sort_order);

CREATE TRIGGER mcq_banks_set_updated_at
BEFORE UPDATE ON public.mcq_banks
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();