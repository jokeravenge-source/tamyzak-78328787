
-- Student profile (goals/onboarding)
CREATE TABLE public.student_profile (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  exam_date date,
  target_grade integer CHECK (target_grade >= 0 AND target_grade <= 100),
  track text,
  weekly_goal_hours integer DEFAULT 14,
  study_window text,
  weak_subjects text[] DEFAULT '{}',
  onboarded boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.student_profile TO authenticated;
GRANT ALL ON public.student_profile TO service_role;
ALTER TABLE public.student_profile ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own profile select" ON public.student_profile FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own profile insert" ON public.student_profile FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own profile update" ON public.student_profile FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_student_profile_updated BEFORE UPDATE ON public.student_profile FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Daily report cache (AI insights)
CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  report_date date NOT NULL,
  language text NOT NULL DEFAULT 'en',
  focused_minutes integer NOT NULL DEFAULT 0,
  sessions_count integer NOT NULL DEFAULT 0,
  missions_completed integer NOT NULL DEFAULT 0,
  points_earned integer NOT NULL DEFAULT 0,
  subjects_breakdown jsonb NOT NULL DEFAULT '[]',
  ai_summary text,
  ai_strengths jsonb DEFAULT '[]',
  ai_weaknesses jsonb DEFAULT '[]',
  ai_plan jsonb DEFAULT '[]',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, report_date, language)
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.daily_reports TO authenticated;
GRANT ALL ON public.daily_reports TO service_role;
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own reports select" ON public.daily_reports FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own reports insert" ON public.daily_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own reports update" ON public.daily_reports FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_daily_reports_updated BEFORE UPDATE ON public.daily_reports FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE INDEX idx_daily_reports_user_date ON public.daily_reports (user_id, report_date DESC);

-- Parent follow-up links
CREATE TABLE public.parent_follow_links (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  token text NOT NULL UNIQUE,
  parent_name text,
  enabled boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  revoked_at timestamptz
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.parent_follow_links TO authenticated;
GRANT ALL ON public.parent_follow_links TO service_role;
ALTER TABLE public.parent_follow_links ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own links select" ON public.parent_follow_links FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "own links insert" ON public.parent_follow_links FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own links update" ON public.parent_follow_links FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own links delete" ON public.parent_follow_links FOR DELETE TO authenticated USING (auth.uid() = user_id);
