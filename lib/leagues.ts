// football-data.org 무료 플랜에서 제공되는 주요 리그
export const LEAGUES = [
  {
    code: "PL",
    name: "프리미어리그",
    country: "잉글랜드",
    intro: [
      "프리미어리그는 잉글랜드 축구 1부 리그로, 20개 팀이 홈과 원정으로 한 번씩 맞붙어 팀당 38경기를 치릅니다. 이기면 승점 3점, 비기면 1점을 받고, 승점이 같으면 골득실과 다득점 순으로 순위를 가립니다.",
      "시즌을 마치면 상위 4개 팀이 다음 시즌 UEFA 챔피언스리그 본선에 나가고, 5위는 유로파리그, 6위는 컨퍼런스리그에 진출합니다. FA컵과 리그컵 우승 팀에 따라 유럽대항전 진출 순위가 한두 자리 내려가기도 합니다. 18위부터 20위까지 세 팀은 2부 리그인 챔피언십으로 강등됩니다.",
    ],
  },
  {
    code: "PD",
    name: "라리가",
    country: "스페인",
    intro: [
      "라리가는 스페인 1부 리그로, 20개 팀이 팀당 38경기를 치릅니다. 다른 리그와 달리 승점이 같으면 전체 골득실보다 해당 팀끼리의 맞대결 성적을 먼저 따지는 것이 특징입니다.",
      "상위 4개 팀이 챔피언스리그, 5위가 유로파리그, 6위가 컨퍼런스리그에 나가며, 코파 델 레이 우승 팀에 따라 진출권이 바뀔 수 있습니다. 하위 세 팀은 2부 리그인 세군다 디비시온으로 강등됩니다.",
    ],
  },
  {
    code: "BL1",
    name: "분데스리가",
    country: "독일",
    intro: [
      "분데스리가는 독일 1부 리그로, 18개 팀이 팀당 34경기를 치릅니다. 다른 빅리그보다 팀 수가 적어 시즌 중 휴식기가 길고, 겨울 휴식기가 있는 것이 특징입니다.",
      "상위 4개 팀이 챔피언스리그, 5위가 유로파리그, 6위가 컨퍼런스리그 예선에 나갑니다. 17위와 18위는 2부 리그로 곧바로 강등되고, 16위는 2부 리그 3위 팀과 홈·원정 두 경기의 승강 플레이오프를 치러 잔류 여부를 가립니다.",
    ],
  },
  {
    code: "SA",
    name: "세리에 A",
    country: "이탈리아",
    intro: [
      "세리에 A는 이탈리아 1부 리그로, 20개 팀이 팀당 38경기를 치릅니다. 전통적으로 조직적인 수비 전술이 강한 리그로 알려져 있어 팀별 경기당 실점과 무실점 경기 수를 비교해 보면 흥미롭습니다.",
      "상위 4개 팀이 챔피언스리그, 5위가 유로파리그, 6위가 컨퍼런스리그에 진출하고, 코파 이탈리아 우승 팀에 따라 순위가 조정됩니다. 하위 세 팀은 세리에 B로 강등됩니다.",
    ],
  },
  {
    code: "FL1",
    name: "리그 1",
    country: "프랑스",
    intro: [
      "리그 1은 프랑스 1부 리그로, 18개 팀이 팀당 34경기를 치릅니다. 젊은 선수들이 많이 성장해 빅리그로 이적하는 무대로도 잘 알려져 있습니다.",
      "상위 팀들이 챔피언스리그와 유로파리그, 컨퍼런스리그에 나가며, 챔피언스리그 직행권 수는 UEFA 국가별 순위에 따라 해마다 달라질 수 있습니다. 17위와 18위는 리그 2로 강등되고, 16위는 리그 2 팀과 승강 플레이오프를 치릅니다.",
    ],
  },
  {
    code: "CL",
    name: "챔피언스리그",
    country: "유럽",
    intro: [
      "UEFA 챔피언스리그는 유럽 각국 리그 상위 팀들이 모여 유럽 최강 클럽을 가리는 대회입니다. 2024-25 시즌부터는 조별리그 대신 36개 팀이 하나의 순위표에 들어가는 리그 페이즈 방식으로 바뀌었습니다.",
      "리그 페이즈에서 각 팀은 서로 다른 상대 8팀과 한 경기씩 치릅니다. 1위부터 8위까지는 16강에 바로 오르고, 9위부터 24위까지는 녹아웃 플레이오프를 거쳐 16강 진출을 다툽니다. 25위 아래 팀은 대회에서 탈락합니다. 이후 16강부터는 홈·원정 두 경기로 승부를 가리고, 결승은 단판으로 치릅니다.",
    ],
  },
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
