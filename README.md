# 해외축구 분석

해외축구 리그 순위, 일정, 경기 결과와 팀별 분석을 보여주는 Next.js 앱입니다.
데이터는 [football-data.org](https://www.football-data.org) v4 API를 사용합니다.

## 기능

- **순위**: 전체 / 홈 / 원정 순위표, 최근 5경기 폼
- **일정 · 결과**: 라운드별 경기 일정과 스코어 (한국시간 기준)
- **팀 분석**: 경기당 득실점, 무실점 / 무득점 / 2.5골 오버 / 양팀 득점 비율, 홈·원정 성적, 최근 5경기, 다음 상대와의 비교 및 이번 시즌 맞대결
- 지원 리그: 프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그

## 실행

```bash
cp .env.example .env.local   # FOOTBALL_DATA_TOKEN 에 발급받은 토큰 입력
npm install
npm run dev                  # http://localhost:3000
```

토큰은 서버에서만 사용되며 `X-Auth-Token` 헤더로 전송됩니다. `.env.local` 은 git 에 올라가지 않습니다.

## API 사용량

무료 플랜은 분당 10회 요청 제한이 있어 모든 응답을 10분간 캐시합니다 (`lib/api.ts`).
리그당 `standings`, `matches` 두 번의 호출만으로 모든 화면과 분석을 계산합니다.
