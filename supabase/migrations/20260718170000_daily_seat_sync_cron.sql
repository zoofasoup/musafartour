-- Enable extensions needed to run scheduled HTTP calls from Postgres.
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

-- Daily sync of Sisa Seat (slots_total / slots_filled only) from the Google
-- Sheet into the packages table, via the sync-seats edge function.
-- Runs at 17:00 UTC = 00:00 WIB (Asia/Jakarta).
SELECT cron.schedule(
  'daily-seat-sync',
  '0 17 * * *',
  $$
  SELECT net.http_post(
    url := 'https://lcpjuaxiwbdzdozitwzi.supabase.co/functions/v1/sync-seats',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxjcGp1YXhpd2JkemRveml0d3ppIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQxMDM4NDUsImV4cCI6MjA5OTY3OTg0NX0.vj42rEICtLaREhNm1f2HfgNKbfZonV46ZTrf5lvDFvA'
    ),
    body := '{}'::jsonb
  );
  $$
);
