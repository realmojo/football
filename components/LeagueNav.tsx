"use client";

import { useParams, usePathname } from "next/navigation";
import { NAV_LEAGUES, OTHER_LEAGUES } from "@/lib/leagues";

export function LeagueNav() {
  const params = useParams<{ league?: string }>();
  const pathname = usePathname();
  const current = params.league?.toUpperCase();
  return (
    <nav className="leaguenav">
      {NAV_LEAGUES.map((l) => (
        <a key={l.code} href={`/${l.code}`} className={current === l.code ? "active" : ""}>
          {l.name}
        </a>
      ))}
      <a
        href="/leagues"
        className={pathname === "/leagues" || OTHER_LEAGUES.some((l) => l.code === current) ? "active" : ""}
      >
        다른 리그
      </a>
      <a href="/schedule" className={pathname.startsWith("/schedule") ? "active" : ""}>
        일정
      </a>
      <a
        href="/korean-players"
        className={pathname === "/korean-players" ? "active" : ""}
      >
        한국 선수
      </a>
      <a href="/stats" className={pathname === "/stats" ? "active" : ""}>
        리그 비교
      </a>
      <a href="/articles" className={pathname.startsWith("/articles") ? "active" : ""}>
        칼럼
      </a>
      <a href="/glossary" className={pathname === "/glossary" ? "active" : ""}>
        용어
      </a>
    </nav>
  );
}
