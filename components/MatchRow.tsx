import { isFinished, isLive } from "@/lib/analysis";
import { formatKickoff, formatTime, STATUS_LABEL } from "@/lib/format";
import type { Match } from "@/lib/types";
import { TeamLabel } from "./TeamLabel";

export function MatchRow({ match, league, showDate = false }: { match: Match; league: string; showDate?: boolean }) {
  const done = isFinished(match);
  const live = isLive(match);
  const { home, away } = match.score.fullTime;
  const winner = match.score.winner;

  return (
    <div className={`match ${live ? "live" : ""}`}>
      <div className="match-time">
        {showDate ? formatKickoff(match.utcDate) : formatTime(match.utcDate)}
        <span className="match-status">{STATUS_LABEL[match.status] ?? match.status}</span>
      </div>
      <div className={`match-team home ${winner === "HOME_TEAM" ? "win" : ""}`}>
        <TeamLabel team={match.homeTeam} league={league} short />
      </div>
      <div className="match-score">
        {done || live ? (
          <>
            <strong>{home ?? 0}</strong>
            <span>:</span>
            <strong>{away ?? 0}</strong>
          </>
        ) : (
          <span className="muted">vs</span>
        )}
      </div>
      <div className={`match-team away ${winner === "AWAY_TEAM" ? "win" : ""}`}>
        <TeamLabel team={match.awayTeam} league={league} short />
      </div>
    </div>
  );
}
