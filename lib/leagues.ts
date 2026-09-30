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

// 순위표 구간 표시 (유럽대항전 진출 / 강등권). 전체 순위표에만 표시한다.
export type Zone = "ucl" | "uel" | "uecl" | "playoff" | "rel" | "ko" | "out";

export const ZONE_LABEL: Record<Zone, string> = {
  ucl: "챔피언스리그",
  uel: "유로파리그",
  uecl: "컨퍼런스리그",
  playoff: "강등 플레이오프",
  rel: "강등",
  ko: "16강 직행",
  out: "탈락",
};

const ZONES: Record<string, Array<[from: number, to: number, zone: Zone]>> = {
  PL: [[1, 4, "ucl"], [5, 5, "uel"], [6, 6, "uecl"], [18, 20, "rel"]],
  PD: [[1, 4, "ucl"], [5, 5, "uel"], [6, 6, "uecl"], [18, 20, "rel"]],
  SA: [[1, 4, "ucl"], [5, 5, "uel"], [6, 6, "uecl"], [18, 20, "rel"]],
  BL1: [[1, 4, "ucl"], [5, 5, "uel"], [6, 6, "uecl"], [16, 16, "playoff"], [17, 18, "rel"]],
  FL1: [[1, 4, "ucl"], [5, 5, "uel"], [6, 6, "uecl"], [16, 16, "playoff"], [17, 18, "rel"]],
  CL: [[1, 8, "ko"], [9, 24, "playoff"], [25, 36, "out"]],
};

export function zoneFor(code: string, position: number): Zone | null {
  return ZONES[code]?.find(([from, to]) => position >= from && position <= to)?.[2] ?? null;
}

export function zonesOf(code: string): Zone[] {
  return [...new Set((ZONES[code] ?? []).map(([, , z]) => z))];
}
