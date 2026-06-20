
CREATE TABLE public.notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  parent_id uuid REFERENCES public.notes(id) ON DELETE CASCADE,
  title text NOT NULL DEFAULT 'Untitled',
  icon text DEFAULT '📄',
  content jsonb NOT NULL DEFAULT '[]'::jsonb,
  position integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.notes TO authenticated;
GRANT ALL ON public.notes TO service_role;

ALTER TABLE public.notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own notes" ON public.notes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users insert own notes" ON public.notes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own notes" ON public.notes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own notes" ON public.notes FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX notes_user_parent_idx ON public.notes(user_id, parent_id, position);

CREATE TRIGGER notes_set_updated_at
  BEFORE UPDATE ON public.notes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
