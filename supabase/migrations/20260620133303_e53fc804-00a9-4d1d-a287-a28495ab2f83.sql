CREATE TABLE public.subject_file_text (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  file_name text NOT NULL,
  text text NOT NULL DEFAULT '',
  char_count int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subject, file_name)
);

GRANT SELECT ON public.subject_file_text TO authenticated;
GRANT ALL ON public.subject_file_text TO service_role;

ALTER TABLE public.subject_file_text ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read indexed file text"
  ON public.subject_file_text FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Admins manage indexed file text"
  ON public.subject_file_text FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER subject_file_text_set_updated_at
BEFORE UPDATE ON public.subject_file_text
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX subject_file_text_subject_idx ON public.subject_file_text (subject);