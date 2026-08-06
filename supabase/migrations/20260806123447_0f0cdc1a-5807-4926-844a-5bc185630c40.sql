DROP POLICY IF EXISTS "Owners can update their rooms" ON public.study_rooms;
CREATE POLICY "Owners can update their rooms"
ON public.study_rooms
FOR UPDATE
TO authenticated
USING (owner_id = auth.uid())
WITH CHECK (
  owner_id = auth.uid()
  OR EXISTS (
    SELECT 1 FROM public.study_room_members m
    WHERE m.room_id = study_rooms.id AND m.user_id = study_rooms.owner_id
  )
);