CREATE TABLE public.psych_messages (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL,
  role text NOT NULL CHECK (role IN ('user','assistant')),
  content text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, DELETE ON public.psych_messages TO authenticated;
GRANT ALL ON public.psych_messages TO service_role;

ALTER TABLE public.psych_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own psych messages"
  ON public.psych_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users insert own psych messages"
  ON public.psych_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own psych messages"
  ON public.psych_messages FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE INDEX idx_psych_messages_user_time ON public.psych_messages (user_id, created_at);