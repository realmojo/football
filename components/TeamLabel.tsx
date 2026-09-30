import Link from "next/link";
import type { Team } from "@/lib/types";

export function TeamLabel({ team, league, short = false }: { team: Team; league: string; short?: boolean }) {
  return (
    <Link href={`/${league}/team/${team.id}`} className="team">
      {team.crest ? <img src={team.crest} alt="" width={20} height={20} loading="lazy" /> : null}
      <span>{short ? team.shortName || team.tla : team.name}</span>
    </Link>
  );
}
