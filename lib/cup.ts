import { computeTable } from "./analysis";
import { KNOCKOUT_ROUNDS, stageLabel } from "./leagues";
import type { Match, TableRow, Team } from "./types";

// 컵대회(월드컵) 계산. football-data.org 가 월드컵 순위표를 주지 않아 경기 결과로 직접 만든다.

export interface GroupTable {
  group: string;
  table: TableRow[];
}

export function groupTables(matches: Match[]): GroupTable[] {
  const byGroup = new Map<string, Match[]>();
  for (const m of matches) {
    if (m.stage !== "GROUP_STAGE" || !m.group) continue;
    byGroup.set(m.group, [...(byGroup.get(m.group) ?? []), m]);
  }
  return [...byGroup.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([group, list]) => {
      const teams = new Map<number, Team>();
      for (const m of list) {
        teams.set(m.homeTeam.id, m.homeTeam);
        teams.set(m.awayTeam.id, m.awayTeam);
      }
      return { group, table: computeTable(list, [...teams.values()], "TOTAL") };
    });
}

// 토너먼트에 오른 팀: 조별리그가 아닌 경기에 나온 팀
export function knockoutTeams(matches: Match[]) {
  const ids = new Set<number>();
  for (const m of matches) {
    if (m.stage === "GROUP_STAGE") continue;
    ids.add(m.homeTeam.id);
    ids.add(m.awayTeam.id);
  }
  return ids;
}

// 각 조 3위 팀끼리의 순위
export function thirdPlaced(groups: GroupTable[]) {
  return groups
    .map((g) => ({ group: g.group, row: g.table[2] }))
    .filter((x) => x.row)
    .sort(
      (a, b) =>
        b.row.points - a.row.points ||
        b.row.goalDifference - a.row.goalDifference ||
        b.row.goalsFor - a.row.goalsFor ||
        a.row.team.name.localeCompare(b.row.team.name),
    );
}

export function winnerOf(m: Match): Team | null {
  if (m.score.winner === "HOME_TEAM") return m.homeTeam;
  if (m.score.winner === "AWAY_TEAM") return m.awayTeam;
  return null;
}

export function loserOf(m: Match): Team | null {
  if (m.score.winner === "HOME_TEAM") return m.awayTeam;
  if (m.score.winner === "AWAY_TEAM") return m.homeTeam;
  return null;
}

export function finalMatch(matches: Match[]) {
  return matches.find((m) => m.stage === "FINAL") ?? null;
}

// 대진표: 결승에서 거꾸로 올라가며 각 라운드 경기를 위아래 순서대로 맞춘다.
export function bracketRounds(matches: Match[]) {
  const byRound = new Map<string, Match[]>(KNOCKOUT_ROUNDS.map((r) => [r, matches.filter((m) => m.stage === r)]));
  const ordered = new Map<string, Match[]>();
  ordered.set("FINAL", byRound.get("FINAL") ?? []);

  for (let i = KNOCKOUT_ROUNDS.length - 2; i >= 0; i--) {
    const round = KNOCKOUT_ROUNDS[i];
    const next = ordered.get(KNOCKOUT_ROUNDS[i + 1]) ?? [];
    const pool = [...(byRound.get(round) ?? [])].sort((a, b) => a.utcDate.localeCompare(b.utcDate));
    const result: Match[] = [];
    for (const nm of next) {
      for (const team of [nm.homeTeam, nm.awayTeam]) {
        const idx = pool.findIndex((m) => winnerOf(m)?.id === team.id);
        if (idx >= 0) result.push(...pool.splice(idx, 1));
      }
    }
    // 아직 결과가 없어 짝을 못 찾은 경기는 날짜순으로 뒤에 붙인다.
    ordered.set(round, [...result, ...pool]);
  }
  return KNOCKOUT_ROUNDS.map((r) => ({ round: r, label: stageLabel(r), matches: ordered.get(r) ?? [] }));
}

// 한 팀의 대회 최종 성적
export function teamFinish(matches: Match[], teamId: number) {
  const mine = matches.filter((m) => m.homeTeam.id === teamId || m.awayTeam.id === teamId);
  if (!mine.length) return null;
  const final = mine.find((m) => m.stage === "FINAL");
  if (final && final.status === "FINISHED") return winnerOf(final)?.id === teamId ? "우승" : "준우승";
  const third = mine.find((m) => m.stage === "THIRD_PLACE");
  if (third && third.status === "FINISHED") return winnerOf(third)?.id === teamId ? "3위" : "4위";
  const order = ["GROUP_STAGE", ...KNOCKOUT_ROUNDS];
  const last = mine.reduce((acc, m) => (order.indexOf(m.stage) > order.indexOf(acc.stage) ? m : acc), mine[0]);
  if (last.status !== "FINISHED") return `${stageLabel(last.stage)} 진출`;
  if (last.stage === "GROUP_STAGE") return "조별리그 탈락";
  return winnerOf(last)?.id === teamId ? `${stageLabel(last.stage)} 진출` : `${stageLabel(last.stage)} 탈락`;
}
