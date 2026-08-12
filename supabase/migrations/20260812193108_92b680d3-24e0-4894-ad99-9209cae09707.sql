CREATE TABLE public.admin_notebooks (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  cover_emoji text default '📚',
  cover_image_url text,
  published boolean not null default false,
  sort_order integer not null default 0,
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

GRANT SELECT ON public.admin_notebooks TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.admin_notebooks TO authenticated;
GRANT ALL ON public.admin_notebooks TO service_role;

ALTER TABLE public.admin_notebooks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view published notebooks"
ON public.admin_notebooks FOR SELECT
USING (published = true OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert notebooks"
ON public.admin_notebooks FOR INSERT TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update notebooks"
ON public.admin_notebooks FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete notebooks"
ON public.admin_notebooks FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER update_admin_notebooks_updated_at
BEFORE UPDATE ON public.admin_notebooks
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

ALTER TABLE public.admin_notes
  ADD COLUMN notebook_id uuid REFERENCES public.admin_notebooks(id) ON DELETE CASCADE;