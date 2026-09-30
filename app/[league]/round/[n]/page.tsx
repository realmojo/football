import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { Stat } from "@/components/Stat";
import { TeamLabel } from "@/components/TeamLabel";
import { getSeasonMatches } from "@/lib/data";
import { completedRounds, fixed, leagueStageMatches, pct, reviewRound, summarize, teamsOf, type Streak } from "@/lib/insights";
import { findLeague, isCup, zoneFor } from "@/lib/leagues";
import { roundDescription, roundParagraphs, roundTakeaways } from "@/lib/narrative";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ league: string; n: string }>;

async function load(params: Params) {
  const { league, n } = await params;
  const info = findLeague(league);
  const matchday = Number(n);
  if (!info || isCup(info) || !Number.isInteger(matchday) || matchday < 1) return null;
  const matches = await getSeasonMatches(info.code);
  if (!completedRounds(matches).includes(matchday)) return { info, matchday, matches, review: null };
  const season = leagueStageMatches(matches);
  return { info, matchday, matches, review: reviewRound(matches, teamsOf(season), matchday) };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params).catch(() => null);
  if (!data?.review) return { robots: { index: false } };
  const { info, matchday, review } = data;
  return {
    title: `${info.name} ${matchday}라운드 리뷰 · 결과와 순위 변동`,
    description: roundDescription(info.name, review),
    alternates: { canonical: `/${info.code}/round/${matchday}` },
  };
}

const STREAK_LABEL: Record<Streak["kind"], string> = {
  win: "연승",
  unbeaten: "경기 무패",
  loss: "연패",
  winless: "경기 무승",
};

export default async function RoundPage({ params }: { params: Params }) {
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(params);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!data) notFound();
  const { info, matchday, matches } = data;
  const code = info.code;

  if (!data.review) {
    return (
      <section className="prose">
        <p>
          {matchday}라운드는 아직 모든 경기가 끝나지 않았습니다. 라운드가 끝나면 리뷰가 자동으로 만들어집니다. 지금까지의
          결과는 <a href={`/${code}/matches?matchday=${matchday}`}>일정 · 결과</a>에서 볼 수 있습니다.
        </p>
      </section>
    );
  }

  const review = data.review;
  const s = review.summary;
  const season = summarize(leagueStageMatches(matches));
  const rounds = completedRounds(matches);
  const idx = rounds.indexOf(matchday);
  const prev = idx > 0 ? rounds[idx - 1] : null;
  const next = idx < rounds.length - 1 ? rounds[idx + 1] : null;

  return (
    <section className="review">
      <div className="round-nav">
        {prev != null ? <a href={`/${code}/round/${prev}`}>← {prev}라운드 리뷰</a> : <span />}
        <strong>
          {matchday}
          <small>라운드 리뷰</small>
        </strong>
        {next != null ? <a href={`/${code}/round/${next}`}>{next}라운드 리뷰 →</a> : <span />}
      </div>

      <div className="prose review-lead">
        <h2>
          {info.name} {matchday}라운드 정리
        </h2>
        {roundParagraphs(info.name, review, season).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="stats">
        <Stat label="경기" value={String(s.matches)} />
        <Stat label="총 득점" value={String(s.goals)} />
        <Stat label="경기당 골" value={fixed(s.goalsPerGame)} sub={`시즌 ${fixed(season.goalsPerGame)}`} />
        <Stat label="홈 승" value={String(s.homeWins)} sub={`${pct(s.homeWins, s.matches)}%`} />
        <Stat label="무승부" value={String(s.draws)} sub={`${pct(s.draws, s.matches)}%`} />
        <Stat label="원정 승" value={String(s.awayWins)} sub={`${pct(s.awayWins, s.matches)}%`} />
        <Stat label="역전승" value={String(review.comebacks.length)} />
      </div>

      <div className="cols">
        <div className="block">
          <h3 className="block-title">경기 결과</h3>
          {review.matches.map((m) => (
            <MatchRow key={m.id} match={m} league={code} showDate />
          ))}
        </div>

        <div>
          <div className="block">
            <h3 className="block-title">주요 장면</h3>
            <ul className="facts">
              {s.biggestWins[0] ? <Fact label="최다 점수 차" match={s.biggestWins[0]} /> : null}
              {s.highestScoring[0] ? <Fact label="최다 득점 경기" match={s.highestScoring[0]} /> : null}
              {review.upsets.map((u) => (
                <Fact key={u.match.id} label={`이변 (${u.winnerPos}위가 ${u.loserPos}위를 꺾음)`} match={u.match} />
              ))}
              {review.comebacks.map((c) => (
                <Fact
                  key={c.match.id}
                  label={`역전승 (전반 ${c.match.score.halfTime.home}-${c.match.score.halfTime.away})`}
                  match={c.match}
                />
              ))}
            </ul>
          </div>

          {review.streaks.length ? (
            <div className="block">
              <h3 className="block-title">이어지는 기록</h3>
              <ul className="facts">
                {review.streaks.map((t) => (
                  <li key={`${t.team.id}-${t.kind}`}>
                    <TeamLabel team={t.team} league={code} short />
                    <b className={t.kind === "win" || t.kind === "unbeaten" ? "up" : "down"}>
                      {t.length}
                      {STREAK_LABEL[t.kind]}
                    </b>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      <div className="block">
        <h3 className="block-title">{matchday}라운드 후 순위</h3>
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr>
                <th className="pos">#</th>
                <th>변동</th>
                <th className="left">팀</th>
                <th>경기</th>
                <th>승</th>
                <th>무</th>
                <th>패</th>
                <th>득실</th>
                <th className="pts">승점</th>
              </tr>
            </thead>
            <tbody>
              {review.table.map(({ row, before, change }) => {
                const zone = zoneFor(code, row.position);
                return (
                  <tr key={row.team.id} className={zone ? `z-${zone}` : undefined}>
                    <td className="pos">{row.position}</td>
                    <td className={change > 0 ? "up" : change < 0 ? "down" : "muted"}>
                      {before == null ? "-" : change > 0 ? `▲${change}` : change < 0 ? `▼${-change}` : "-"}
                    </td>
                    <td className="left">
                      <TeamLabel team={row.team} league={code} short />
                    </td>
                    <td>{row.playedGames}</td>
                    <td>{row.won}</td>
                    <td>{row.draw}</td>
                    <td>{row.lost}</td>
                    <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                    <td className="pts">{row.points}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted note">
          라운드 기준으로 경기 결과를 모아 승점, 골득실, 다득점 순으로 계산한 순위입니다. 연기된 경기가 있거나 맞대결을 먼저
          따지는 리그에서는 공식 순위와 조금 다를 수 있습니다.
        </p>
      </div>

      <div className="prose review-lead">
        <h2>토리코리의 시선</h2>
        {roundTakeaways(review, season).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
        <p>
          팀별 흐름은 순위표에서 팀 이름을 눌러 팀 분석 화면에서, 시즌 전체 흐름은{" "}
          <a href={`/${code}/stats`}>{info.name} 시즌 통계</a>에서 이어서 볼 수 있습니다.
        </p>
      </div>
    </section>
  );
}

function Fact({ label, match }: { label: string; match: Match }) {
  const { home, away } = match.score.fullTime;
  return (
    <li>
      <span>{label}</span>
      <b>
        {match.homeTeam.shortName} {home}-{away} {match.awayTeam.shortName}
      </b>
    </li>
  );
}
