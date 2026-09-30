-- 득점 순위, 선수단, 팀 상세 정보.

alter table public.football_teams
  add column founded int,
  add column venue text,
  add column club_colors text,
  add column website text,
  add column address text,
  add column coach_name text,
  add column coach_nationality text,
  add column squad_synced_at timestamptz;

create table public.football_players (
  id int primary key,
  team_id int references public.football_teams (id) on delete set null,
  name text not null,
  position text,
  date_of_birth date,
  nationality text,
  synced_at timestamptz not null default now()
);
create index football_players_team_idx on public.football_players (team_id);
comment on table public.football_players is '해외축구: 선수단 (공개 읽기, 쓰기는 service_role)';

create table public.football_scorers (
  competition_code text not null references public.football_competitions (code) on delete cascade,
  season_id int not null,
  player_id int not null,
  player_name text not null,
  nationality text,
  position text,
  team_id int references public.football_teams (id),
  played_matches int,
  goals int not null default 0,
  assists int,
  penalties int,
  synced_at timestamptz not null default now(),
  primary key (competition_code, season_id, player_id)
);
create index football_scorers_team_idx on public.football_scorers (team_id);
comment on table public.football_scorers is '해외축구: 리그별 득점 순위 (공개 읽기, 쓰기는 service_role)';

alter table public.football_players enable row level security;
alter table public.football_scorers enable row level security;
create policy "football_players public read" on public.football_players for select to anon, authenticated using (true);
create policy "football_scorers public read" on public.football_scorers for select to anon, authenticated using (true);

-- 선수단 수집: 가장 오래전에 받아온 팀부터 5개씩.
create or replace function public.football_sync_squads()
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
    body := jsonb_build_object('action', 'squads', 'limit', 5),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.football_sync_squads() from public, anon, authenticated;

-- 리그 수집(0~5분)과 겹치지 않는 6분, 8분에 실행해 분당 호출 한도(10회)를 지킨다.
select cron.schedule('football-sync-squads-a', '6-59/10 * * * *', $$select public.football_sync_squads()$$);
select cron.schedule('football-sync-squads-b', '8-59/10 * * * *', $$select public.football_sync_squads()$$);
