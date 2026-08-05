CREATE TABLE public.study_room_bans (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.study_rooms(id) on delete cascade,
  user_id uuid not null,
  display_name text,
  banned_by uuid not null,
  created_at timestamptz not null default now(),
  unique (room_id, user_id)
);

GRANT SELECT, INSERT, DELETE ON public.study_room_bans TO authenticated;
GRANT ALL ON public.study_room_bans TO service_role;

ALTER TABLE public.study_room_bans ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_study_room_owner(_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_rooms WHERE id = _room AND owner_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.is_banned_from_room(_room uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$
  SELECT EXISTS (SELECT 1 FROM public.study_room_bans WHERE room_id = _room AND user_id = auth.uid());
$$;

CREATE POLICY "Members and owners can read bans" ON public.study_room_bans
FOR SELECT TO authenticated
USING (public.is_study_room_owner(room_id) OR user_id = auth.uid());

CREATE POLICY "Owners can ban" ON public.study_room_bans
FOR INSERT TO authenticated
WITH CHECK (public.is_study_room_owner(room_id) AND banned_by = auth.uid() AND user_id <> auth.uid());

CREATE POLICY "Owners can unban" ON public.study_room_bans
FOR DELETE TO authenticated
USING (public.is_study_room_owner(room_id));

DROP POLICY IF EXISTS "Authors and admins can delete messages" ON public.study_room_messages;
CREATE POLICY "Authors owners and admins can delete messages" ON public.study_room_messages
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_study_room_owner(room_id) OR public.has_role(auth.uid(), 'admin'::app_role));

DROP POLICY IF EXISTS "Users can leave rooms" ON public.study_room_members;
CREATE POLICY "Users can leave or owners can kick" ON public.study_room_members
FOR DELETE TO authenticated
USING (user_id = auth.uid() OR public.is_study_room_owner(room_id));

DROP POLICY IF EXISTS "Users can join rooms themselves" ON public.study_room_members;
CREATE POLICY "Users can join rooms themselves" ON public.study_room_members
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND NOT public.is_banned_from_room(room_id));

DROP POLICY IF EXISTS "Members can send messages" ON public.study_room_messages;
CREATE POLICY "Members can send messages" ON public.study_room_messages
FOR INSERT TO authenticated
WITH CHECK (user_id = auth.uid() AND public.is_study_room_member(room_id) AND NOT public.is_banned_from_room(room_id));