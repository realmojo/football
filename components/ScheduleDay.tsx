import { MatchRow } from "@/components/MatchRow";
import { h2hSlug, type KoreanPlayer } from "@/lib/data";
import { byCompetition, koreanNames } from "@/lib/schedule";
import type { Match } from "@/lib/types";

// 하루 경기를 대회별로 묶어 보여준다. 한국 선수 소속팀 경기는 이름을 붙인다.
export function ScheduleDay({
  matches,
  byTeam,
  h2h = new Set(),
}: {
  matches: Match[];
  byTeam: Map<number, KoreanPlayer[]>;
  // 맞대결 기록이 있는 경기 id
  h2h?: Set<number>;
}) {
  return (
    <>
      {byCompetition(matches).map(({ league, matches: list }) => (
        <div key={league.code} className="block">
          <h3 className="block-title">
            <a href={`/${league.code}`}>{league.name}</a>
          </h3>
          {list.map((m) => {
            const names = koreanNames(m, byTeam);
            return (
              <div key={m.id} className={names.length || h2h.has(m.id) ? "tagged" : undefined}>
                {names.length ? <span className="tag ko-tag">한국 선수 · {names.join(", ")}</span> : null}
                <MatchRow match={m} league={league.code} />
                {h2h.has(m.id) ? (
                  <a href={`/h2h/${h2hSlug(m.homeTeam.id, m.awayTeam.id)}`} className="h2h-link">
                    역대 맞대결 보기 →
                  </a>
                ) : null}
              </div>
            );
          })}
        </div>
      ))}
    </>
  );
}
