CREATE TABLE public.teacher_mcq_pending_changes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  teacher_id TEXT NOT NULL,
  topic_key TEXT NOT NULL,
  action TEXT NOT NULL CHECK (action IN ('delete','add')),
  question_index INTEGER,
  new_question JSONB,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
  requested_by UUID,
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.teacher_mcq_pending_changes TO authenticated;
GRANT ALL ON public.teacher_mcq_pending_changes TO service_role;

ALTER TABLE public.teacher_mcq_pending_changes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view pending changes"
  ON public.teacher_mcq_pending_changes FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can insert pending changes"
  ON public.teacher_mcq_pending_changes FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update pending changes"
  ON public.teacher_mcq_pending_changes FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete pending changes"
  ON public.teacher_mcq_pending_changes FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER trg_teacher_mcq_pending_updated
  BEFORE UPDATE ON public.teacher_mcq_pending_changes
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();