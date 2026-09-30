-- 팀 한글 이름. football-sync 는 이 컬럼을 건드리지 않는다(지정한 컬럼만 upsert).
alter table public.football_teams
  add column name_ko text,
  add column short_name_ko text;
