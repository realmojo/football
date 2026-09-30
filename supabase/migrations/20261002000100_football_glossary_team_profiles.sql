-- 축구 용어 사전과 팀 소개글. 쓰기는 service_role 만, 읽기는 공개.

create table public.football_glossary (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  term text not null,
  english text,
  category text not null check (category in ('경기 규칙', '기록 · 통계', '대회 · 제도', '전술 · 포지션', '이적 · 구단')),
  body text not null,
  sort int not null default 0,
  updated_at timestamptz not null default now()
);
comment on table public.football_glossary is '해외축구: 용어 사전 (공개 읽기, 쓰기는 service_role)';

create table public.football_team_profiles (
  team_id int primary key references public.football_teams (id) on delete cascade,
  nickname text,
  tags text[] not null default '{}',
  -- 신뢰할 수 있는 HTML 문단
  intro text not null,
  updated_at timestamptz not null default now()
);
comment on table public.football_team_profiles is '해외축구: 팀 소개글 (공개 읽기, 쓰기는 service_role)';

alter table public.football_glossary enable row level security;
alter table public.football_team_profiles enable row level security;
create policy "football_glossary public read" on public.football_glossary for select to anon, authenticated using (true);
create policy "football_team_profiles public read" on public.football_team_profiles for select to anon, authenticated using (true);

create trigger football_glossary_touch
  before update on public.football_glossary
  for each row execute function public.football_articles_touch();
create trigger football_team_profiles_touch
  before update on public.football_team_profiles
  for each row execute function public.football_articles_touch();
