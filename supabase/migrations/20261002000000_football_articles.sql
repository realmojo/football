-- 축구 칼럼. 본문은 HTML 로 저장하고 화면의 .prose 스타일로 보여준다.

create table public.football_articles (
  slug text primary key check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null,
  category text not null check (category in ('규칙', '대회', '리그', '분석')),
  body text not null,
  published boolean not null default false,
  published_at date,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  check (not published or published_at is not null)
);
create index football_articles_published_idx on public.football_articles (published_at desc) where published;
comment on table public.football_articles is '해외축구: 칼럼 (공개된 글만 공개 읽기, 쓰기는 service_role)';

alter table public.football_articles enable row level security;
create policy "football_articles public read" on public.football_articles
  for select to anon, authenticated using (published);

create or replace function public.football_articles_touch()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger football_articles_touch
  before update on public.football_articles
  for each row execute function public.football_articles_touch();
