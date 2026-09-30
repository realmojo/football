-- 컵대회(월드컵) 지원: 연장·승부차기 스코어를 따로 저장한다.
-- football-data.org 는 승부차기 경기의 fullTime 에 승부차기 골까지 더해서 준다.

alter table public.football_matches
  add column duration text,
  add column home_regular int,
  add column away_regular int,
  add column home_extra int,
  add column away_extra int,
  add column home_pen int,
  add column away_pen int;

-- 월드컵은 대회가 끝났으므로 하루 한 번만 받는다. (리그 수집·선수단 수집과 겹치지 않는 7분)
select cron.schedule('football-sync-WC', '7 19 * * *', $$select public.football_sync('WC')$$);
