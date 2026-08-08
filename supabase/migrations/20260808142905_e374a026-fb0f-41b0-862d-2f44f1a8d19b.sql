-- 1. user_progress: cached lifetime total + streak state
CREATE TABLE public.user_progress (
  user_id uuid PRIMARY KEY,
  lifetime_points integer NOT NULL DEFAULT 0,
  current_streak integer NOT NULL DEFAULT 0,
  longest_streak integer NOT NULL DEFAULT 0,
  last_active_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.user_progress TO authenticated;
GRANT ALL ON public.user_progress TO service_role;

ALTER TABLE public.user_progress ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Admins can view all progress"
  ON public.user_progress FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role));

CREATE TRIGGER user_progress_set_updated_at
  BEFORE UPDATE ON public.user_progress
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- 2. feature_unlocks: static tier config
CREATE TABLE public.feature_unlocks (
  feature_key text PRIMARY KEY,
  display_name_en text NOT NULL,
  display_name_ar text NOT NULL,
  unlock_threshold integer NOT NULL,
  sort_order integer NOT NULL,
  icon text NOT NULL DEFAULT 'sparkles',
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.feature_unlocks TO anon, authenticated;
GRANT ALL ON public.feature_unlocks TO service_role;

ALTER TABLE public.feature_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view feature tiers"
  ON public.feature_unlocks FOR SELECT
  USING (true);

CREATE POLICY "Admins manage feature tiers"
  ON public.feature_unlocks FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

INSERT INTO public.feature_unlocks (feature_key, display_name_en, display_name_ar, unlock_threshold, sort_order, icon) VALUES
  ('mind_maps',        'Mind Maps',        'الخرائط الذهنية', 400,  1, 'network'),
  ('notebooks',        'Notebooks',        'الدفاتر',          550,  2, 'notebook'),
  ('canvas',           'Canvas',           'اللوحة',           750,  3, 'pen-tool'),
  ('math_tools_suite', 'Math Tools Suite', 'أدوات الرياضيات', 1000, 4, 'calculator');

-- 3. user_feature_unlocks
CREATE TABLE public.user_feature_unlocks (
  user_id uuid NOT NULL,
  feature_key text NOT NULL REFERENCES public.feature_unlocks(feature_key) ON DELETE CASCADE,
  unlocked_at timestamptz NOT NULL DEFAULT now(),
  celebrated boolean NOT NULL DEFAULT false,
  PRIMARY KEY (user_id, feature_key)
);

GRANT SELECT, UPDATE ON public.user_feature_unlocks TO authenticated;
GRANT ALL ON public.user_feature_unlocks TO service_role;

ALTER TABLE public.user_feature_unlocks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own unlocks"
  ON public.user_feature_unlocks FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can mark their own unlock celebrated"
  ON public.user_feature_unlocks FOR UPDATE TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- 4. Keep lifetime_points in sync with EVERY user_points insert (all existing sources included)
CREATE OR REPLACE FUNCTION public.sync_user_progress_points()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.user_progress (user_id, lifetime_points)
  VALUES (NEW.user_id, GREATEST(COALESCE(NEW.points, 0), 0))
  ON CONFLICT (user_id) DO UPDATE
    SET lifetime_points = public.user_progress.lifetime_points + GREATEST(COALESCE(NEW.points, 0), 0),
        updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER user_points_sync_progress
  AFTER INSERT ON public.user_points
  FOR EACH ROW EXECUTE FUNCTION public.sync_user_progress_points();

-- Backfill from existing history
INSERT INTO public.user_progress (user_id, lifetime_points)
SELECT user_id, GREATEST(SUM(points), 0)::int
FROM public.user_points
GROUP BY user_id
ON CONFLICT (user_id) DO UPDATE SET lifetime_points = EXCLUDED.lifetime_points;

-- 5. Award function
CREATE OR REPLACE FUNCTION public.award_points(_action_type text, _metadata jsonb DEFAULT '{}'::jsonb)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _today date := (now() AT TIME ZONE 'Asia/Baghdad')::date;
  _value int;
  _cap int;
  _used int;
  _awarded int := 0;
  _streak int := 0;
  _longest int := 0;
  _last date;
  _bonus int := 0;
  _bonus_action text;
  _total int;
  _new_unlocks jsonb := '[]'::jsonb;
BEGIN
  IF _uid IS NULL THEN
    RAISE EXCEPTION 'not authenticated';
  END IF;

  SELECT v.pts, v.cap INTO _value, _cap FROM (VALUES
    ('daily_login',       10, 1),
    ('flashcard_session', 15, 3),
    ('mcq_quiz',          15, 3),
    ('ministerial_set',   20, 3),
    ('video_to_notes',    10, 3),
    ('accuracy_bonus',    10, 3)
  ) AS v(act, pts, cap) WHERE v.act = _action_type;

  IF _value IS NULL THEN
    RAISE EXCEPTION 'invalid action_type: %', _action_type;
  END IF;

  INSERT INTO public.user_progress (user_id) VALUES (_uid)
  ON CONFLICT (user_id) DO NOTHING;

  SELECT count(*) INTO _used
  FROM public.user_points
  WHERE user_id = _uid
    AND source = _action_type
    AND (created_at AT TIME ZONE 'Asia/Baghdad')::date = _today;

  IF _used < _cap THEN
    _awarded := _value;
    INSERT INTO public.user_points (user_id, source, points, ref_id)
    VALUES (_uid, _action_type, _awarded, _metadata->>'ref_id');
  END IF;

  -- Streak (only advanced by an actually-awarded action)
  SELECT last_active_date, current_streak, longest_streak
    INTO _last, _streak, _longest
  FROM public.user_progress WHERE user_id = _uid FOR UPDATE;

  IF _awarded > 0 THEN
    IF _last = _today THEN
      NULL;
    ELSIF _last = _today - 1 THEN
      _streak := COALESCE(_streak, 0) + 1;
    ELSE
      _streak := 1;
    END IF;
    _longest := GREATEST(COALESCE(_longest, 0), _streak);

    UPDATE public.user_progress
      SET current_streak = _streak,
          longest_streak = _longest,
          last_active_date = _today,
          updated_at = now()
      WHERE user_id = _uid;

    IF _last IS DISTINCT FROM _today THEN
      _bonus_action := CASE _streak WHEN 3 THEN 'streak_3' WHEN 7 THEN 'streak_7' WHEN 14 THEN 'streak_14' ELSE NULL END;
      _bonus := CASE _streak WHEN 3 THEN 50 WHEN 7 THEN 150 WHEN 14 THEN 400 ELSE 0 END;
      IF _bonus > 0 THEN
        INSERT INTO public.user_points (user_id, source, points, ref_id)
        VALUES (_uid, _bonus_action, _bonus, _today::text);
      END IF;
    END IF;
  END IF;

  SELECT lifetime_points INTO _total FROM public.user_progress WHERE user_id = _uid;

  WITH ins AS (
    INSERT INTO public.user_feature_unlocks (user_id, feature_key)
    SELECT _uid, f.feature_key
    FROM public.feature_unlocks f
    WHERE f.unlock_threshold <= _total
      AND NOT EXISTS (
        SELECT 1 FROM public.user_feature_unlocks u
        WHERE u.user_id = _uid AND u.feature_key = f.feature_key)
    RETURNING feature_key
  )
  SELECT COALESCE(jsonb_agg(feature_key), '[]'::jsonb) INTO _new_unlocks FROM ins;

  RETURN jsonb_build_object(
    'awarded', _awarded,
    'streak_bonus', _bonus,
    'streak_action', _bonus_action,
    'lifetime_points', _total,
    'current_streak', _streak,
    'longest_streak', _longest,
    'new_unlocks', _new_unlocks
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.award_points(text, jsonb) TO authenticated;