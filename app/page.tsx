import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { MatchRow } from "@/components/MatchRow";
import { TeamLabel } from "@/components/TeamLabel";
import { isFinished, isUpcoming } from "@/lib/analysis";
import { getArticles, getSeasonMatches, getStandings } from "@/lib/data";
import { finalMatch, winnerOf } from "@/lib/cup";
import { isCup, LEAGUES, leagueEmblem } from "@/lib/leagues";
import type { Match, StandingsResponse } from "@/lib/types";

// 수집된 최신 데이터를 보여주기 위해 요청마다 렌더링한다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function HomePage() {
  const results = await Promise.all(
    LEAGUES.map(async (l) => {
      const [standings, matches] = await Promise.allSettled([getStandings(l.code), getSeasonMatches(l.code)]);
      return {
        league: l,
        standings: standings.status === "fulfilled" ? standings.value : null,
        matches: matches.status === "fulfilled" ? matches.value : [],
      };
    }),
  );

  const articles = await getArticles(4).catch(() => []);

  const leagueResults = results.filter((r) => !isCup(r.league));
  const worldCup = results.find((r) => r.league.code === "WC");
  const wcFinal = worldCup ? finalMatch(worldCup.matches) : null;
  const wcChampion = wcFinal && wcFinal.status === "FINISHED" ? winnerOf(wcFinal) : null;

  const tagged = leagueResults.flatMap((r) => r.matches.map((m) => ({ match: m, league: r.league })));
  const upcoming = tagged
    .filter((t) => isUpcoming(t.match))
    .sort((a, b) => a.match.utcDate.localeCompare(b.match.utcDate))
    .slice(0, 6);
  const recent = tagged
    .filter((t) => isFinished(t.match))
    .sort((a, b) => b.match.utcDate.localeCompare(a.match.utcDate))
    .slice(0, 6);

  return (
    <>
      <section className="home-hero">
        <h1>해외축구 순위 · 일정 · 결과를 한국시간으로</h1>
        <p>
          토리코리는 프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그의 순위와 경기 일정, 결과를 한곳에
          모았습니다. 모든 경기 시간은 한국시간으로 표시하고, 팀 이름을 누르면 최근 흐름과 홈·원정 성적, 다음 경기 프리뷰를
          볼 수 있습니다.
        </p>
      </section>

      {wcFinal ? (
        <a href="/WC" className="wc-banner">
          <Crest src="https://crests.football-data.org/wm26.png" tla="WC" size={40} />
          <div>
            <span>2026 북중미 월드컵</span>
            <strong>
              {wcChampion ? `${wcChampion.name} 우승` : "월드컵"} · 결승 {wcFinal.homeTeam.name} {wcFinal.score.fullTime.home}-
              {wcFinal.score.fullTime.away} {wcFinal.awayTeam.name}
            </strong>
          </div>
          <em>조별리그 · 대진표 · 득점왕 보기 →</em>
        </a>
      ) : null}

      <div className="split">
        <section>
          <div className="sec-head">
            <h2>리그별 순위</h2>
          </div>
          <div className="league-grid">
            {leagueResults.map(({ league, standings }) => (
              <MiniTable key={league.code} code={league.code} name={league.name} standings={standings} />
            ))}
          </div>
        </section>

        <aside className="rail">
          <MatchList title="다음 경기" items={upcoming} empty="예정된 경기가 없습니다." />
          <MatchList title="최근 결과" items={recent} empty="최근 경기 결과가 없습니다." />
        </aside>
      </div>

      {articles.length ? (
        <section className="home-articles">
          <div className="sec-head">
            <h2>축구 칼럼</h2>
            <a href="/articles">전체 보기 →</a>
          </div>
          <ul>
            {articles.map((a) => (
              <li key={a.slug}>
                <a href={`/articles/${a.slug}`}>
                  <strong>{a.title}</strong>
                  <span>{a.description}</span>
                </a>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      <section className="home-about">
        <h2>토리코리 활용법</h2>
        <div className="home-about-cols">
          <div>
            <h3>순위표</h3>
            <p>
              전체 순위와 함께 홈·원정 순위를 따로 볼 수 있습니다. 순위 옆 색 막대로 챔피언스리그 진출권과 강등권을 한눈에
              확인하세요.
            </p>
          </div>
          <div>
            <h3>일정 · 결과</h3>
            <p>라운드별로 모든 경기를 한국시간 기준으로 정리했습니다. 지난 라운드의 스코어도 바로 확인할 수 있습니다.</p>
          </div>
          <div>
            <h3>팀 분석</h3>
            <p>
              경기당 득점·실점, 무실점 비율, 최근 5경기 흐름 등을 계산해 보여줍니다. 리그끼리의 차이는{" "}
              <a href="/stats">5대 리그 통계 비교</a>에서, 낯선 용어는 <a href="/glossary">축구 용어 사전</a>에서 확인하세요.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}

function MiniTable({ code, name, standings }: { code: string; name: string; standings: StandingsResponse | null }) {
  const table = standings?.standings.find((s) => s.type === "TOTAL")?.table.slice(0, 5) ?? [];
  return (
    <div className="mini">
      <a href={`/${code}`} className="mini-head">
        <Crest src={leagueEmblem(code)} tla={code} size={22} />
        <strong>{name}</strong>
        <span className="mini-more">전체 순위 →</span>
      </a>
      {table.length ? (
        <table className="standings mini-table">
          <thead>
            <tr>
              <th className="pos">#</th>
              <th className="left">팀</th>
              <th>경기</th>
              <th>득실</th>
              <th className="pts">승점</th>
            </tr>
          </thead>
          <tbody>
            {table.map((row) => (
              <tr key={row.team.id}>
                <td className="pos">{row.position}</td>
                <td className="left">
                  <TeamLabel team={row.team} league={code} short />
                </td>
                <td>{row.playedGames}</td>
                <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                <td className="pts">{row.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="muted mini-empty">순위 정보가 아직 없습니다.</p>
      )}
    </div>
  );
}

function MatchList({
  title,
  items,
  empty,
}: {
  title: string;
  items: { match: Match; league: { code: string; name: string } }[];
  empty: string;
}) {
  return (
    <div className="block">
      <h3 className="block-title">{title}</h3>
      {items.length ? (
        items.map(({ match, league }) => (
          <div key={match.id} className="tagged">
            <a href={`/${league.code}/matches`} className="tag">
              {league.name}
            </a>
            <MatchRow match={match} league={league.code} showDate />
          </div>
        ))
      ) : (
        <p className="muted">{empty}</p>
      )}
    </div>
  );
}
