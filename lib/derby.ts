import { isUpcoming } from "./analysis";
import type { Derby } from "./data";
import type { Match } from "./types";

// 이번 시즌 남은 두 팀의 맞대결 가운데 가장 가까운 경기
export function nextMeeting(d: Derby, matches: Match[]) {
  return matches
    .filter(
      (m) =>
        isUpcoming(m) &&
        ((m.homeTeam.id === d.teamA && m.awayTeam.id === d.teamB) || (m.homeTeam.id === d.teamB && m.awayTeam.id === d.teamA)),
    )
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0];
}
