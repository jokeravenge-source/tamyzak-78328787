
CREATE TABLE public.notebooks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  name text NOT NULL DEFAULT 'New notebook',
  icon text DEFAULT '📚',
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notebooks TO authenticated;
GRANT ALL ON public.notebooks TO service_role;

ALTER TABLE public.notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notebooks" ON public.notebooks FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notebooks" ON public.notebooks FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notebooks" ON public.notebooks FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notebooks" ON public.notebooks FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE TRIGGER notebooks_set_updated_at
  BEFORE UPDATE ON public.notebooks
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.notes
  ADD COLUMN notebook_id uuid REFERENCES public.notebooks(id) ON DELETE SET NULL;

CREATE INDEX notes_notebook_idx ON public.notes(user_id, notebook_id, parent_id, position);
