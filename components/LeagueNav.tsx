"use client";

import { useParams, usePathname } from "next/navigation";
import { LEAGUES } from "@/lib/leagues";

export function LeagueNav() {
  const params = useParams<{ league?: string }>();
  const pathname = usePathname();
  const current = params.league?.toUpperCase();
  return (
    <nav className="leaguenav">
      {LEAGUES.map((l) => (
        <a key={l.code} href={`/${l.code}`} className={current === l.code ? "active" : ""}>
          {l.name}
        </a>
      ))}
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
