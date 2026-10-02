import { LEAGUES } from "./leagues";

// 상단 메뉴바 구성. 비슷한 주제끼리 묶는다.

export interface MenuLink {
  href: string;
  label: string;
  // 리그 바로가기 아래에 붙는 작은 링크 (순위 · 일정 · 득점)
  sub?: { href: string; label: string }[];
}

export interface MenuSection {
  title?: string;
  links: MenuLink[];
}

export interface MenuItem {
  key: string;
  label: string;
  href?: string;
  sections?: MenuSection[];
  wide?: boolean;
}

const leagueName = (code: string) => LEAGUES.find((l) => l.code === code)?.name ?? code;

const leagueLink = (code: string): MenuLink => ({
  href: `/${code}`,
  label: leagueName(code),
  sub: [
    { href: `/${code}`, label: "순위" },
    { href: `/${code}/matches`, label: "일정" },
    { href: `/${code}/scorers`, label: "득점" },
  ],
});

export const MENU: MenuItem[] = [
  {
    key: "leagues",
    label: "해외 리그",
    wide: true,
    sections: [
      { title: "유럽 5대 리그", links: ["PL", "PD", "BL1", "SA", "FL1"].map(leagueLink) },
      {
        title: "그 밖의 리그",
        links: [
          ...["ELC", "DED", "PPL", "BSA"].map((c) => ({ href: `/${c}`, label: leagueName(c) })),
          { href: "/leagues", label: "전체 리그 보기 →" },
          { href: "/clubs", label: "구단 소개 →" },
        ],
      },
    ],
  },
  {
    key: "cups",
    label: "대회",
    sections: [
      { title: "UEFA 챔피언스리그", links: [leagueLink("CL")] },
      {
        title: "2026 북중미 월드컵",
        links: [
          { href: "/WC", label: "조별리그 순위" },
          { href: "/WC/bracket", label: "토너먼트 대진표" },
          { href: "/WC/matches", label: "경기 결과" },
          { href: "/WC/scorers", label: "득점 순위" },
        ],
      },
    ],
  },
  { key: "schedule", label: "경기 일정", href: "/schedule" },
  { key: "korean", label: "한국 선수", href: "/korean-players" },
  {
    key: "records",
    label: "기록·통계",
    sections: [
      {
        links: [
          { href: "/players", label: "득점 선수" },
          { href: "/stats", label: "5대 리그 비교" },
          { href: "/archive", label: "시즌 기록실" },
        ],
      },
    ],
  },
  {
    key: "reading",
    label: "읽을거리",
    sections: [
      {
        links: [
          { href: "/articles", label: "축구 칼럼" },
          { href: "/derby", label: "더비·라이벌전" },
          { href: "/glossary", label: "축구 용어 사전" },
          { href: "/guide", label: "이용 가이드" },
        ],
      },
    ],
  },
];

// 현재 주소가 메뉴 항목에 속하는지
export function menuMatches(item: MenuItem, pathname: string) {
  const hrefs = item.href ? [item.href] : (item.sections ?? []).flatMap((s) => s.links.flatMap((l) => [l.href, ...(l.sub ?? []).map((x) => x.href)]));
  return hrefs.some((h) => {
    const base = h.split("?")[0];
    if (base === "/") return pathname === "/";
    // 리그 코드는 /PL, /PL/team/.. 처럼 하위 주소까지 포함한다.
    return pathname === base || pathname.startsWith(`${base}/`);
  });
}
