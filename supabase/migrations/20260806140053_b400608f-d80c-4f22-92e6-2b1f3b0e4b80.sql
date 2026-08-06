CREATE POLICY "Admins can update any room"
ON public.study_rooms FOR UPDATE TO authenticated
USING (public.has_role(auth.uid(), 'admin'))
WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete any room"
ON public.study_rooms FOR DELETE TO authenticated
USING (public.has_role(auth.uid(), 'admin'));