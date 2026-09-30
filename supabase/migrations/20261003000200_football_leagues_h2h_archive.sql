-- 1) 무료 플랜 추가 리그 수집: 챔피언십, 에레디비시, 프리메이라리가, 브라질 세리에 A
-- 2) 다가오는 경기의 역대 맞대결 저장 (football-data.org head2head)
-- 3) API-Football 무료 플랜(2022~2024 시즌)으로 지난 시즌 최종 순위·득점 순위 저장

-- ── 추가 리그 수집 일정 ─────────────────────────
-- 기존 리그가 0~5분, 선수단이 6·8분을 쓰므로 7분과 9분 자리를 20분 간격으로 나눠 쓴다.
select cron.schedule('football-sync-ELC', '7,27,47 * * * *', $$select public.football_sync('ELC')$$);
select cron.schedule('football-sync-DED', '17,37,57 * * * *', $$select public.football_sync('DED')$$);
select cron.schedule('football-sync-PPL', '9,29,49 * * * *', $$select public.football_sync('PPL')$$);
select cron.schedule('football-sync-BSA', '19,39,59 * * * *', $$select public.football_sync('BSA')$$);

-- ── 역대 맞대결 ─────────────────────────
create table public.football_h2h (
  match_id int primary key,
  home_team_id int not null,
  away_team_id int not null,
  -- 이번 경기 홈팀 기준 지난 맞대결 성적
  number_of_matches int not null,
  total_goals int not null,
  home_wins int not null,
  draws int not null,
  away_wins int not null,
  -- 지난 맞대결 목록 [{id, utcDate, competition, homeTeamId, awayTeamId, homeName, awayName, home, away, winner}]
  matches jsonb not null default '[]',
  fetched_at timestamptz not null default now()
);
create index football_h2h_pair_idx on public.football_h2h (least(home_team_id, away_team_id), greatest(home_team_id, away_team_id));
comment on table public.football_h2h is '해외축구: 경기별 역대 맞대결 (공개 읽기, 쓰기는 service_role)';
alter table public.football_h2h enable row level security;
create policy "football_h2h public read" on public.football_h2h for select to anon, authenticated using (true);

-- 10분마다 다가오는 경기 2개씩 맞대결을 받아온다.
create or replace function public.football_sync_h2h()
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
    body := jsonb_build_object('action', 'h2h', 'limit', 2),
    timeout_milliseconds := 60000
  );
end;
$$;
revoke all on function public.football_sync_h2h() from public, anon, authenticated;
select cron.schedule('football-sync-h2h', '9-59/10 * * * *', $$select public.football_sync_h2h()$$);

-- ── 지난 시즌 기록 (API-Football) ─────────────────────────
-- Vault: api_football_key
create table public.football_archive_standings (
  league text not null,
  season int not null,
  position int not null,
  team_id int not null,
  team_name text not null,
  team_logo text,
  played int not null,
  won int not null,
  draw int not null,
  lost int not null,
  goals_for int not null,
  goals_against int not null,
  points int not null,
  description text,
  primary key (league, season, position)
);

create table public.football_archive_scorers (
  league text not null,
  season int not null,
  rank int not null,
  player_id int not null,
  player_name text not null,
  nationality text,
  team_id int,
  team_name text,
  appearances int,
  goals int not null,
  assists int,
  penalties int,
  primary key (league, season, rank)
);

-- API-Football 팀 한글 이름 (지난 시즌 기록 화면용)
create table public.football_archive_team_names (
  team_id int primary key,
  name_ko text not null
);

comment on table public.football_archive_standings is '해외축구: 지난 시즌 최종 순위 (API-Football, 공개 읽기)';
comment on table public.football_archive_scorers is '해외축구: 지난 시즌 득점 순위 (API-Football, 공개 읽기)';
comment on table public.football_archive_team_names is '해외축구: 지난 시즌 기록용 팀 한글 이름 (공개 읽기)';
alter table public.football_archive_standings enable row level security;
alter table public.football_archive_scorers enable row level security;
alter table public.football_archive_team_names enable row level security;
create policy "football_archive_standings public read" on public.football_archive_standings for select to anon, authenticated using (true);
create policy "football_archive_scorers public read" on public.football_archive_scorers for select to anon, authenticated using (true);
create policy "football_archive_team_names public read" on public.football_archive_team_names for select to anon, authenticated using (true);

-- 받아올 목록. 무료 플랜은 분당 10회 제한이라 1분에 몇 개씩 나눠 보낸다.
create table public.football_archive_queue (
  id serial primary key,
  league text not null,
  api_league int not null,
  season int not null,
  endpoint text not null check (endpoint in ('standings', 'topscorers')),
  request_id bigint,
  status text not null default 'pending' check (status in ('pending', 'sent', 'done', 'error')),
  error text,
  unique (league, season, endpoint)
);
alter table public.football_archive_queue enable row level security;

create or replace function public.football_archive_tick()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  q record;
  body jsonb;
  key text := (select decrypted_secret from vault.decrypted_secrets where name = 'api_football_key' limit 1);
begin
  -- 도착한 응답을 저장한다.
  for q in
    select a.*, r.status_code, r.content
    from public.football_archive_queue a
    join net._http_response r on r.id = a.request_id
    where a.status = 'sent'
  loop
    begin
      body := q.content::jsonb;
      if q.status_code <> 200 or jsonb_typeof(body->'errors') = 'object' and body->'errors' <> '{}'::jsonb then
        update public.football_archive_queue set status = 'error', error = left(coalesce((body->'errors')::text, q.status_code::text), 500) where id = q.id;
        continue;
      end if;
      if q.endpoint = 'standings' then
        delete from public.football_archive_standings where league = q.league and season = q.season;
        insert into public.football_archive_standings
          (league, season, position, team_id, team_name, team_logo, played, won, draw, lost, goals_for, goals_against, points, description)
        select q.league, q.season, (s->>'rank')::int, (s->'team'->>'id')::int, s->'team'->>'name', s->'team'->>'logo',
          (s->'all'->>'played')::int, (s->'all'->>'win')::int, (s->'all'->>'draw')::int, (s->'all'->>'lose')::int,
          (s->'all'->'goals'->>'for')::int, (s->'all'->'goals'->>'against')::int, (s->>'points')::int, s->>'description'
        from jsonb_array_elements(body->'response'->0->'league'->'standings'->0) s
        on conflict do nothing;
      else
        delete from public.football_archive_scorers where league = q.league and season = q.season;
        insert into public.football_archive_scorers
          (league, season, rank, player_id, player_name, nationality, team_id, team_name, appearances, goals, assists, penalties)
        select q.league, q.season, o.n::int, (p->'player'->>'id')::int, p->'player'->>'name', p->'player'->>'nationality',
          (p->'statistics'->0->'team'->>'id')::int, p->'statistics'->0->'team'->>'name',
          (p->'statistics'->0->'games'->>'appearences')::int,
          coalesce((p->'statistics'->0->'goals'->>'total')::int, 0),
          (p->'statistics'->0->'goals'->>'assists')::int,
          (p->'statistics'->0->'penalty'->>'scored')::int
        from jsonb_array_elements(body->'response') with ordinality as o(p, n);
      end if;
      update public.football_archive_queue set status = 'done', error = null where id = q.id;
    exception when others then
      update public.football_archive_queue set status = 'error', error = left(sqlerrm, 500) where id = q.id;
    end;
  end loop;

  -- 새 요청은 1분에 8개까지.
  for q in select * from public.football_archive_queue where status = 'pending' order by id limit 8 loop
    update public.football_archive_queue
    set status = 'sent',
        request_id = net.http_get(
          url := format('https://v3.football.api-sports.io/%s?league=%s&season=%s', q.endpoint, q.api_league, q.season),
          headers := jsonb_build_object('x-apisports-key', key),
          timeout_milliseconds := 30000
        )
    where id = q.id;
  end loop;
end;
$$;
revoke all on function public.football_archive_tick() from public, anon, authenticated;

-- 5대 리그와 K리그1의 2022~2024 시즌
insert into public.football_archive_queue (league, api_league, season, endpoint)
select l.league, l.api, s.season, e.endpoint
from (values ('PL', 39), ('PD', 140), ('BL1', 78), ('SA', 135), ('FL1', 61), ('KL1', 292)) as l(league, api)
cross join (values (2022), (2023), (2024)) as s(season)
cross join (values ('standings'), ('topscorers')) as e(endpoint)
on conflict do nothing;

-- 목록을 다 받으면 멈춰도 되지만, 대기 중인 항목이 없으면 아무 일도 하지 않는다.
select cron.schedule('football-archive-tick', '* * * * *', $$select public.football_archive_tick()$$);
