-- 선수 한글 이름 (득점 순위·선수 페이지용). 없으면 영어 이름을 쓴다.
create table public.football_player_names (
  player_id int primary key,
  name_ko text not null
);
comment on table public.football_player_names is '해외축구: 선수 한글 이름 (공개 읽기, 쓰기는 service_role)';
alter table public.football_player_names enable row level security;
create policy "football_player_names public read" on public.football_player_names for select to anon, authenticated using (true);
