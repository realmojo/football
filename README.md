# 해외축구 분석

해외축구 리그 순위, 일정, 경기 결과와 팀별 분석을 보여주는 Next.js 앱입니다.
데이터는 [football-data.org](https://www.football-data.org) v4 API 에서 Supabase(pflow-kr)로 주기적으로 수집하고,
화면은 Supabase 에 저장된 데이터만 읽습니다.

## 기능

- **순위**: 전체 / 홈 / 원정 순위표, 최근 5경기 폼
- **일정 · 결과**: 라운드별 경기 일정과 스코어 (한국시간 기준)
- **팀 분석**: 경기당 득실점, 무실점 / 무득점 / 2.5골 오버 / 양팀 득점 비율, 홈·원정 성적, 최근 5경기, 다음 상대와의 비교 및 이번 시즌 맞대결
- 지원 리그: 프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그

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
| `football_sync_log` | 수집 기록 (14일 보관) | service_role 전용 |

- 스키마와 스케줄: `supabase/migrations/`
- Edge Function: `supabase/functions/football-sync/`
- 비밀값은 Supabase Vault 에 있습니다: `football_data_token`(API 토큰), `football_sync_token`(Edge Function 호출 토큰)
- 수동 수집: `select public.football_sync('PL');`
- 수집 상태 확인: `select * from football_sync_log order by id desc limit 20;`

무료 플랜은 분당 10회 제한이 있어, 리그마다 1분씩 어긋나게 실행해 분당 2회만 호출합니다.

## 실행

```bash
cp .env.example .env.local   # Supabase URL 과 publishable 키
npm install
npm run dev                  # http://localhost:3000
```
