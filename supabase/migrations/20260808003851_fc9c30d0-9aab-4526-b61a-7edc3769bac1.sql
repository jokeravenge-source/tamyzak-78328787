CREATE TABLE public.bank_text_questions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL CHECK (subject IN ('arabic','english','math','chemistry','biology','physics','islamic','french')),
  chapter integer NOT NULL,
  chapter_title text,
  section text,
  language text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar','en','fr')),
  question text NOT NULL,
  answer text NOT NULL,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_text_questions TO authenticated;
GRANT ALL ON public.bank_text_questions TO service_role;
ALTER TABLE public.bank_text_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read text questions"
  ON public.bank_text_questions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage text questions"
  ON public.bank_text_questions FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_bank_text_questions_subject_chapter
  ON public.bank_text_questions (subject, chapter, sort_order);

CREATE TRIGGER bank_text_questions_updated_at
  BEFORE UPDATE ON public.bank_text_questions
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE public.bank_problems (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL CHECK (subject IN ('math','chemistry','biology','physics')),
  chapter integer NOT NULL,
  chapter_title text,
  section text,
  language text NOT NULL DEFAULT 'ar' CHECK (language IN ('ar','en')),
  problem text NOT NULL,
  solution text NOT NULL,
  final_answer text,
  given_data text,
  formula text,
  difficulty text NOT NULL DEFAULT 'medium' CHECK (difficulty IN ('easy','medium','hard')),
  tags text[] NOT NULL DEFAULT '{}',
  source text,
  sort_order integer NOT NULL DEFAULT 0,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.bank_problems TO authenticated;
GRANT ALL ON public.bank_problems TO service_role;
ALTER TABLE public.bank_problems ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read problems"
  ON public.bank_problems FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins manage problems"
  ON public.bank_problems FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE INDEX idx_bank_problems_subject_chapter
  ON public.bank_problems (subject, chapter, sort_order);

CREATE TRIGGER bank_problems_updated_at
  BEFORE UPDATE ON public.bank_problems
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();