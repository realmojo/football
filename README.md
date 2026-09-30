# 토리코리 (toricori.com)

해외축구 리그 순위, 일정, 경기 결과와 팀별 분석을 보여주는 Next.js 앱입니다.
데이터는 [football-data.org](https://www.football-data.org) v4 API 에서 Supabase(pflow-kr)로 주기적으로 수집하고,
화면은 Supabase 에 저장된 데이터만 읽습니다.

## 기능

- **순위**: 전체 / 홈 / 원정 순위표, 최근 5경기 폼
- **일정 · 결과**: 라운드별 경기 일정과 스코어 (한국시간 기준)
- **팀 분석**: 경기당 득실점, 무실점 / 무득점 / 2.5골 오버 / 양팀 득점 비율, 홈·원정 성적, 최근 5경기, 다음 상대와의 비교 및 이번 시즌 맞대결
- 지원 리그: 프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그
- **2026 월드컵**: 조별리그 순위(경기 결과로 계산), 조 3위 순위, 토너먼트 대진표, 라운드별 경기 결과, 득점 순위. 월드컵은 하루 한 번(19:07 UTC) 수집합니다.

## 데이터 수집 구조

```
pg_cron (리그별 10분마다, 1분씩 시차)
  → public.football_sync(code)       -- pg_net 으로 Edge Function 호출
  → Edge Function football-sync      -- football-data.org 호출 (리그당 2회)
  → football_competitions / football_teams / football_matches / football_standings upsert
  → football_sync_log 에 결과 기록
```

| 테이블 | 내용 | 접근 |
|---|---|---|
| `football_competitions` | 리그, 현재 시즌, 현재 라운드, 마지막 수집 시각 | 공개 읽기 |
| `football_teams` | 팀 이름, 약자, 로고 | 공개 읽기 |
| `football_matches` | 경기 일정, 상태, 스코어 | 공개 읽기 |
| `football_standings` | 순위표 | 공개 읽기 |
| `football_scorers` | 리그별 득점 순위 상위 30명 | 공개 읽기 |
| `football_players` | 팀별 선수단 | 공개 읽기 |
| `football_sync_log` | 수집 기록 (14일 보관) | service_role 전용 |

- 스키마와 스케줄: `supabase/migrations/`
- Edge Function: `supabase/functions/football-sync/`
- 비밀값은 Supabase Vault 에 있습니다: `football_data_token`(API 토큰), `football_sync_token`(Edge Function 호출 토큰)
- 수동 수집: `select public.football_sync('PL');`
- 수집 상태 확인: `select * from football_sync_log order by id desc limit 20;`

무료 플랜은 분당 10회 제한이 있어, 리그마다 1분씩 어긋나게 실행해 분당 3회(순위·경기·득점)만 호출합니다.
선수단과 팀 정보(감독·경기장 등)는 리그 수집이 없는 6분, 8분에 팀 5개씩 받아오며, 팀마다 하루에 한 번 갱신합니다.

## Cloudflare 배포 (Workers, OpenNext)

Cloudflare Workers Builds 설정:

| 항목 | 값 |
|---|---|
| 빌드 명령 | `npx opennextjs-cloudflare build` |
| 배포 명령 | `npx opennextjs-cloudflare deploy` |
| 루트 디렉터리 | `/` |

- Worker 이름은 `wrangler.jsonc` 의 `name`(`football`)입니다. Cloudflare 대시보드의 Worker 이름과 같아야 합니다.
- Supabase 접속 정보는 공개 값이라 `.env.production` 에 커밋되어 있어 빌드 때 자동으로 들어갑니다. 따로 환경변수를 설정할 필요가 없습니다.
- 로컬에서 Workers 환경으로 확인: `npm run preview`

## 애드센스

- 소개(`/about`), 이용 가이드(`/guide`), 개인정보처리방침(`/privacy`), 이용약관(`/terms`), 문의(`/contact`) 페이지와
  `sitemap.xml`, `robots.txt` 가 있습니다.
- 직접 쓴 콘텐츠는 Supabase 테이블에 있고, 배포 없이 행을 추가·수정하면 바로 반영됩니다. 쓰기는 service_role 만 가능합니다.
  | 테이블 | 화면 | 초기 데이터 |
  |---|---|---|
  | `football_articles` | 축구 칼럼 `/articles` (본문 HTML, `published = true` 인 글만 공개) | `supabase/seed/football_articles.sql` |
  | `football_glossary` | 축구 용어 사전 `/glossary` | `supabase/seed/football_glossary.sql` |
  | `football_team_profiles` | 팀 분석 화면의 구단 소개 | `supabase/seed/football_team_profiles_*.sql` |
- 경기 데이터로 자동 생성하는 분석 페이지: 5대 리그 통계 비교(`/stats`), 리그별 시즌 통계(`/{리그}/stats`),
  라운드 리뷰(`/{리그}/round/{n}`, 모든 경기가 끝난 라운드만). 계산은 `lib/insights.ts`, 문장은 `lib/narrative.ts` 에 있습니다.
- 승인 후 게시자 ID 를 `.env.production` 에 넣으면 광고 스크립트와 `/ads.txt` 가 켜집니다.
  ```
  NEXT_PUBLIC_ADSENSE_CLIENT=ca-pub-XXXXXXXXXXXXXXXX
  ```
- 문의 이메일(`lib/site.ts` 의 `CONTACT_EMAIL`)은 실제로 받을 수 있게 연결해 두어야 합니다.

## 실행

```bash
cp .env.example .env.local   # Supabase URL 과 publishable 키
npm install
npm run dev                  # http://localhost:3000
```
