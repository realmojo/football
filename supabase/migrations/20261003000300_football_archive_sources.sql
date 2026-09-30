-- 기록실 보완
-- 1) K리그처럼 상·하위 스플릿이 있는 리그는 파이널 A + 파이널 B 로 최종 순위를 만든다.
-- 2) API-Football 득점 순위는 이적 뒤 기록이 섞인 틀린 값이 있어 쓰지 않고,
--    5대 리그 득점 순위는 football-data.org 지난 시즌 기록(scorers?season=)으로 받는다. K리그 득점 순위는 싣지 않는다.

create or replace function public.football_archive_parse_standings(p_league text, p_season int, body jsonb)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  groups jsonb := body->'response'->0->'league'->'standings';
  champ jsonb;
  releg jsonb;
begin
  delete from public.football_archive_standings where league = p_league and season = p_season;
  select g into champ from jsonb_array_elements(groups) g where g->0->>'group' ilike '%championship round%' limit 1;
  select g into releg from jsonb_array_elements(groups) g where g->0->>'group' ilike '%relegation round%' limit 1;
  if champ is not null and releg is not null then
    insert into public.football_archive_standings
      (league, season, position, team_id, team_name, team_logo, played, won, draw, lost, goals_for, goals_against, points, description)
    select p_league, p_season, (s->>'rank')::int + x.offset_, (s->'team'->>'id')::int, s->'team'->>'name', s->'team'->>'logo',
      (s->'all'->>'played')::int, (s->'all'->>'win')::int, (s->'all'->>'draw')::int, (s->'all'->>'lose')::int,
      (s->'all'->'goals'->>'for')::int, (s->'all'->'goals'->>'against')::int, (s->>'points')::int,
      coalesce(s->>'description', case when x.offset_ = 0 then 'Final Round A' else 'Final Round B' end)
    from (values (champ, 0), (releg, jsonb_array_length(champ))) as x(grp, offset_),
      jsonb_array_elements(x.grp) s
    on conflict do nothing;
  else
    insert into public.football_archive_standings
      (league, season, position, team_id, team_name, team_logo, played, won, draw, lost, goals_for, goals_against, points, description)
    select p_league, p_season, (s->>'rank')::int, (s->'team'->>'id')::int, s->'team'->>'name', s->'team'->>'logo',
      (s->'all'->>'played')::int, (s->'all'->>'win')::int, (s->'all'->>'draw')::int, (s->'all'->>'lose')::int,
      (s->'all'->'goals'->>'for')::int, (s->'all'->'goals'->>'against')::int, (s->>'points')::int, s->>'description'
    from jsonb_array_elements(groups->0) s
    on conflict do nothing;
  end if;
end;
$$;
revoke all on function public.football_archive_parse_standings(text, int, jsonb) from public, anon, authenticated;

alter table public.football_archive_queue drop constraint football_archive_queue_endpoint_check;
alter table public.football_archive_queue add constraint football_archive_queue_endpoint_check
  check (endpoint in ('standings', 'topscorers', 'fd_scorers'));

delete from public.football_archive_scorers;
update public.football_archive_queue set status = 'done', error = 'API-Football 득점 데이터 오류로 사용하지 않음'
where endpoint = 'topscorers';

insert into public.football_archive_queue (league, api_league, season, endpoint)
select l.league, 0, s.season, 'fd_scorers'
from (values ('PL'), ('PD'), ('BL1'), ('SA'), ('FL1')) as l(league)
cross join (values (2022), (2023), (2024)) as s(season)
on conflict do nothing;

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
  fd_token text := (select decrypted_secret from vault.decrypted_secrets where name = 'football_data_token' limit 1);
begin
  for q in
    select a.*, r.status_code, r.content
    from public.football_archive_queue a
    join net._http_response r on r.id = a.request_id
    where a.status = 'sent'
  loop
    begin
      body := q.content::jsonb;
      if q.status_code = 429 or q.status_code >= 500 then
        -- 분당 제한(429)이나 일시적인 서버 오류(5xx)면 다음에 다시 보낸다.
        update public.football_archive_queue set status = 'pending', request_id = null where id = q.id;
        continue;
      end if;
      if q.status_code <> 200 or jsonb_typeof(body->'errors') = 'object' and body->'errors' <> '{}'::jsonb then
        update public.football_archive_queue set status = 'error', error = left(coalesce((body->'errors')::text, q.status_code::text || ' ' || left(q.content, 200)), 500) where id = q.id;
        continue;
      end if;
      if q.endpoint = 'standings' then
        perform public.football_archive_parse_standings(q.league, q.season, body);
      elsif q.endpoint = 'fd_scorers' then
        delete from public.football_archive_scorers where league = q.league and season = q.season;
        insert into public.football_archive_scorers
          (league, season, rank, player_id, player_name, nationality, team_id, team_name, appearances, goals, assists, penalties)
        select q.league, q.season, o.n::int, (s->'player'->>'id')::int, s->'player'->>'name', s->'player'->>'nationality',
          null,
          coalesce((select t.short_name_ko from public.football_teams t where t.id = (s->'team'->>'id')::int), s->'team'->>'shortName', s->'team'->>'name'),
          (s->>'playedMatches')::int, coalesce((s->>'goals')::int, 0), (s->>'assists')::int, (s->>'penalties')::int
        from jsonb_array_elements(body->'scorers') with ordinality as o(s, n);
      end if;
      update public.football_archive_queue set status = 'done', error = null where id = q.id;
    exception when others then
      update public.football_archive_queue set status = 'error', error = left(sqlerrm, 500) where id = q.id;
    end;
  end loop;

  -- API-Football: 1분에 8개까지
  for q in select * from public.football_archive_queue where status = 'pending' and endpoint = 'standings' order by id limit 8 loop
    update public.football_archive_queue
    set status = 'sent',
        request_id = net.http_get(
          url := format('https://v3.football.api-sports.io/standings?league=%s&season=%s', q.api_league, q.season),
          headers := jsonb_build_object('x-apisports-key', key),
          timeout_milliseconds := 30000
        )
    where id = q.id;
  end loop;

  -- football-data.org: 정기 수집과 부딪히지 않게 1분에 1개
  for q in select * from public.football_archive_queue where status = 'pending' and endpoint = 'fd_scorers' order by id limit 1 loop
    update public.football_archive_queue
    set status = 'sent',
        request_id = net.http_get(
          url := format('https://api.football-data.org/v4/competitions/%s/scorers?season=%s&limit=30', q.league, q.season),
          headers := jsonb_build_object('X-Auth-Token', fd_token),
          timeout_milliseconds := 30000
        )
    where id = q.id;
  end loop;
end;
$$;
revoke all on function public.football_archive_tick() from public, anon, authenticated;

update public.football_archive_queue set status = 'pending', request_id = null, error = null
where status = 'error' and error like '5%';
