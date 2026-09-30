// 리그 통계와 라운드 리뷰에 쓰는 계산. 모두 수집된 경기 결과만으로 계산한다.
import { computeTable, isFinished, resultFor, type Result } from "./analysis";
import type { Match, TableRow, Team } from "./types";

const LEAGUE_STAGES = new Set(["REGULAR_SEASON", "LEAGUE_STAGE"]);

// 라운드(matchday)가 있는 리그 경기만. 챔피언스리그 녹아웃 단계는 뺀다.
export function leagueStageMatches(matches: Match[]) {
  return matches.filter((m) => m.matchday != null && LEAGUE_STAGES.has(m.stage));
}

function ft(m: Match) {
  return { home: m.score.fullTime.home ?? 0, away: m.score.fullTime.away ?? 0 };
}

function ht(m: Match) {
  const { home, away } = m.score.halfTime;
  return home == null || away == null ? null : { home, away };
}

export function totalGoals(m: Match) {
  const s = ft(m);
  return s.home + s.away;
}

export function margin(m: Match) {
  const s = ft(m);
  return Math.abs(s.home - s.away);
}

export function pct(part: number, whole: number) {
  return whole ? Math.round((part / whole) * 100) : 0;
}

export function fixed(value: number, digits = 2) {
  return Number.isFinite(value) ? value.toFixed(digits) : "-";
}

export function scoreText(m: Match) {
  const s = ft(m);
  return `${m.homeTeam.shortName} ${s.home}-${s.away} ${m.awayTeam.shortName}`;
}

// 전반을 뒤진 채 마쳤는데 이긴 팀 (없으면 null)
export function comebackWinner(m: Match): Team | null {
  const h = ht(m);
  if (!h) return null;
  const f = ft(m);
  if (h.home < h.away && f.home > f.away) return m.homeTeam;
  if (h.away < h.home && f.away > f.home) return m.awayTeam;
  return null;
}

function byMarginThenGoals(a: Match, b: Match) {
  return margin(b) - margin(a) || totalGoals(b) - totalGoals(a) || a.utcDate.localeCompare(b.utcDate);
}

function byGoalsThenMargin(a: Match, b: Match) {
  return totalGoals(b) - totalGoals(a) || margin(b) - margin(a) || a.utcDate.localeCompare(b.utcDate);
}

// ── 리그 전체 요약 ─────────────────────────

export interface LeagueSummary {
  matches: number;
  goals: number;
  goalsPerGame: number;
  homeWins: number;
  draws: number;
  awayWins: number;
  over25: number;
  btts: number;
  goalless: number;
  firstHalfGoals: number;
  secondHalfGoals: number;
  comebacks: Match[];
  biggestWins: Match[];
  highestScoring: Match[];
  scorelines: { label: string; count: number }[];
}

export function summarize(matches: Match[]): LeagueSummary {
  const done = matches.filter(isFinished);
  let goals = 0;
  let homeWins = 0;
  let draws = 0;
  let awayWins = 0;
  let over25 = 0;
  let btts = 0;
  let goalless = 0;
  let firstHalfGoals = 0;
  let secondHalfGoals = 0;
  const lines = new Map<string, number>();

  for (const m of done) {
    const s = ft(m);
    const total = s.home + s.away;
    goals += total;
    if (s.home > s.away) homeWins++;
    else if (s.home < s.away) awayWins++;
    else draws++;
    if (total > 2) over25++;
    if (s.home > 0 && s.away > 0) btts++;
    if (total === 0) goalless++;
    const h = ht(m);
    if (h) {
      firstHalfGoals += h.home + h.away;
      secondHalfGoals += total - h.home - h.away;
    }
    // 홈·원정 구분 없이 이긴 쪽 점수를 앞에 둔다.
    const label = `${Math.max(s.home, s.away)}-${Math.min(s.home, s.away)}`;
    lines.set(label, (lines.get(label) ?? 0) + 1);
  }

  return {
    matches: done.length,
    goals,
    goalsPerGame: done.length ? goals / done.length : NaN,
    homeWins,
    draws,
    awayWins,
    over25,
    btts,
    goalless,
    firstHalfGoals,
    secondHalfGoals,
    comebacks: done.filter((m) => comebackWinner(m)),
    biggestWins: done.filter((m) => margin(m) > 0).sort(byMarginThenGoals).slice(0, 3),
    highestScoring: [...done].sort(byGoalsThenMargin).slice(0, 3),
    scorelines: [...lines.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
      .slice(0, 5),
  };
}

// ── 팀별 세부 통계 ─────────────────────────

export interface TeamStats {
  team: Team;
  played: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  cleanSheets: number;
  failedToScore: number;
  over25: number;
  btts: number;
  homePlayed: number;
  homePoints: number;
  awayPlayed: number;
  awayPoints: number;
  firstHalfFor: number;
  secondHalfFor: number;
  firstHalfAgainst: number;
  secondHalfAgainst: number;
  // 전반을 뒤진 경기에서 얻은 승점
  pointsFromBehind: number;
  // 전반을 앞선 경기에서 놓친 승점
  pointsDroppedFromLead: number;
}

const RESULT_POINTS: Record<Result, number> = { W: 3, D: 1, L: 0 };

export function teamStats(matches: Match[], teams: Team[]): TeamStats[] {
  return teams.map((team) => {
    const s: TeamStats = {
      team,
      played: 0,
      points: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      cleanSheets: 0,
      failedToScore: 0,
      over25: 0,
      btts: 0,
      homePlayed: 0,
      homePoints: 0,
      awayPlayed: 0,
      awayPoints: 0,
      firstHalfFor: 0,
      secondHalfFor: 0,
      firstHalfAgainst: 0,
      secondHalfAgainst: 0,
      pointsFromBehind: 0,
      pointsDroppedFromLead: 0,
    };
    for (const m of matches) {
      if (!isFinished(m)) continue;
      const home = m.homeTeam.id === team.id;
      if (!home && m.awayTeam.id !== team.id) continue;
      const f = ft(m);
      const gf = home ? f.home : f.away;
      const ga = home ? f.away : f.home;
      const pts = RESULT_POINTS[resultFor(m, team.id)];
      s.played++;
      s.points += pts;
      s.goalsFor += gf;
      s.goalsAgainst += ga;
      if (ga === 0) s.cleanSheets++;
      if (gf === 0) s.failedToScore++;
      if (gf + ga > 2) s.over25++;
      if (gf > 0 && ga > 0) s.btts++;
      if (home) {
        s.homePlayed++;
        s.homePoints += pts;
      } else {
        s.awayPlayed++;
        s.awayPoints += pts;
      }
      const h = ht(m);
      if (h) {
        const hf = home ? h.home : h.away;
        const ha = home ? h.away : h.home;
        s.firstHalfFor += hf;
        s.firstHalfAgainst += ha;
        s.secondHalfFor += gf - hf;
        s.secondHalfAgainst += ga - ha;
        if (hf < ha) s.pointsFromBehind += pts;
        if (hf > ha) s.pointsDroppedFromLead += 3 - pts;
      }
    }
    return s;
  });
}

// 리그에 속한 팀 목록 (경기에 나온 팀 기준)
export function teamsOf(matches: Match[]): Team[] {
  const map = new Map<number, Team>();
  for (const m of matches) {
    map.set(m.homeTeam.id, m.homeTeam);
    map.set(m.awayTeam.id, m.awayTeam);
  }
  return [...map.values()];
}

// 가장 높은(또는 낮은) 값을 가진 팀. 동률이면 모두 돌려준다.
export function leaders<T>(rows: T[], value: (row: T) => number, dir: "max" | "min" = "max") {
  const valid = rows.filter((r) => Number.isFinite(value(r)));
  if (!valid.length) return { value: NaN, rows: [] as T[] };
  const best = dir === "max" ? Math.max(...valid.map(value)) : Math.min(...valid.map(value));
  return { value: best, rows: valid.filter((r) => value(r) === best) };
}

// ── 라운드 ─────────────────────────

const SKIPPED = new Set(["POSTPONED", "CANCELLED", "SUSPENDED"]);

// 연기·취소된 경기를 빼고 모든 경기가 끝난 라운드
export function completedRounds(matches: Match[]) {
  const rounds = new Map<number, Match[]>();
  for (const m of leagueStageMatches(matches)) {
    rounds.set(m.matchday!, [...(rounds.get(m.matchday!) ?? []), m]);
  }
  return [...rounds.entries()]
    .filter(([, list]) => {
      const played = list.filter((m) => !SKIPPED.has(m.status));
      return played.length > 0 && played.every(isFinished);
    })
    .map(([day]) => day)
    .sort((a, b) => a - b);
}

export interface Streak {
  team: Team;
  kind: "win" | "unbeaten" | "winless" | "loss";
  length: number;
}

// 가장 최근 경기부터 거꾸로 센 연속 기록
function streaksOf(matches: Match[], team: Team): Streak[] {
  const results = matches
    .filter((m) => isFinished(m) && (m.homeTeam.id === team.id || m.awayTeam.id === team.id))
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .map((m) => resultFor(m, team.id));
  const run = (ok: (r: Result) => boolean) => {
    let n = 0;
    while (n < results.length && ok(results[n])) n++;
    return n;
  };
  const out: Streak[] = [];
  const wins = run((r) => r === "W");
  const unbeaten = run((r) => r !== "L");
  const losses = run((r) => r === "L");
  const winless = run((r) => r !== "W");
  if (wins >= 3) out.push({ team, kind: "win", length: wins });
  else if (unbeaten >= 5) out.push({ team, kind: "unbeaten", length: unbeaten });
  if (losses >= 3) out.push({ team, kind: "loss", length: losses });
  else if (winless >= 4) out.push({ team, kind: "winless", length: winless });
  return out;
}

export interface RoundMove {
  row: TableRow;
  before: number | null;
  change: number;
}

export interface RoundReview {
  matchday: number;
  matches: Match[];
  summary: LeagueSummary;
  table: RoundMove[];
  leaderBefore: TableRow | null;
  upsets: { match: Match; winner: Team; winnerPos: number; loserPos: number }[];
  comebacks: { match: Match; winner: Team }[];
  streaks: Streak[];
}

export function reviewRound(all: Match[], teams: Team[], matchday: number): RoundReview {
  const season = leagueStageMatches(all);
  const matches = season.filter((m) => m.matchday === matchday).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const beforeMatches = season.filter((m) => m.matchday! < matchday);
  const afterMatches = season.filter((m) => m.matchday! <= matchday);
  const hasBefore = beforeMatches.some(isFinished);
  const before = hasBefore ? computeTable(beforeMatches, teams, "TOTAL") : [];
  const after = computeTable(afterMatches, teams, "TOTAL");
  const posBefore = new Map(before.map((r) => [r.team.id, r.position]));

  const upsets: RoundReview["upsets"] = [];
  // 순위가 의미를 가지려면 몇 라운드는 지나야 한다.
  if (matchday >= 3) {
    for (const m of matches.filter(isFinished)) {
      const w = m.score.winner;
      if (w !== "HOME_TEAM" && w !== "AWAY_TEAM") continue;
      const winner = w === "HOME_TEAM" ? m.homeTeam : m.awayTeam;
      const loser = w === "HOME_TEAM" ? m.awayTeam : m.homeTeam;
      const wp = posBefore.get(winner.id);
      const lp = posBefore.get(loser.id);
      if (wp && lp && wp - lp >= Math.ceil(teams.length / 3)) upsets.push({ match: m, winner, winnerPos: wp, loserPos: lp });
    }
    upsets.sort((a, b) => b.winnerPos - b.loserPos - (a.winnerPos - a.loserPos));
  }

  return {
    matchday,
    matches,
    summary: summarize(matches),
    table: after.map((row) => {
      const b = posBefore.get(row.team.id) ?? null;
      return { row, before: b, change: b == null ? 0 : b - row.position };
    }),
    leaderBefore: before[0] ?? null,
    upsets,
    comebacks: matches.flatMap((m) => {
      const winner = comebackWinner(m);
      return winner ? [{ match: m, winner }] : [];
    }),
    streaks: teams
      .flatMap((t) => streaksOf(afterMatches, t))
      .sort((a, b) => b.length - a.length || a.team.name.localeCompare(b.team.name))
      .slice(0, 8),
  };
}
