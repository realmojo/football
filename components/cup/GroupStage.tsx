import { MatchRow } from "@/components/MatchRow";
import { ScorerTable } from "@/components/ScorerTable";
import { TeamLabel } from "@/components/TeamLabel";
import { finalMatch, groupTables, knockoutTeams, thirdPlaced, winnerOf } from "@/lib/cup";
import { groupLabel } from "@/lib/leagues";
import type { Match, Scorer } from "@/lib/types";
import { Crest } from "../Crest";

const KOREA = "대한민국";

export function GroupStage({ matches, scorers, league }: { matches: Match[]; scorers: Scorer[]; league: string }) {
  const groups = groupTables(matches);
  const advanced = knockoutTeams(matches);
  const thirds = thirdPlaced(groups);
  const final = finalMatch(matches);
  const champion = final && final.status === "FINISHED" ? winnerOf(final) : null;
  const korea = matches
    .filter((m) => m.homeTeam.name === KOREA || m.awayTeam.name === KOREA)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));

  return (
    <div className="split">
      <section>
        <div className="sec-head">
          <h2>조별리그 순위</h2>
        </div>
        <div className="group-grid">
          {groups.map((g) => (
            <div key={g.group} className="table-wrap">
              <h3 className="group">{groupLabel(g.group)}</h3>
              <table className="standings">
                <caption className="sr-only">{groupLabel(g.group)} 순위표</caption>
                <thead>
                  <tr>
                    <th scope="col" className="pos">순위</th>
                    <th scope="col" className="left">팀</th>
                    <th scope="col">경기</th>
                    <th scope="col">승</th>
                    <th scope="col">무</th>
                    <th scope="col">패</th>
                    <th scope="col">득실</th>
                    <th scope="col" className="pts">승점</th>
                  </tr>
                </thead>
                <tbody>
                  {g.table.map((row) => (
                    <tr key={row.team.id} className={advanced.has(row.team.id) ? "z-ko" : undefined}>
                      <td className="pos">{row.position}</td>
                      <td className="left">
                        <TeamLabel team={row.team} league={league} short />
                      </td>
                      <td>{row.playedGames}</td>
                      <td>{row.won}</td>
                      <td>{row.draw}</td>
                      <td>{row.lost}</td>
                      <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                      <td className="pts">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
        <ul className="legend">
          <li className="z-ko">32강 토너먼트 진출</li>
        </ul>

        {thirds.length ? (
          <div className="block third-place">
            <h3 className="block-title">조 3위 팀 순위 (상위 8팀 32강 진출)</h3>
            <div className="table-wrap">
              <table className="standings">
                <caption className="sr-only">조 3위 팀 순위표</caption>
                <thead>
                  <tr>
                    <th scope="col" className="pos">순위</th>
                    <th scope="col" className="left">팀</th>
                    <th scope="col">조</th>
                    <th scope="col">승점</th>
                    <th scope="col">득실</th>
                    <th scope="col">득점</th>
                    <th scope="col" className="left">결과</th>
                  </tr>
                </thead>
                <tbody>
                  {thirds.map((t, i) => (
                    <tr key={t.row.team.id} className={advanced.has(t.row.team.id) ? "z-ko" : undefined}>
                      <td className="pos">{i + 1}</td>
                      <td className="left">
                        <TeamLabel team={t.row.team} league={league} short />
                      </td>
                      <td>{groupLabel(t.group)}</td>
                      <td className="pts">{t.row.points}</td>
                      <td>{t.row.goalDifference > 0 ? `+${t.row.goalDifference}` : t.row.goalDifference}</td>
                      <td>{t.row.goalsFor}</td>
                      <td className="left">{advanced.has(t.row.team.id) ? "진출" : "탈락"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        <p className="muted small-note">
          조별 순위는 경기 결과로 계산했습니다(승점 → 골득실 → 다득점 순). FIFA 공식 순위는 승점이 같을 때 맞대결 성적을 먼저
          따지므로 일부 순위가 다를 수 있으며, 32강 진출 여부는 실제 대진을 기준으로 표시합니다.
        </p>
      </section>

      <aside className="rail">
        {champion ? (
          <div className="champion">
            <span>우승</span>
            <div>
              <Crest src={champion.crest} tla={champion.tla} size={44} />
              <strong>{champion.name}</strong>
            </div>
            <a href={`/${league}/bracket`}>토너먼트 대진표 보기 →</a>
          </div>
        ) : null}

        {final ? (
          <div className="block">
            <h3 className="block-title">결승</h3>
            <MatchRow match={final} league={league} showDate />
          </div>
        ) : null}

        {scorers.length ? (
          <div className="block">
            <h3 className="block-title">
              득점 TOP 5 <a href={`/${league}/scorers`}>전체 →</a>
            </h3>
            <ScorerTable scorers={scorers.slice(0, 5)} league={league} compact />
          </div>
        ) : null}

        {korea.length ? (
          <div className="block">
            <h3 className="block-title">대한민국 경기</h3>
            {korea.map((m) => (
              <MatchRow key={m.id} match={m} league={league} showDate />
            ))}
          </div>
        ) : null}
      </aside>
    </div>
  );
}
