-- 007_cron.sql
-- pg_cron job registration (requires pg_cron extension enabled on the project)
-- On Supabase free/pro tier, pg_cron is available via the Dashboard > Extensions.
-- If pg_cron is not available, expire_orders() can be called from the Edge Function
-- scheduled job (supabase/functions/cron-expire-orders) instead.

-- ============================================================
-- Conditionally create the cron extension and schedule jobs
-- ============================================================
do $$
begin
  -- Attempt to create extension; skip silently if unavailable
  begin
    create extension if not exists pg_cron;
  exception when others then
    raise notice 'pg_cron extension not available – skipping cron job setup. Use Edge Function scheduler instead.';
    return;
  end;

  -- Schedule expire_orders() to run every minute
  perform cron.schedule(
    'rescuebite-expire-orders',
    '* * * * *',
    $cron$ select expire_orders(); $cron$
  );

  raise notice 'pg_cron job "rescuebite-expire-orders" scheduled successfully.';
end;
$$;
