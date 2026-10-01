-- 더비·라이벌전 소개. 역대 맞대결 기록은 football_h2h, 일정은 football_matches 에서 붙인다.
create table public.football_derbies (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null,
  english text,
  league text not null,
  team_a int not null,
  team_b int not null,
  -- 신뢰할 수 있는 HTML 문단
  intro text not null,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.football_derbies is '해외축구: 더비·라이벌전 소개 (공개 읽기, 쓰기는 service_role)';
alter table public.football_derbies enable row level security;
create policy "football_derbies public read" on public.football_derbies for select to anon, authenticated using (true);
create trigger football_derbies_touch
  before update on public.football_derbies
  for each row execute function public.football_articles_touch();
