import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { getScorers, getSeasonMatches } from "@/lib/data";
import { fixed, leagueStageMatches, pct, summarize, teamStats, teamsOf, type LeagueSummary } from "@/lib/insights";
import { DOMESTIC_LEAGUES, leagueEmblem } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "5대 리그 통계 비교 · 경기당 골, 홈 승률, 무승부 비율",
  description:
    "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1의 이번 시즌 경기당 골, 홈·원정 승률, 무승부, 2.5골 오버, 양팀 득점, 후반 득점 비율과 득점 선두를 한 표로 비교합니다.",
  alternates: { canonical: "/stats" },
};

interface Row {
  code: string;
  name: string;
  s: LeagueSummary;
  bestAttack: { name: string; value: number } | null;
  topScorer: { name: string; goals: number } | null;
}

function leaderOf(rows: Row[], value: (r: Row) => number, dir: "max" | "min" = "max") {
  const valid = rows.filter((r) => r.s.matches && Number.isFinite(value(r)));
  if (!valid.length) return null;
  return valid.reduce((best, r) => ((dir === "max" ? value(r) > value(best) : value(r) < value(best)) ? r : best));
}

function halfShare(s: LeagueSummary) {
  return pct(s.secondHalfGoals, s.firstHalfGoals + s.secondHalfGoals);
}

export default async function StatsPage() {
  const loaded = await Promise.all(
    DOMESTIC_LEAGUES.map(async (l) => {
      const [matches, scorers] = await Promise.all([
        getSeasonMatches(l.code).catch(() => []),
        getScorers(l.code).catch(() => []),
      ]);
      return { league: l, season: leagueStageMatches(matches), scorers };
    }),
  );
  const rows: Row[] = loaded.map(({ league, season, scorers }) => {
    const attack = teamStats(season, teamsOf(season))
      .filter((t) => t.played)
      .sort((a, b) => b.goalsFor / b.played - a.goalsFor / a.played)[0];
    return {
      code: league.code,
      name: league.name,
      s: summarize(season),
      bestAttack: attack ? { name: attack.team.shortName, value: attack.goalsFor / attack.played } : null,
      topScorer: scorers[0] ? { name: scorers[0].name, goals: scorers[0].goals } : null,
    };
  });
  const all = summarize(loaded.flatMap((l) => l.season));

  const mostGoals = leaderOf(rows, (r) => r.s.goalsPerGame);
  const fewestGoals = leaderOf(rows, (r) => r.s.goalsPerGame, "min");
  const homeEdge = leaderOf(rows, (r) => pct(r.s.homeWins, r.s.matches) - pct(r.s.awayWins, r.s.matches));
  const mostDraws = leaderOf(rows, (r) => pct(r.s.draws, r.s.matches));
  const lateGoals = leaderOf(rows, (r) => halfShare(r.s));
  const minMatches = Math.min(...rows.map((r) => r.s.matches));

  return (
    <article className="review">
      <header className="prose review-lead">
        <h1>5대 리그 통계 비교</h1>
        <p className="lead">
          같은 축구라도 리그마다 골이 나오는 방식, 홈 이점의 크기, 무승부가 나오는 빈도가 다릅니다. 이번 시즌 끝난 경기
          결과만으로 다섯 리그의 색깔을 숫자로 비교했습니다.
        </p>
      </header>

      <div className="block">
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr>
                <th className="left">리그</th>
                <th>경기</th>
                <th>경기당 골</th>
                <th>홈 승</th>
                <th>무승부</th>
                <th>원정 승</th>
                <th>2.5골 오버</th>
                <th>양팀 득점</th>
                <th>후반 골 비중</th>
                <th>역전승</th>
              </tr>
            </thead>
            <tbody>
              {[...rows.map((r) => ({ ...r, total: false })), { code: "ALL", name: "5대 리그 전체", s: all, total: true }].map(
                ({ code, name, s, total }) => (
                  <tr key={code} className={total ? "total-row" : undefined}>
                    <td className="left">
                      {total ? (
                        name
                      ) : (
                        <a href={`/${code}/stats`} className="league-cell">
                          <Crest src={leagueEmblem(code)} tla={code} size={20} />
                          {name}
                        </a>
                      )}
                    </td>
                    <td>{s.matches}</td>
                    <td className="pts">{fixed(s.goalsPerGame)}</td>
                    <td>{pct(s.homeWins, s.matches)}%</td>
                    <td>{pct(s.draws, s.matches)}%</td>
                    <td>{pct(s.awayWins, s.matches)}%</td>
                    <td>{pct(s.over25, s.matches)}%</td>
                    <td>{pct(s.btts, s.matches)}%</td>
                    <td>{halfShare(s)}%</td>
                    <td>{s.comebacks.length}</td>
                  </tr>
                ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      <div className="prose review-lead">
        <h2>숫자로 본 이번 시즌</h2>
        {mostGoals && fewestGoals && mostGoals !== fewestGoals ? (
          <p>
            경기당 골이 가장 많은 리그는 {mostGoals.name}({fixed(mostGoals.s.goalsPerGame)}골), 가장 적은 리그는{" "}
            {fewestGoals.name}({fixed(fewestGoals.s.goalsPerGame)}골)입니다. 차이는 경기당{" "}
            {fixed(mostGoals.s.goalsPerGame - fewestGoals.s.goalsPerGame)}골로, 한 시즌 380경기로 환산하면 약{" "}
            {Math.round((mostGoals.s.goalsPerGame - fewestGoals.s.goalsPerGame) * 380)}골 차이에 해당합니다.
          </p>
        ) : null}
        {homeEdge ? (
          <p>
            홈 승률과 원정 승률의 차이가 가장 큰 리그는 {homeEdge.name}입니다(홈 {pct(homeEdge.s.homeWins, homeEdge.s.matches)}% ·
            원정 {pct(homeEdge.s.awayWins, homeEdge.s.matches)}%). 홈 이점이 큰 리그일수록 시즌 막판 남은 홈 경기 수가 순위
            싸움의 변수가 됩니다.
          </p>
        ) : null}
        {mostDraws ? (
          <p>
            무승부 비율이 가장 높은 리그는 {mostDraws.name}입니다({pct(mostDraws.s.draws, mostDraws.s.matches)}%). 무승부가
            많은 리그는 팀 간 전력 차가 작거나 수비적인 운영이 많다는 신호이며, 승점 1점의 가치가 커져 중위권 순위가
            촘촘해지는 경향이 있습니다.
          </p>
        ) : null}
        {lateGoals ? (
          <p>
            후반 골 비중이 가장 높은 리그는 {lateGoals.name}입니다({halfShare(lateGoals.s)}%). 경기 막판까지 결과를 알 수 없는
            리그라는 뜻이기도 합니다.
          </p>
        ) : null}
        {minMatches < 100 ? (
          <p>
            아직 리그마다 경기 수가 {minMatches}경기 안팎이라 표본이 작습니다. 한 라운드 결과로도 비율이 몇 %p씩 움직일 수
            있으니 흐름을 보는 참고 자료로 활용해 주세요. 이 표는 약 10분마다 새 경기 결과를 반영합니다.
          </p>
        ) : null}
      </div>

      <div className="block">
        <h3 className="block-title">리그별 공격 선두</h3>
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr>
                <th className="left">리그</th>
                <th className="left">경기당 득점 1위 팀</th>
                <th className="left">득점 선두</th>
                <th>자세히</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.code}>
                  <td className="left">{r.name}</td>
                  <td className="left">{r.bestAttack ? `${r.bestAttack.name} (${fixed(r.bestAttack.value)}골)` : "-"}</td>
                  <td className="left">{r.topScorer ? `${r.topScorer.name} (${r.topScorer.goals}골)` : "-"}</td>
                  <td>
                    <a href={`/${r.code}/stats`}>통계 →</a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="prose review-lead">
        <h2>리그를 비교할 때 기억할 점</h2>
        <p>
          리그 평균은 상위권과 하위권의 전력 차이에도 크게 좌우됩니다. 한두 팀이 골을 몰아서 넣으면 리그 평균이
          올라가지만, 그렇다고 리그 전체가 공격적인 것은 아닙니다. 경기당 골과 함께 양팀 득점 비율을 보면 골이 특정 팀에
          몰려 있는지, 여러 경기에 고르게 나오는지 구분할 수 있습니다.
        </p>
        <p>
          분데스리가와 리그 1은 18개 팀이 34경기, 나머지 세 리그는 20개 팀이 38경기를 치르므로 누적 기록보다 경기당
          수치로 비교하는 것이 공정합니다. 각 리그의 구조 차이는 <a href="/articles/big-five-leagues">유럽 5대 리그 비교</a>{" "}
          칼럼에 정리해 두었습니다.
        </p>
      </div>
    </article>
  );
}
