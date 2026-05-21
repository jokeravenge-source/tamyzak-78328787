
CREATE TABLE public.custom_flashcards (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subject text NOT NULL,
  chapter text NOT NULL,
  language text NOT NULL DEFAULT 'en',
  question text NOT NULL,
  answer text NOT NULL,
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.custom_flashcards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Flashcards readable by authed" ON public.custom_flashcards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins insert flashcards" ON public.custom_flashcards FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins update flashcards" ON public.custom_flashcards FOR UPDATE TO authenticated USING (has_role(auth.uid(),'admin')) WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete flashcards" ON public.custom_flashcards FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));

CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  body text NOT NULL DEFAULT '',
  created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Notifications readable by authed" ON public.notifications FOR SELECT TO authenticated USING (true);
CREATE POLICY "Admins create notifications" ON public.notifications FOR INSERT TO authenticated WITH CHECK (has_role(auth.uid(),'admin'));
CREATE POLICY "Admins delete notifications" ON public.notifications FOR DELETE TO authenticated USING (has_role(auth.uid(),'admin'));
