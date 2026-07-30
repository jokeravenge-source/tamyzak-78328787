CREATE TABLE public.poll_option_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  image_path text,
  status text NOT NULL DEFAULT 'pending',
  requested_by uuid DEFAULT auth.uid(),
  guest_key text,
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.poll_option_requests TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.poll_option_requests TO authenticated;
GRANT ALL ON public.poll_option_requests TO service_role;

ALTER TABLE public.poll_option_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "requests guest insert" ON public.poll_option_requests
  FOR INSERT TO anon
  WITH CHECK (requested_by IS NULL AND guest_key IS NOT NULL AND status = 'pending');

CREATE POLICY "requests user insert" ON public.poll_option_requests
  FOR INSERT TO authenticated
  WITH CHECK (requested_by = auth.uid() AND status = 'pending');

CREATE POLICY "requests read own" ON public.poll_option_requests
  FOR SELECT TO authenticated
  USING (requested_by = auth.uid());

CREATE POLICY "requests admin read" ON public.poll_option_requests
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "requests admin update" ON public.poll_option_requests
  FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "requests admin delete" ON public.poll_option_requests
  FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.set_updated_at_poll_requests()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER update_poll_option_requests_updated_at
  BEFORE UPDATE ON public.poll_option_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_poll_requests();