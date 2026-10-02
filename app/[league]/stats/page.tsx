import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { Stat } from "@/components/Stat";
import { TeamLabel } from "@/components/TeamLabel";
import { getSeasonMatches } from "@/lib/data";
import {
  completedRounds,
  fixed,
  leagueStageMatches,
  pct,
  scoreText,
  summarize,
  teamStats,
  teamsOf,
  type TeamStats,
} from "@/lib/insights";
import { DOMESTIC_LEAGUES, findLeague, isCup } from "@/lib/leagues";
import { leagueParagraphs } from "@/lib/narrative";
import { seasonLabel } from "@/lib/season";

export const dynamic = "force-dynamic";

type Params = Promise<{ league: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const info = findLeague((await params).league);
  if (!info || isCup(info)) return {};
  return {
    title: `${await seasonLabel(info.code)} ${info.name} 시즌 통계 · 팀별 득실점, 홈·원정, 전후반 분석`.trim(),
    description: `${info.name} 이번 시즌 경기당 골, 홈·원정 승률, 2.5골 오버와 양팀 득점 비율, 팀별 전반·후반 득실점과 역전 승점, 자주 나온 스코어를 분석합니다.`,
    alternates: { canonical: `/${info.code}/stats` },
  };
}

function perGame(value: number, played: number) {
  return played ? fixed(value / played) : "-";
}

export default async function LeagueStatsPage({ params }: { params: Params }) {
  const info = findLeague((await params).league);
  if (!info || isCup(info)) notFound();
  const code = info.code;

  let matches;
  let others;
  try {
    [matches, others] = await Promise.all([
      getSeasonMatches(code),
      Promise.all(DOMESTIC_LEAGUES.map((l) => getSeasonMatches(l.code).catch(() => []))),
    ]);
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const season = leagueStageMatches(matches);
  const s = summarize(season);
  const avg = summarize(others.flatMap(leagueStageMatches));
  const rows: TeamStats[] = teamStats(season, teamsOf(season)).sort(
    (a, b) => b.points - a.points || b.goalsFor - b.goalsAgainst - (a.goalsFor - a.goalsAgainst) || b.goalsFor - a.goalsFor,
  );
  const rounds = completedRounds(matches);

  if (!s.matches) {
    return <p className="muted">이번 시즌은 아직 끝난 경기가 없습니다. 첫 경기가 끝나면 통계가 채워집니다.</p>;
  }

  return (
    <section className="review">
      <div className="prose review-lead">
        <h2>{info.name} 이번 시즌 한눈에 보기</h2>
        {leagueParagraphs(info.name, s, avg, rows).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="stats">
        <Stat label="경기" value={String(s.matches)} />
        <Stat label="경기당 골" value={fixed(s.goalsPerGame)} sub={`5대 리그 ${fixed(avg.goalsPerGame)}`} />
        <Stat label="홈 승률" value={`${pct(s.homeWins, s.matches)}%`} />
        <Stat label="무승부" value={`${pct(s.draws, s.matches)}%`} />
        <Stat label="2.5골 오버" value={`${pct(s.over25, s.matches)}%`} />
        <Stat label="양팀 득점" value={`${pct(s.btts, s.matches)}%`} />
        <Stat label="0-0" value={String(s.goalless)} sub={`${pct(s.goalless, s.matches)}%`} />
      </div>

      <div className="block">
        <h3 className="block-title">팀별 공격 · 수비</h3>
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr>
                <th scope="col" className="left">팀</th>
                <th scope="col">경기</th>
                <th scope="col">경기당 득점</th>
                <th scope="col">경기당 실점</th>
                <th scope="col">무실점</th>
                <th scope="col">무득점</th>
                <th scope="col">2.5골 오버</th>
                <th scope="col">양팀 득점</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.team.id}>
                  <td className="left">
                    <TeamLabel team={r.team} league={code} short />
                  </td>
                  <td>{r.played}</td>
                  <td>{perGame(r.goalsFor, r.played)}</td>
                  <td>{perGame(r.goalsAgainst, r.played)}</td>
                  <td>{r.cleanSheets}</td>
                  <td>{r.failedToScore}</td>
                  <td>{pct(r.over25, r.played)}%</td>
                  <td>{pct(r.btts, r.played)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="cols">
        <div className="block">
          <h3 className="block-title">홈 · 원정 경기당 승점</h3>
          <div className="table-wrap">
            <table className="standings">
              <thead>
                <tr>
                  <th scope="col" className="left">팀</th>
                  <th scope="col">홈</th>
                  <th scope="col">원정</th>
                  <th scope="col">차이</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const home = r.homePlayed ? r.homePoints / r.homePlayed : NaN;
                  const away = r.awayPlayed ? r.awayPoints / r.awayPlayed : NaN;
                  const diff = home - away;
                  return (
                    <tr key={r.team.id}>
                      <td className="left">
                        <TeamLabel team={r.team} league={code} short />
                      </td>
                      <td>{fixed(home)}</td>
                      <td>{fixed(away)}</td>
                      <td className={diff >= 1 ? "down" : diff <= -0.5 ? "up" : undefined}>
                        {Number.isFinite(diff) ? (diff > 0 ? `+${fixed(diff)}` : fixed(diff)) : "-"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <p className="muted note">차이가 +1.00 이상이면 홈 의존도가 큰 팀, 마이너스면 원정에서 더 강한 팀입니다.</p>
        </div>

        <div className="block">
          <h3 className="block-title">전반 · 후반 득실점과 역전</h3>
          <div className="table-wrap">
            <table className="standings">
              <thead>
                <tr>
                  <th scope="col" className="left">팀</th>
                  <th scope="col">전반 득/실</th>
                  <th scope="col">후반 득/실</th>
                  <th scope="col">역전 승점</th>
                  <th scope="col">놓친 승점</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.team.id}>
                    <td className="left">
                      <TeamLabel team={r.team} league={code} short />
                    </td>
                    <td>
                      {r.firstHalfFor}/{r.firstHalfAgainst}
                    </td>
                    <td>
                      {r.secondHalfFor}/{r.secondHalfAgainst}
                    </td>
                    <td>{r.pointsFromBehind}</td>
                    <td>{r.pointsDroppedFromLead}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="muted note">
            역전 승점은 전반을 뒤진 채 마친 경기에서 얻은 승점, 놓친 승점은 전반을 앞선 경기에서 잃은 승점입니다.
          </p>
        </div>
      </div>

      <div className="cols">
        <div className="block">
          <h3 className="block-title">자주 나온 스코어</h3>
          <ul className="facts">
            {s.scorelines.map((l) => (
              <li key={l.label}>
                <span>{l.label === "0-0" || l.label.split("-")[0] === l.label.split("-")[1] ? `${l.label} 무승부` : l.label}</span>
                <b>
                  {l.count}경기 ({pct(l.count, s.matches)}%)
                </b>
              </li>
            ))}
          </ul>
        </div>
        <div className="block">
          <h3 className="block-title">기억할 경기</h3>
          <ul className="facts">
            {s.biggestWins.map((m) => (
              <li key={`b${m.id}`}>
                <span>최다 점수 차</span>
                <b>{scoreText(m)}</b>
              </li>
            ))}
            {s.highestScoring.map((m) => (
              <li key={`h${m.id}`}>
                <span>최다 득점</span>
                <b>{scoreText(m)}</b>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {rounds.length ? (
        <div className="block">
          <h3 className="block-title">라운드 리뷰</h3>
          <nav className="round-links">
            {[...rounds].reverse().map((d) => (
              <a key={d} href={`/${code}/round/${d}`}>
                {d}라운드
              </a>
            ))}
          </nav>
        </div>
      ) : null}

      <div className="prose review-lead">
        <h2>이 통계를 읽는 법</h2>
        <p>
          시즌 초반의 비율 지표는 표본이 작아 크게 흔들립니다. 무실점 경기 2번이 5경기 중 40%로 보이는 식입니다. 그래서
          토리코리는 비율과 함께 실제 경기 수를 나란히 보여줍니다. 10라운드 전후부터는 팀의 색깔이 비교적 안정적으로
          드러나기 시작합니다.
        </p>
        <p>
          전반·후반 득실점은 경기 운영 방식을 읽는 데 유용합니다. 후반 득점이 유독 많은 팀은 교체 자원이 두텁거나 체력을
          앞세운 압박이 강한 팀인 경우가 많고, 전반을 앞서고도 승점을 자주 놓치는 팀은 수비 집중력이나 교체 운영에 과제가
          있다고 볼 수 있습니다. 다만 모든 수치는 지난 경기를 정리한 기록일 뿐, 다음 경기 결과를 예측하지는 않습니다.
        </p>
        <p>
          다른 리그와의 비교는 <a href="/stats">5대 리그 통계 비교</a>에서, 지표의 정의는{" "}
          <a href="/articles/points-per-game">경기당 승점으로 팀 전력 읽는 법</a>에서 볼 수 있습니다.
        </p>
      </div>
    </section>
  );
}
