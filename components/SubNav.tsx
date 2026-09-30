"use client";

import { usePathname } from "next/navigation";

export function SubNav({ league, cup = false }: { league: string; cup?: boolean }) {
  const pathname = usePathname();
  const tabs = cup
    ? [
        { href: `/${league}`, label: "조별리그" },
        { href: `/${league}/bracket`, label: "토너먼트" },
        { href: `/${league}/matches`, label: "경기 결과" },
        { href: `/${league}/scorers`, label: "득점 순위" },
      ]
    : [
        { href: `/${league}`, label: "순위" },
        { href: `/${league}/matches`, label: "일정 · 결과" },
        { href: `/${league}/scorers`, label: "득점 순위" },
        { href: `/${league}/stats`, label: "시즌 통계" },
      ];
  return (
    <nav className="subnav">
      {tabs.map((t) => (
        <a key={t.href} href={t.href} className={pathname === t.href || (t.href.endsWith("/stats") && pathname.startsWith(`/${league}/round/`)) ? "active" : ""}>
          {t.label}
        </a>
      ))}
    </nav>
  );
}
