-- Activate scheduled campaigns and close expired campaigns once per minute.
create extension if not exists pg_cron with schema pg_catalog;

select cron.schedule(
  'step6-refresh-earning-campaigns',
  '* * * * *',
  $job$select private.refresh_earning_campaign_states();$job$
)
where not exists (
  select 1 from cron.job where jobname='step6-refresh-earning-campaigns'
);
