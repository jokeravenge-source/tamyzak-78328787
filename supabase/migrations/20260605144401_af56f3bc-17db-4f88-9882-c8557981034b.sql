
CREATE TABLE public.username_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  current_name text,
  requested_name text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.username_requests TO authenticated;
GRANT ALL ON public.username_requests TO service_role;

ALTER TABLE public.username_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own username requests"
  ON public.username_requests FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users can insert own username requests"
  ON public.username_requests FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can update username requests"
  ON public.username_requests FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete username requests"
  ON public.username_requests FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_username_requests_updated_at
  BEFORE UPDATE ON public.username_requests
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Apply approved name change to profile
CREATE OR REPLACE FUNCTION public.apply_username_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved') THEN
    UPDATE public.profiles
      SET display_name = NEW.requested_name
      WHERE user_id = NEW.user_id;
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  ELSIF NEW.status = 'rejected' AND (OLD.status IS DISTINCT FROM 'rejected') THEN
    NEW.reviewed_at := COALESCE(NEW.reviewed_at, now());
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_apply_username_request
  BEFORE UPDATE ON public.username_requests
  FOR EACH ROW EXECUTE FUNCTION public.apply_username_request();
