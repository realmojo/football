import "server-only";
import { getCompetition } from "./data";

// 검색 제목에 넣을 시즌 표기. 해를 넘기는 시즌은 "2026-27", 한 해 안에 끝나면 "2026".
export async function seasonLabel(code: string) {
  try {
    const c = await getCompetition(code);
    const start = Number(c.season_start.slice(0, 4));
    const end = Number(c.season_end.slice(0, 4));
    return start === end ? `${start}` : `${start}-${String(end).slice(2)}`;
  } catch {
    return "";
  }
}
