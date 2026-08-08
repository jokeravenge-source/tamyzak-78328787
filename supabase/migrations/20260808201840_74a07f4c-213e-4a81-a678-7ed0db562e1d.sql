
CREATE TABLE public.referral_codes (
  user_id uuid NOT NULL PRIMARY KEY,
  code text NOT NULL UNIQUE,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referral_codes TO authenticated;
GRANT ALL ON public.referral_codes TO service_role;
ALTER TABLE public.referral_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Own referral code readable" ON public.referral_codes
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE TABLE public.referrals (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  referrer_id uuid NOT NULL,
  referred_id uuid NOT NULL UNIQUE,
  code text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.referrals TO authenticated;
GRANT ALL ON public.referrals TO service_role;
ALTER TABLE public.referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "See own referrals" ON public.referrals
  FOR SELECT TO authenticated USING (referrer_id = auth.uid() OR referred_id = auth.uid());
CREATE INDEX idx_referrals_referrer ON public.referrals(referrer_id);

CREATE OR REPLACE FUNCTION public.get_my_referral_code()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _code text;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
  IF _code IS NOT NULL THEN RETURN _code; END IF;

  FOR i IN 1..10 LOOP
    _code := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 7));
    BEGIN
      INSERT INTO public.referral_codes (user_id, code) VALUES (_uid, _code);
      RETURN _code;
    EXCEPTION WHEN unique_violation THEN
      SELECT code INTO _code FROM public.referral_codes WHERE user_id = _uid;
      IF _code IS NOT NULL THEN RETURN _code; END IF;
    END;
  END LOOP;
  RAISE EXCEPTION 'could not generate referral code';
END;
$$;

CREATE OR REPLACE FUNCTION public.redeem_referral(_code text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _referrer uuid;
  _norm text := upper(trim(coalesce(_code, '')));
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;
  IF _norm = '' THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;

  IF EXISTS (SELECT 1 FROM public.referrals WHERE referred_id = _uid) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_referred');
  END IF;

  SELECT user_id INTO _referrer FROM public.referral_codes WHERE code = _norm;
  IF _referrer IS NULL THEN RETURN jsonb_build_object('ok', false, 'reason', 'invalid_code'); END IF;
  IF _referrer = _uid THEN RETURN jsonb_build_object('ok', false, 'reason', 'self_referral'); END IF;

  -- Only brand-new accounts (first 7 days) can redeem an invite
  IF NOT EXISTS (
    SELECT 1 FROM auth.users WHERE id = _uid AND created_at > now() - interval '7 days'
  ) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'account_too_old');
  END IF;

  INSERT INTO public.referrals (referrer_id, referred_id, code)
  VALUES (_referrer, _uid, _norm);

  INSERT INTO public.user_points (user_id, source, points, ref_id)
  VALUES (_referrer, 'referral', 30, _uid::text)
  ON CONFLICT (user_id, source, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;

  INSERT INTO public.user_points (user_id, source, points, ref_id)
  VALUES (_uid, 'referral_bonus', 30, _referrer::text)
  ON CONFLICT (user_id, source, ref_id) WHERE ref_id IS NOT NULL DO NOTHING;

  RETURN jsonb_build_object('ok', true, 'points', 30);
END;
$$;

CREATE OR REPLACE FUNCTION public.my_referral_stats()
RETURNS jsonb
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT jsonb_build_object(
    'invited', (SELECT count(*) FROM public.referrals WHERE referrer_id = auth.uid()),
    'points', (SELECT COALESCE(sum(points),0) FROM public.user_points
                WHERE user_id = auth.uid() AND source IN ('referral','referral_bonus'))
  );
$$;
