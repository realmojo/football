// 해외파 한국 선수와 여러 대회 경기를 엮는 도우미
import { isFinished, isUpcoming } from "./analysis";
import type { KoreanPlayer } from "./data";
import type { Match } from "./types";

const CUP_CODES = new Set(["CL", "WC"]);

// 팀 링크에 쓸 대회 코드. 국내 리그를 먼저 고른다.
export function homeCompetition(teamId: number, matches: Match[]) {
  const codes = new Set(
    matches.filter((m) => m.homeTeam.id === teamId || m.awayTeam.id === teamId).map((m) => m.competition!),
  );
  return [...codes].find((c) => !CUP_CODES.has(c)) ?? [...codes][0] ?? null;
}

export function teamSchedule(teamId: number, matches: Match[]) {
  const mine = matches.filter((m) => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
  return {
    upcoming: mine.filter(isUpcoming).sort((a, b) => a.utcDate.localeCompare(b.utcDate)),
    recent: mine.filter(isFinished).sort((a, b) => b.utcDate.localeCompare(a.utcDate)),
  };
}

export function koreansByTeam(players: KoreanPlayer[]) {
  const map = new Map<number, KoreanPlayer[]>();
  for (const p of players) {
    if (!p.team) continue;
    map.set(p.team.id, [...(map.get(p.team.id) ?? []), p]);
  }
  return map;
}

export function totalGoals(p: KoreanPlayer) {
  return p.scoring.reduce((n, s) => n + s.goals, 0);
}

export function totalAssists(p: KoreanPlayer) {
  return p.scoring.reduce((n, s) => n + (s.assists ?? 0), 0);
}
