"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { LEAGUES } from "@/lib/leagues";

export function LeagueNav() {
  const params = useParams<{ league?: string }>();
  const current = params.league?.toUpperCase();
  return (
    <nav className="leaguenav">
      {LEAGUES.map((l) => (
        <Link key={l.code} href={`/${l.code}`} className={current === l.code ? "active" : ""}>
          {l.name}
        </Link>
      ))}
    </nav>
  );
}
