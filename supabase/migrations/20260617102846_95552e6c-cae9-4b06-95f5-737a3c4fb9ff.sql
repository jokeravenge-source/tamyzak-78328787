CREATE TABLE IF NOT EXISTS public.telegram_notifications_sent (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_key text NOT NULL,
  telegram_user_id bigint NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (notification_key, telegram_user_id)
);
GRANT ALL ON public.telegram_notifications_sent TO service_role;
ALTER TABLE public.telegram_notifications_sent ENABLE ROW LEVEL SECURITY;
CREATE POLICY "service role only" ON public.telegram_notifications_sent
  FOR ALL TO service_role USING (true) WITH CHECK (true);