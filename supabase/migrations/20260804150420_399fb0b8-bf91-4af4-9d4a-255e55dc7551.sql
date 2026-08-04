CREATE TABLE public.study_rooms (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text NOT NULL UNIQUE,
  name text NOT NULL,
  subject text,
  owner_id uuid NOT NULL,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_rooms TO authenticated;
GRANT ALL ON public.study_rooms TO service_role;
ALTER TABLE public.study_rooms ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.study_room_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Student',
  joined_at timestamptz NOT NULL DEFAULT now(),
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (room_id, user_id)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.study_room_members TO authenticated;
GRANT ALL ON public.study_room_members TO service_role;
ALTER TABLE public.study_room_members ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.study_room_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id uuid NOT NULL REFERENCES public.study_rooms(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  display_name text NOT NULL DEFAULT 'Student',
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, DELETE ON public.study_room_messages TO authenticated;
GRANT ALL ON public.study_room_messages TO service_role;
ALTER TABLE public.study_room_messages ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_study_room_member(_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_room_members WHERE room_id = _room AND user_id = auth.uid());
$$;

CREATE POLICY "Signed-in users can look up rooms"
  ON public.study_rooms FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can create their own rooms"
  ON public.study_rooms FOR INSERT TO authenticated WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can update their rooms"
  ON public.study_rooms FOR UPDATE TO authenticated USING (owner_id = auth.uid()) WITH CHECK (owner_id = auth.uid());
CREATE POLICY "Owners can delete their rooms"
  ON public.study_rooms FOR DELETE TO authenticated USING (owner_id = auth.uid());

CREATE POLICY "Members can see room members"
  ON public.study_room_members FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_study_room_member(room_id));
CREATE POLICY "Users can join rooms themselves"
  ON public.study_room_members FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can update their membership"
  ON public.study_room_members FOR UPDATE TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY "Users can leave rooms"
  ON public.study_room_members FOR DELETE TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Members can read room messages"
  ON public.study_room_messages FOR SELECT TO authenticated USING (public.is_study_room_member(room_id));
CREATE POLICY "Members can send messages"
  ON public.study_room_messages FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid() AND public.is_study_room_member(room_id));
CREATE POLICY "Authors and admins can delete messages"
  ON public.study_room_messages FOR DELETE TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER study_rooms_set_updated_at BEFORE UPDATE ON public.study_rooms
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.study_room_members;