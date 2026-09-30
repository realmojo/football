-- football-sync Edge Function 설정과 주기 실행.
-- Vault 비밀값 (마이그레이션에 넣지 않고 따로 등록한다):
--   football_data_token : football-data.org API 토큰
--   football_sync_token : Edge Function 호출 토큰 (임의 문자열)

-- Edge Function 이 service_role 로 설정을 읽는다.
create or replace function public.football_sync_config()
returns table (sync_token text, api_token text)
language sql
security definer
set search_path = ''
as $$
  select
    (select decrypted_secret from vault.decrypted_secrets where name = 'football_sync_token' limit 1),
    (select decrypted_secret from vault.decrypted_secrets where name = 'football_data_token' limit 1);
$$;
revoke all on function public.football_sync_config() from public, anon, authenticated;
grant execute on function public.football_sync_config() to service_role;

-- 리그 하나를 동기화하도록 Edge Function 을 호출한다 (pg_net, 비동기).
create or replace function public.football_sync(code text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  token text := (select decrypted_secret from vault.decrypted_secrets where name = 'football_sync_token' limit 1);
begin
  return net.http_post(
    url := 'https://mbxdcxlxugsnmljzdlkp.supabase.co/functions/v1/football-sync',
    headers := jsonb_build_object('content-type', 'application/json', 'x-sync-token', token),
    body := jsonb_build_object('competition', code),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.football_sync(text) from public, anon, authenticated;

create or replace function public.football_sync_prune()
returns void
language sql
security definer
set search_path = ''
as $$
  delete from public.football_sync_log where created_at < now() - interval '14 days';
$$;
revoke all on function public.football_sync_prune() from public, anon, authenticated;

-- 무료 플랜은 분당 10회 제한. 리그당 2회 호출이므로 1분씩 어긋나게 10분마다 실행한다.
select cron.schedule('football-sync-PL',  '0-59/10 * * * *', $$select public.football_sync('PL')$$);
select cron.schedule('football-sync-PD',  '1-59/10 * * * *', $$select public.football_sync('PD')$$);
select cron.schedule('football-sync-BL1', '2-59/10 * * * *', $$select public.football_sync('BL1')$$);
select cron.schedule('football-sync-SA',  '3-59/10 * * * *', $$select public.football_sync('SA')$$);
select cron.schedule('football-sync-FL1', '4-59/10 * * * *', $$select public.football_sync('FL1')$$);
select cron.schedule('football-sync-CL',  '5-59/10 * * * *', $$select public.football_sync('CL')$$);
select cron.schedule('football-sync-prune', '30 19 * * *', $$select public.football_sync_prune()$$);
