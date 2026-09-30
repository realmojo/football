// 지난 시즌 기록실 (API-Football 에서 받아 DB 에 저장한 2022~2024 시즌)
export const ARCHIVE_LEAGUES = [
  { code: "PL", name: "프리미어리그", country: "잉글랜드", calendarYear: false },
  { code: "PD", name: "라리가", country: "스페인", calendarYear: false },
  { code: "BL1", name: "분데스리가", country: "독일", calendarYear: false },
  { code: "SA", name: "세리에 A", country: "이탈리아", calendarYear: false },
  { code: "FL1", name: "리그 1", country: "프랑스", calendarYear: false },
  { code: "KL1", name: "K리그1", country: "대한민국", calendarYear: true },
] as const;

export type ArchiveLeague = (typeof ARCHIVE_LEAGUES)[number];

export function findArchiveLeague(code: string) {
  return ARCHIVE_LEAGUES.find((l) => l.code === code.toUpperCase());
}

// 유럽 리그는 "2023-24", K리그는 "2023"
export function seasonLabel(league: ArchiveLeague, season: number) {
  return league.calendarYear ? `${season}` : `${season}-${String(season + 1).slice(2)}`;
}

// API-Football 순위 설명을 짧은 한글로
export function describeZone(description: string | null) {
  if (!description) return null;
  const d = description.toLowerCase();
  // "Bundesliga (Relegation)", "Ligue 1 (Promotion - Play Offs)", "Serie A (Additional match)" 는 잔류를 건 플레이오프다.
  if (d.includes("relegation play") || d.includes("(relegation)") || d.includes("play off") || d.includes("playoff") || d.includes("additional match"))
    return "강등 PO";
  if (d.includes("relegation")) return "강등";
  // 아시아 대회를 먼저 본다 ("AFC Champions League" 에도 "champions league" 가 들어 있다).
  if (d.includes("afc champions league two")) return "ACL2";
  if (d.includes("afc champions league")) return "ACL";
  if (d.includes("champions league") && d.includes("qualif")) return "챔스 예선";
  if (d.includes("champions league")) return "챔스";
  if (d.includes("europa league") && d.includes("qualif")) return "유로파 예선";
  if (d.includes("europa league")) return "유로파";
  if (d.includes("conference league")) return "컨퍼런스";
  if (d.includes("final round a")) return "파이널 A";
  if (d.includes("final round b")) return "파이널 B";
  return null;
}
