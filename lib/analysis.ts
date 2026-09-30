import type { Match, TableRow, Team } from "./types";

export type Result = "W" | "D" | "L";

export interface Record {
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
}

export function isFinished(m: Match) {
  return m.status === "FINISHED" || m.status === "AWARDED";
}

export function isUpcoming(m: Match) {
  return m.status === "SCHEDULED" || m.status === "TIMED";
}

export function isLive(m: Match) {
  return m.status === "IN_PLAY" || m.status === "PAUSED";
}

export function teamMatches(matches: Match[], teamId: number) {
  return matches.filter((m) => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
}

export function resultFor(m: Match, teamId: number): Result {
  const { home, away } = m.score.fullTime;
  const mine = m.homeTeam.id === teamId ? home! : away!;
  const theirs = m.homeTeam.id === teamId ? away! : home!;
  return mine > theirs ? "W" : mine < theirs ? "L" : "D";
}

export function buildRecord(matches: Match[], teamId: number): Record {
  const r: Record = { played: 0, won: 0, draw: 0, lost: 0, goalsFor: 0, goalsAgainst: 0 };
  for (const m of matches) {
    if (!isFinished(m)) continue;
    const home = m.homeTeam.id === teamId;
    r.played++;
    r.goalsFor += (home ? m.score.fullTime.home : m.score.fullTime.away) ?? 0;
    r.goalsAgainst += (home ? m.score.fullTime.away : m.score.fullTime.home) ?? 0;
    const res = resultFor(m, teamId);
    if (res === "W") r.won++;
    else if (res === "D") r.draw++;
    else r.lost++;
  }
  return r;
}

export function points(r: Record) {
  return r.won * 3 + r.draw;
}

export function perGame(value: number, played: number) {
  return played ? (value / played).toFixed(2) : "-";
}

export interface TeamAnalysis {
  overall: Record;
  home: Record;
  away: Record;
  lastFive: { match: Match; result: Result }[];
  lastFiveRecord: Record;
  cleanSheets: number;
  failedToScore: number;
  over25: number;
  bttsCount: number;
  upcoming: Match[];
}

export function analyzeTeam(allMatches: Match[], teamId: number): TeamAnalysis {
  const mine = teamMatches(allMatches, teamId);
  const finished = mine
    .filter(isFinished)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate));
  const recent = finished.slice(0, 5);

  let cleanSheets = 0;
  let failedToScore = 0;
  let over25 = 0;
  let bttsCount = 0;
  for (const m of finished) {
    const home = m.homeTeam.id === teamId;
    const gf = (home ? m.score.fullTime.home : m.score.fullTime.away) ?? 0;
    const ga = (home ? m.score.fullTime.away : m.score.fullTime.home) ?? 0;
    if (ga === 0) cleanSheets++;
    if (gf === 0) failedToScore++;
    if (gf + ga > 2) over25++;
    if (gf > 0 && ga > 0) bttsCount++;
  }

  return {
    overall: buildRecord(finished, teamId),
    home: buildRecord(finished.filter((m) => m.homeTeam.id === teamId), teamId),
    away: buildRecord(finished.filter((m) => m.awayTeam.id === teamId), teamId),
    lastFive: recent.map((match) => ({ match, result: resultFor(match, teamId) })),
    lastFiveRecord: buildRecord(recent, teamId),
    cleanSheets,
    failedToScore,
    over25,
    bttsCount,
    upcoming: mine
      .filter(isUpcoming)
      .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
      .slice(0, 5),
  };
}

// 이번 시즌 두 팀 간 맞대결
export function headToHead(allMatches: Match[], teamA: number, teamB: number) {
  return allMatches
    .filter(
      (m) =>
        isFinished(m) &&
        ((m.homeTeam.id === teamA && m.awayTeam.id === teamB) ||
          (m.homeTeam.id === teamB && m.awayTeam.id === teamA)),
    )
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate));
}

// 최근 5경기 결과 ("W,D,L,..." 최신순). football-data.org 무료 플랜은 form 을 주지 않아 직접 계산한다.
export function recentForm(allMatches: Match[], teamId: number, count = 5) {
  return teamMatches(allMatches, teamId)
    .filter(isFinished)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, count)
    .map((m) => resultFor(m, teamId))
    .join(",");
}

// 경기 결과로 전체/홈/원정 순위표를 계산한다. (무료 플랜은 HOME/AWAY 순위를 주지 않음)
export function computeTable(allMatches: Match[], teams: Team[], side: "TOTAL" | "HOME" | "AWAY"): TableRow[] {
  const rows = teams.map((team) => {
    const played = teamMatches(allMatches, team.id).filter(
      (m) =>
        side === "TOTAL" ||
        (side === "HOME" && m.homeTeam.id === team.id) ||
        (side === "AWAY" && m.awayTeam.id === team.id),
    );
    const r = buildRecord(played, team.id);
    return {
      position: 0,
      team,
      playedGames: r.played,
      form: recentForm(played, team.id) || null,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      points: points(r),
      goalsFor: r.goalsFor,
      goalsAgainst: r.goalsAgainst,
      goalDifference: r.goalsFor - r.goalsAgainst,
    };
  });
  rows.sort(
    (a, b) =>
      b.points - a.points ||
      b.goalDifference - a.goalDifference ||
      b.goalsFor - a.goalsFor ||
      a.team.name.localeCompare(b.team.name),
  );
  rows.forEach((row, i) => (row.position = i + 1));
  return rows;
}
