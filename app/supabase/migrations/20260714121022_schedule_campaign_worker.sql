create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;

select cron.schedule(
  'zenno-campaign-worker',
  '* * * * *',
  $job$
    select net.http_get(
      url := 'https://zen-agent.vercel.app/api/internal/campaigns/process',
      headers := jsonb_build_object(
        'Authorization',
        'Bearer ' || (select decrypted_secret from vault.decrypted_secrets where name = 'zenno_campaign_cron_secret')
      ),
      timeout_milliseconds := 50000
    );
  $job$
);
