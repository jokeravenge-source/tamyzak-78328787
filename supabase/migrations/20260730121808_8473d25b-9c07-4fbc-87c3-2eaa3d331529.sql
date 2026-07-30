select cron.unschedule('exam-plan-notify-daily') where exists (select 1 from cron.job where jobname = 'exam-plan-notify-daily');

select cron.unschedule('exam-plan-notify-slots') where exists (select 1 from cron.job where jobname = 'exam-plan-notify-slots');

select cron.schedule(
  'exam-plan-notify-slots',
  '*/10 * * * *',
  $$
  select net.http_post(
    url := 'https://mwksmqcthfwgvldgbggy.supabase.co/functions/v1/exam-plan-notify',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);