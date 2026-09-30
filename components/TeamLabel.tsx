import type { Team } from "@/lib/types";
import { Crest } from "./Crest";

export function TeamLabel({ team, league, short = false }: { team: Team; league: string; short?: boolean }) {
  return (
    <a href={`/${league}/team/${team.id}`} className="team">
      <Crest src={team.crest} tla={team.tla} />
      <span>{short ? team.shortName || team.tla : team.name}</span>
    </a>
  );
}
