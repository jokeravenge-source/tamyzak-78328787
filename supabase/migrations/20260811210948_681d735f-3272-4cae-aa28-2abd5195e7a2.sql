CREATE TABLE IF NOT EXISTS public.point_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  reward text NOT NULL,
  points_spent integer NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT ON public.point_redemptions TO authenticated;
GRANT ALL ON public.point_redemptions TO service_role;

ALTER TABLE public.point_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "own redemptions" ON public.point_redemptions;
CREATE POLICY "own redemptions" ON public.point_redemptions
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE OR REPLACE FUNCTION public.points_balance()
RETURNS integer
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT GREATEST(
    COALESCE((SELECT lifetime_points FROM public.user_progress WHERE user_id = auth.uid()), 0)
    - COALESCE((SELECT sum(points_spent)::int FROM public.point_redemptions WHERE user_id = auth.uid()), 0),
    0)
$$;

CREATE OR REPLACE FUNCTION public.redeem_premium_with_points(_environment text DEFAULT 'live')
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  _uid uuid := auth.uid();
  _cost int := 500;
  _balance int;
  _env text := CASE WHEN _environment = 'sandbox' THEN 'sandbox' ELSE 'live' END;
  _end timestamptz;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'not authenticated'; END IF;

  IF public.has_active_premium(_uid, _env) THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'already_premium');
  END IF;

  _balance := public.points_balance();
  IF _balance < _cost THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'not_enough_points', 'balance', _balance, 'cost', _cost);
  END IF;

  INSERT INTO public.point_redemptions (user_id, reward, points_spent)
  VALUES (_uid, 'premium_30d', _cost);

  _end := now() + interval '30 days';

  INSERT INTO public.subscriptions (
    user_id, paddle_subscription_id, paddle_customer_id, product_id, price_id,
    status, current_period_start, current_period_end, cancel_at_period_end, environment
  ) VALUES (
    _uid, 'points_' || gen_random_uuid()::text, 'points', 'points_premium', 'points_500',
    'active', now(), _end, true, _env
  );

  RETURN jsonb_build_object('ok', true, 'balance', _balance - _cost, 'current_period_end', _end);
END;
$$;