
-- Roles
CREATE TYPE public.app_role AS ENUM ('admin', 'moderator', 'user');

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role public.app_role NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.app_role)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users view own roles" ON public.user_roles
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all roles" ON public.user_roles
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins manage roles" ON public.user_roles
FOR ALL TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Auto-grant admin to specific email on signup
CREATE OR REPLACE FUNCTION public.handle_new_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.email = 'majs11@gmail.com' THEN
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin')
    ON CONFLICT DO NOTHING;
  END IF;
  INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'user')
  ON CONFLICT DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created_role
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user_role();

-- Backfill admin role if user already exists
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin'::public.app_role FROM auth.users WHERE email = 'majs11@gmail.com'
ON CONFLICT DO NOTHING;

-- Summaries
CREATE TABLE public.summaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  subject text NOT NULL,
  file_path text NOT NULL,
  file_size bigint NOT NULL DEFAULT 0,
  mime_type text,
  approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.summaries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View approved summaries" ON public.summaries
FOR SELECT TO authenticated USING (approved = true);

CREATE POLICY "View own summaries" ON public.summaries
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins view all summaries" ON public.summaries
FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users insert own summaries" ON public.summaries
FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id AND approved = false);

CREATE POLICY "Admins update summaries" ON public.summaries
FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins delete summaries" ON public.summaries
FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users delete own pending summaries" ON public.summaries
FOR DELETE TO authenticated USING (auth.uid() = user_id AND approved = false);

-- Likes
CREATE TABLE public.summary_likes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  summary_id uuid NOT NULL REFERENCES public.summaries(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, summary_id)
);

ALTER TABLE public.summary_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View all likes" ON public.summary_likes
FOR SELECT TO authenticated USING (true);

CREATE POLICY "Users like approved summaries" ON public.summary_likes
FOR INSERT TO authenticated WITH CHECK (
  auth.uid() = user_id
  AND EXISTS (SELECT 1 FROM public.summaries s WHERE s.id = summary_id AND s.approved = true)
);

CREATE POLICY "Users remove own like" ON public.summary_likes
FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE INDEX idx_summaries_subject ON public.summaries(subject);
CREATE INDEX idx_summaries_approved ON public.summaries(approved);
CREATE INDEX idx_likes_summary ON public.summary_likes(summary_id);

-- Storage bucket (private; access via signed URLs)
INSERT INTO storage.buckets (id, name, public) VALUES ('summaries', 'summaries', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Auth users read summaries files"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'summaries');

CREATE POLICY "Users upload own summaries files"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users delete own summaries files"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'summaries' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admins manage all summaries files"
ON storage.objects FOR ALL TO authenticated
USING (bucket_id = 'summaries' AND public.has_role(auth.uid(), 'admin'))
WITH CHECK (bucket_id = 'summaries' AND public.has_role(auth.uid(), 'admin'));
