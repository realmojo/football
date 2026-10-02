import { findLeague } from "@/lib/leagues";
import { countryLabel, positionLabel } from "@/lib/labels";
import type { Scorer } from "@/lib/types";
import { TeamLabel } from "./TeamLabel";

// 득점이 같으면 같은 순위로 표시한다.
export function scorerRank(list: Scorer[], i: number) {
  return list.findIndex((s) => s.goals === list[i].goals) + 1;
}

export function ScorerTable({ scorers, league, compact = false }: { scorers: Scorer[]; league: string; compact?: boolean }) {
  return (
    <table className="standings scorers">
      <caption className="sr-only">{findLeague(league)?.name ?? league} 득점 순위</caption>
      <thead>
        <tr>
          <th scope="col" className="pos">순위</th>
          <th scope="col" className="left">선수</th>
          {compact ? null : <th scope="col" className="left hide-sm">팀</th>}
          {compact ? null : <th scope="col">경기</th>}
          <th scope="col" className="pts">득점</th>
          {compact ? null : <th scope="col">도움</th>}
          {compact ? null : <th scope="col" className="hide-sm">PK</th>}
          {compact ? null : <th scope="col" className="hide-sm">경기당</th>}
        </tr>
      </thead>
      <tbody>
        {scorers.map((s, i) => (
          <tr key={s.playerId}>
            <td className="pos">{scorerRank(scorers, i)}</td>
            <td className="left">
              <div className="player">
                <a href={`/player/${s.playerId}`}>
                  <strong>{s.name}</strong>
                </a>
                <span>
                  {compact && s.team ? (s.team.shortName || s.team.name) : `${positionLabel(s.position)} · ${countryLabel(s.nationality)}`}
                </span>
              </div>
            </td>
            {compact ? null : (
              <td className="left hide-sm">{s.team ? <TeamLabel team={s.team} league={league} short /> : "-"}</td>
            )}
            {compact ? null : <td>{s.playedMatches ?? "-"}</td>}
            <td className="pts">{s.goals}</td>
            {compact ? null : <td>{s.assists ?? 0}</td>}
            {compact ? null : <td className="hide-sm">{s.penalties ?? 0}</td>}
            {compact ? null : (
              <td className="hide-sm">{s.playedMatches ? (s.goals / s.playedMatches).toFixed(2) : "-"}</td>
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
