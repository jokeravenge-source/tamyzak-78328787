
-- Profiles for leaderboard display names
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL UNIQUE,
  display_name TEXT NOT NULL DEFAULT 'Student',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Profiles readable by authed" ON public.profiles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users insert own profile" ON public.profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Advice topics
CREATE TABLE public.advice_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advice_topics ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Topics readable by authed" ON public.advice_topics FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own topics" ON public.advice_topics FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own topics" ON public.advice_topics FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any topic" ON public.advice_topics FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Advice comments
CREATE TABLE public.advice_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES public.advice_topics(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  author_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.advice_comments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Comments readable by authed" ON public.advice_comments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own comments" ON public.advice_comments FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own comments" ON public.advice_comments FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins delete any comment" ON public.advice_comments FOR DELETE TO authenticated USING (has_role(auth.uid(), 'admin'));

-- Study sessions
CREATE TABLE public.study_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  subject TEXT NOT NULL,
  mission TEXT NOT NULL,
  duration_seconds INTEGER NOT NULL DEFAULT 0,
  mission_completed BOOLEAN NOT NULL DEFAULT false,
  points INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
ALTER TABLE public.study_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Sessions readable by authed" ON public.study_sessions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users create own sessions" ON public.study_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own sessions" ON public.study_sessions FOR DELETE TO authenticated USING (auth.uid() = user_id);
