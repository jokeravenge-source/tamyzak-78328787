CREATE TABLE public.canvases (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  client_id text NOT NULL,
  name text NOT NULL DEFAULT 'Untitled',
  data jsonb NOT NULL DEFAULT '{"items":[],"height":720}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, client_id)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.canvases TO authenticated;
GRANT ALL ON public.canvases TO service_role;

ALTER TABLE public.canvases ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view their own canvases"
  ON public.canvases FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert their own canvases"
  ON public.canvases FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users update their own canvases"
  ON public.canvases FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete their own canvases"
  ON public.canvases FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER canvases_set_updated_at
  BEFORE UPDATE ON public.canvases
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX canvases_user_updated_idx ON public.canvases (user_id, updated_at DESC);