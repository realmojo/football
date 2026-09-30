// football-data.org 무료 플랜에서 제공되는 주요 리그
export const LEAGUES = [
  {
    code: "PL",
    kind: "league",
    name: "프리미어리그",
    country: "잉글랜드",
    intro: [
      "프리미어리그는 잉글랜드 축구 1부 리그로, 20개 팀이 홈과 원정으로 한 번씩 맞붙어 팀당 38경기를 치릅니다. 이기면 승점 3점, 비기면 1점을 받고, 승점이 같으면 골득실과 다득점 순으로 순위를 가립니다.",
      "시즌을 마치면 상위 4개 팀이 다음 시즌 UEFA 챔피언스리그 본선에 나가고, 5위는 유로파리그, 6위는 컨퍼런스리그에 진출합니다. FA컵과 리그컵 우승 팀에 따라 유럽대항전 진출 순위가 한두 자리 내려가기도 합니다. 18위부터 20위까지 세 팀은 2부 리그인 챔피언십으로 강등됩니다.",
    ],
  },
  {
    code: "PD",
    kind: "league",
    name: "라리가",
    country: "스페인",
    intro: [
      "라리가는 스페인 1부 리그로, 20개 팀이 팀당 38경기를 치릅니다. 다른 리그와 달리 승점이 같으면 전체 골득실보다 해당 팀끼리의 맞대결 성적을 먼저 따지는 것이 특징입니다.",
      "상위 4개 팀이 챔피언스리그, 5위가 유로파리그, 6위가 컨퍼런스리그에 나가며, 코파 델 레이 우승 팀에 따라 진출권이 바뀔 수 있습니다. 하위 세 팀은 2부 리그인 세군다 디비시온으로 강등됩니다.",
    ],
  },
  {
    code: "BL1",
    kind: "league",
    name: "분데스리가",
    country: "독일",
    intro: [
      "분데스리가는 독일 1부 리그로, 18개 팀이 팀당 34경기를 치릅니다. 다른 빅리그보다 팀 수가 적어 시즌 중 휴식기가 길고, 겨울 휴식기가 있는 것이 특징입니다.",
      "상위 4개 팀이 챔피언스리그, 5위가 유로파리그, 6위가 컨퍼런스리그 예선에 나갑니다. 17위와 18위는 2부 리그로 곧바로 강등되고, 16위는 2부 리그 3위 팀과 홈·원정 두 경기의 승강 플레이오프를 치러 잔류 여부를 가립니다.",
    ],
  },
  {
    code: "SA",
    kind: "league",
    name: "세리에 A",
    country: "이탈리아",
    intro: [
      "세리에 A는 이탈리아 1부 리그로, 20개 팀이 팀당 38경기를 치릅니다. 전통적으로 조직적인 수비 전술이 강한 리그로 알려져 있어 팀별 경기당 실점과 무실점 경기 수를 비교해 보면 흥미롭습니다.",
      "상위 4개 팀이 챔피언스리그, 5위가 유로파리그, 6위가 컨퍼런스리그에 진출하고, 코파 이탈리아 우승 팀에 따라 순위가 조정됩니다. 하위 세 팀은 세리에 B로 강등됩니다.",
    ],
  },
  {
    code: "FL1",
    kind: "league",
    name: "리그 1",
    country: "프랑스",
    intro: [
      "리그 1은 프랑스 1부 리그로, 18개 팀이 팀당 34경기를 치릅니다. 젊은 선수들이 많이 성장해 빅리그로 이적하는 무대로도 잘 알려져 있습니다.",
      "상위 팀들이 챔피언스리그와 유로파리그, 컨퍼런스리그에 나가며, 챔피언스리그 직행권 수는 UEFA 국가별 순위에 따라 해마다 달라질 수 있습니다. 17위와 18위는 리그 2로 강등되고, 16위는 리그 2 팀과 승강 플레이오프를 치릅니다.",
    ],
  },
  {
    code: "CL",
    kind: "league",
    name: "챔피언스리그",
    country: "유럽",
    intro: [
      "UEFA 챔피언스리그는 유럽 각국 리그 상위 팀들이 모여 유럽 최강 클럽을 가리는 대회입니다. 2024-25 시즌부터는 조별리그 대신 36개 팀이 하나의 순위표에 들어가는 리그 페이즈 방식으로 바뀌었습니다.",
      "리그 페이즈에서 각 팀은 서로 다른 상대 8팀과 한 경기씩 치릅니다. 1위부터 8위까지는 16강에 바로 오르고, 9위부터 24위까지는 녹아웃 플레이오프를 거쳐 16강 진출을 다툽니다. 25위 아래 팀은 대회에서 탈락합니다. 이후 16강부터는 홈·원정 두 경기로 승부를 가리고, 결승은 단판으로 치릅니다.",
    ],
  },
  {
    code: "WC",
    kind: "cup",
    name: "월드컵",
    country: "2026 북중미",
    intro: [
      "2026 FIFA 월드컵은 미국, 캐나다, 멕시코 세 나라가 함께 연 대회로, 2026년 6월 11일부터 7월 19일까지 열렸습니다. 이번 대회부터 참가국이 32개국에서 48개국으로 늘어나 전체 경기 수도 64경기에서 104경기가 되었습니다.",
      "48개국은 4개 팀씩 12개 조로 나뉘어 조별리그를 치렀고, 각 조 1·2위 24개 팀과 조 3위 가운데 성적이 좋은 8개 팀이 32강 토너먼트에 올랐습니다. 32강부터는 단판 승부로, 90분 안에 승부가 나지 않으면 30분 연장전을 치르고 그래도 비기면 승부차기로 다음 라운드 진출 팀을 가렸습니다.",
    ],
  },
] as const;

export type LeagueCode = (typeof LEAGUES)[number]["code"];

export type League = (typeof LEAGUES)[number];

export function isCup(league: { kind: string }) {
  return league.kind === "cup";
}

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

// 컵대회 단계. 경기 일정 탭 순서와 대진표 라운드 순서로 쓴다.
export const CUP_STAGES = [
  { key: "GS1", stage: "GROUP_STAGE", matchday: 1, label: "조별리그 1차전", short: "1차전" },
  { key: "GS2", stage: "GROUP_STAGE", matchday: 2, label: "조별리그 2차전", short: "2차전" },
  { key: "GS3", stage: "GROUP_STAGE", matchday: 3, label: "조별리그 3차전", short: "3차전" },
  { key: "R32", stage: "LAST_32", label: "32강", short: "32강" },
  { key: "R16", stage: "LAST_16", label: "16강", short: "16강" },
  { key: "QF", stage: "QUARTER_FINALS", label: "8강", short: "8강" },
  { key: "SF", stage: "SEMI_FINALS", label: "4강", short: "4강" },
  { key: "3RD", stage: "THIRD_PLACE", label: "3·4위전", short: "3·4위전" },
  { key: "F", stage: "FINAL", label: "결승", short: "결승" },
] as const;

export const KNOCKOUT_ROUNDS = ["LAST_32", "LAST_16", "QUARTER_FINALS", "SEMI_FINALS", "FINAL"] as const;

export function stageLabel(stage: string) {
  return CUP_STAGES.find((s) => s.stage === stage && s.stage !== "GROUP_STAGE")?.label ?? "조별리그";
}

export function groupLabel(group: string | null | undefined) {
  return group?.startsWith("GROUP_") ? `${group.slice(6)}조` : "";
}

// 5대 리그 (컵대회·챔피언스리그 제외). 리그 간 비교 통계에 쓴다.
export const DOMESTIC_LEAGUES = LEAGUES.filter((l) => ["PL", "PD", "BL1", "SA", "FL1"].includes(l.code));
