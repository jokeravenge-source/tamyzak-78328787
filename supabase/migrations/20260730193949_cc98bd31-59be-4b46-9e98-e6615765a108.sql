
ALTER TABLE public.poll_votes ALTER COLUMN user_id DROP NOT NULL;
ALTER TABLE public.poll_votes ADD COLUMN IF NOT EXISTS guest_key text;
ALTER TABLE public.poll_options ADD COLUMN IF NOT EXISTS guest_key text;

ALTER TABLE public.poll_votes DROP CONSTRAINT IF EXISTS poll_votes_identity_chk;
ALTER TABLE public.poll_votes ADD CONSTRAINT poll_votes_identity_chk CHECK (user_id IS NOT NULL OR guest_key IS NOT NULL);

CREATE UNIQUE INDEX IF NOT EXISTS poll_votes_guest_unique ON public.poll_votes (poll_id, guest_key) WHERE guest_key IS NOT NULL;

GRANT SELECT ON public.polls TO anon;
GRANT SELECT ON public.poll_options TO anon;
GRANT SELECT ON public.poll_votes TO anon;
GRANT INSERT, UPDATE, DELETE ON public.poll_options TO anon;
GRANT INSERT, UPDATE, DELETE ON public.poll_votes TO anon;
GRANT ALL ON public.polls TO service_role;
GRANT ALL ON public.poll_options TO service_role;
GRANT ALL ON public.poll_votes TO service_role;

DROP POLICY IF EXISTS "poll_options guest insert" ON public.poll_options;
CREATE POLICY "poll_options guest insert" ON public.poll_options FOR INSERT TO anon
WITH CHECK (created_by IS NULL AND guest_key IS NOT NULL);

DROP POLICY IF EXISTS "poll_options guest delete" ON public.poll_options;
CREATE POLICY "poll_options guest delete" ON public.poll_options FOR DELETE TO anon
USING (guest_key IS NOT NULL);

DROP POLICY IF EXISTS "poll_votes guest insert" ON public.poll_votes;
CREATE POLICY "poll_votes guest insert" ON public.poll_votes FOR INSERT TO anon
WITH CHECK (user_id IS NULL AND guest_key IS NOT NULL);

DROP POLICY IF EXISTS "poll_votes guest update" ON public.poll_votes;
CREATE POLICY "poll_votes guest update" ON public.poll_votes FOR UPDATE TO anon
USING (guest_key IS NOT NULL) WITH CHECK (user_id IS NULL AND guest_key IS NOT NULL);

DROP POLICY IF EXISTS "poll_votes guest delete" ON public.poll_votes;
CREATE POLICY "poll_votes guest delete" ON public.poll_votes FOR DELETE TO anon
USING (guest_key IS NOT NULL);
