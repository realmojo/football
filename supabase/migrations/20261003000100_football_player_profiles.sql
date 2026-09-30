-- 선수 소개(해외파 한국 선수). 선수단 수집으로 선수 행이 바뀌어도 소개가 남도록 외래 키를 걸지 않는다.
create table public.football_player_profiles (
  player_id int primary key,
  name_ko text not null,
  -- 신뢰할 수 있는 HTML 문단
  intro text not null,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.football_player_profiles is '해외축구: 선수 소개 (공개 읽기, 쓰기는 service_role)';

alter table public.football_player_profiles enable row level security;
create policy "football_player_profiles public read" on public.football_player_profiles
  for select to anon, authenticated using (true);

create trigger football_player_profiles_touch
  before update on public.football_player_profiles
  for each row execute function public.football_articles_touch();
