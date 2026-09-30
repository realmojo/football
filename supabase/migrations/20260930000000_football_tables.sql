-- 해외축구 데이터 (football-data.org v4) 저장 테이블.
-- 쓰기는 Edge Function football-sync(service_role)만, 읽기는 누구나 가능하다.

create table public.football_competitions (
  code text primary key,
  id int not null,
  name text not null,
  emblem text,
  season_id int,
  season_start date,
  season_end date,
  current_matchday int,
  synced_at timestamptz not null default now()
);
comment on table public.football_competitions is '해외축구: 리그와 현재 시즌 정보 (공개 읽기, 쓰기는 service_role)';

create table public.football_teams (
  id int primary key,
  name text not null,
  short_name text,
  tla text,
  crest text,
  synced_at timestamptz not null default now()
);
comment on table public.football_teams is '해외축구: 팀 (공개 읽기, 쓰기는 service_role)';

create table public.football_matches (
  id int primary key,
  competition_code text not null references public.football_competitions (code) on delete cascade,
  season_id int not null,
  utc_date timestamptz not null,
  status text not null,
  matchday int,
  stage text,
  group_name text,
  home_team_id int references public.football_teams (id),
  away_team_id int references public.football_teams (id),
  winner text,
  home_score int,
  away_score int,
  home_half int,
  away_half int,
  last_updated timestamptz,
  synced_at timestamptz not null default now()
);
create index football_matches_competition_idx on public.football_matches (competition_code, season_id, utc_date);
create index football_matches_home_idx on public.football_matches (home_team_id);
create index football_matches_away_idx on public.football_matches (away_team_id);
comment on table public.football_matches is '해외축구: 경기 일정과 결과 (공개 읽기, 쓰기는 service_role)';

create table public.football_standings (
  competition_code text not null references public.football_competitions (code) on delete cascade,
  season_id int not null,
  stage text not null,
  type text not null,
  group_name text not null default '',
  team_id int not null references public.football_teams (id),
  position int not null,
  played int not null,
  won int not null,
  draw int not null,
  lost int not null,
  points int not null,
  goals_for int not null,
  goals_against int not null,
  goal_difference int not null,
  form text,
  synced_at timestamptz not null default now(),
  primary key (competition_code, season_id, stage, type, group_name, team_id)
);
create index football_standings_team_idx on public.football_standings (team_id);
comment on table public.football_standings is '해외축구: 순위표 (공개 읽기, 쓰기는 service_role)';

create table public.football_sync_log (
  id bigint generated always as identity primary key,
  competition_code text not null,
  matches int,
  standings int,
  error text,
  created_at timestamptz not null default now()
);
create index football_sync_log_created_idx on public.football_sync_log (created_at desc);
comment on table public.football_sync_log is '해외축구 데이터 동기화 기록. service_role 만 접근.';

alter table public.football_competitions enable row level security;
alter table public.football_teams enable row level security;
alter table public.football_matches enable row level security;
alter table public.football_standings enable row level security;
alter table public.football_sync_log enable row level security;

create policy "football_competitions public read" on public.football_competitions for select to anon, authenticated using (true);
create policy "football_teams public read" on public.football_teams for select to anon, authenticated using (true);
create policy "football_matches public read" on public.football_matches for select to anon, authenticated using (true);
create policy "football_standings public read" on public.football_standings for select to anon, authenticated using (true);
