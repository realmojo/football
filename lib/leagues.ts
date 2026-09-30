// football-data.org 무료 플랜에서 제공되는 주요 리그
export const LEAGUES = [
  { code: "PL", name: "프리미어리그", country: "잉글랜드" },
  { code: "PD", name: "라리가", country: "스페인" },
  { code: "BL1", name: "분데스리가", country: "독일" },
  { code: "SA", name: "세리에 A", country: "이탈리아" },
  { code: "FL1", name: "리그 1", country: "프랑스" },
  { code: "CL", name: "챔피언스리그", country: "유럽" },
] as const;

export type LeagueCode = (typeof LEAGUES)[number]["code"];

export function findLeague(code: string) {
  return LEAGUES.find((l) => l.code === code.toUpperCase());
}

export function leagueEmblem(code: string) {
  return `https://crests.football-data.org/${code}.png`;
}
