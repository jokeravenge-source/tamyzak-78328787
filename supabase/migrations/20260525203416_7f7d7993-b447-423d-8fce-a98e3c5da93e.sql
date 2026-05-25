
-- News table
CREATE TABLE public.news (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  image_path TEXT,
  created_by UUID,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

CREATE POLICY "News readable by authed" ON public.news FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert news" ON public.news FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update news" ON public.news FOR UPDATE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete news" ON public.news FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER news_set_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto notify on new news
CREATE OR REPLACE FUNCTION public.notify_on_news()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.notifications (title, body, created_by)
  VALUES ('📰 ' || NEW.title, COALESCE(NEW.description, ''), NEW.created_by);
  RETURN NEW;
END;
$$;

CREATE TRIGGER news_notify_trigger AFTER INSERT ON public.news FOR EACH ROW EXECUTE FUNCTION public.notify_on_news();

-- Public storage bucket for news images
INSERT INTO storage.buckets (id, name, public) VALUES ('news', 'news', true) ON CONFLICT (id) DO NOTHING;

CREATE POLICY "News images public read" ON storage.objects FOR SELECT USING (bucket_id = 'news');
CREATE POLICY "Admins upload news images" ON storage.objects FOR INSERT TO authenticated WITH CHECK (bucket_id = 'news' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins update news images" ON storage.objects FOR UPDATE TO authenticated USING (bucket_id = 'news' AND has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "Admins delete news images" ON storage.objects FOR DELETE TO authenticated USING (bucket_id = 'news' AND has_role(auth.uid(), 'admin'::app_role));
