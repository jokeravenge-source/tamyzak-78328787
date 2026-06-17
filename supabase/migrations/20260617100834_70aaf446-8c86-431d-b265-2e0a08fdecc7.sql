
CREATE TABLE public.student_todos (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  week_key TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_todos TO authenticated;
GRANT ALL ON public.student_todos TO service_role;
ALTER TABLE public.student_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own todos select" ON public.student_todos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own todos insert" ON public.student_todos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own todos update" ON public.student_todos FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own todos delete" ON public.student_todos FOR DELETE TO authenticated USING (auth.uid() = user_id);
