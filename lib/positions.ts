import "server-only";
import { getStandings } from "./data";
import { DOMESTIC_LEAGUES } from "./leagues";

// 국내 리그 전체 순위 (팀 id → 순위)
export async function leaguePositions() {
  const map = new Map<number, number>();
  const all = await Promise.all(DOMESTIC_LEAGUES.map((l) => getStandings(l.code).catch(() => null)));
  for (const s of all) {
    for (const row of s?.standings.find((t) => t.type === "TOTAL")?.table ?? []) map.set(row.team.id, row.position);
  }
  return map;
}
