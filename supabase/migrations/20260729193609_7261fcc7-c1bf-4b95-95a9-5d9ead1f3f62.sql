CREATE TABLE public.course_exam_plans (
  user_id uuid PRIMARY KEY,
  subjects text[] NOT NULL DEFAULT '{}',
  start_date date NOT NULL DEFAULT (now() AT TIME ZONE 'Asia/Baghdad')::date,
  interval_days integer NOT NULL DEFAULT 5,
  acknowledged_step integer NOT NULL DEFAULT -1,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.course_exam_plans TO authenticated;
GRANT ALL ON public.course_exam_plans TO service_role;

ALTER TABLE public.course_exam_plans ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own exam plan"
ON public.course_exam_plans FOR ALL TO authenticated
USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Admins can view all exam plans"
ON public.course_exam_plans FOR SELECT TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER course_exam_plans_set_updated_at
BEFORE UPDATE ON public.course_exam_plans
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();