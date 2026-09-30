import { isFinished, isLive } from "@/lib/analysis";
import { formatDay, formatKickoff, formatTime, STATUS_LABEL } from "@/lib/format";
import type { Match } from "@/lib/types";
import { TeamLabel } from "./TeamLabel";

export function MatchRow({ match, league, showDate = false }: { match: Match; league: string; showDate?: boolean }) {
  const done = isFinished(match);
  const live = isLive(match);
  const { home, away } = match.score.fullTime;
  const winner = match.score.winner;
  const status = match.status === "TIMED" || match.status === "SCHEDULED" ? null : STATUS_LABEL[match.status];
  const pens = match.score.penalties;
  const note =
    pens && pens.home != null
      ? `승부차기 ${pens.home}-${pens.away}`
      : match.score.duration === "EXTRA_TIME"
        ? "연장"
        : null;

  return (
    <div className={`match${live ? " is-live" : ""}${done ? " is-done" : ""}${note ? " has-note" : ""}`}>
      <div className="match-when">
        {/* 예정 경기는 시간이 스코어 박스에 들어가므로 날짜만 표시한다 */}
        {showDate
          ? done || live
            ? formatKickoff(match.utcDate)
            : formatDay(match.utcDate)
          : done || live
            ? formatTime(match.utcDate)
            : null}
        {status && !done ? <em>{status}</em> : null}
      </div>
      <div className={`match-side home${winner === "HOME_TEAM" ? " won" : ""}`}>
        <TeamLabel team={match.homeTeam} league={league} short />
      </div>
      <div className="scorebox">
        {done || live ? (
          <>
            <b>{home ?? 0}</b>
            <b>{away ?? 0}</b>
            {note ? <small>{note}</small> : null}
          </>
        ) : (
          <span>{formatTime(match.utcDate)}</span>
        )}
      </div>
      <div className={`match-side away${winner === "AWAY_TEAM" ? " won" : ""}`}>
        <TeamLabel team={match.awayTeam} league={league} short />
      </div>
    </div>
  );
}
