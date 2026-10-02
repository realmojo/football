import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { FormBadge } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { analyzeTeam, isFinished, isLive, perGame, points } from "@/lib/analysis";
import { getAllSeasonMatches, getH2h, getKoreanPlayers, getStandings, h2hSlug } from "@/lib/data";
import { formatFullDate, formatKstDay, formatTime } from "@/lib/format";
import { koreansByTeam } from "@/lib/korean";
import { findLeague } from "@/lib/leagues";
import { kstYmd, matchTitle, positionsFor, previewParagraphs, reviewParagraphs, roundLabel } from "@/lib/match";
import { SITE_URL } from "@/lib/site";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

// 2주 넘게 남은 경기는 아직 쓸 내용이 적어 검색에 내보내지 않는다.
const INDEX_AHEAD_MS = 14 * 24 * 3600 * 1000;

async function load(params: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return null;
  const all = await getAllSeasonMatches();
  const match = all.find((m) => m.id === id);
  if (!match) return null;
  return { match, all };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params).catch(() => null);
  if (!data) return {};
  const m = data.match;
  const league = findLeague(m.competition ?? "")?.name ?? "";
  const done = isFinished(m);
  const far = !done && new Date(m.utcDate).getTime() - Date.now() > INDEX_AHEAD_MS;
  return {
    title: matchTitle(m),
    description: done
      ? `${league} ${roundLabel(m)} ${m.homeTeam.name} ${m.score.fullTime.home}-${m.score.fullTime.away} ${m.awayTeam.name} 경기 결과와 전·후반 흐름, 경기 뒤 순위, 두 팀의 이번 시즌 기록을 정리했습니다.`
      : `${league} ${roundLabel(m)} ${m.homeTeam.name} vs ${m.awayTeam.name} 경기는 ${formatKstDay(kstYmd(m.utcDate))} ${formatTime(m.utcDate)}(한국시간)에 열립니다. 두 팀의 순위와 최근 5경기, 홈·원정 성적, 역대 맞대결을 비교한 프리뷰입니다.`,
    alternates: { canonical: `/match/${m.id}` },
    robots: far ? { index: false } : undefined,
  };
}

export default async function MatchPage({ params }: { params: Params }) {
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(params);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!data) notFound();
  const { match: m, all } = data;
  const code = m.competition!;
  const info = findLeague(code);
  const competitionMatches = all.filter((x) => x.competition === code);

  const [standings, h2h, koreanList] = await Promise.all([
    getStandings(code).catch(() => null),
    getH2h(m.homeTeam.id, m.awayTeam.id).catch(() => null),
    getKoreanPlayers().catch(() => []),
  ]);
  const ctx = {
    match: m,
    competitionMatches,
    positions: positionsFor(standings, competitionMatches),
    h2h,
    koreans: koreansByTeam(koreanList),
  };
  const done = isFinished(m);
  const live = isLive(m);
  const paragraphs = done || live ? reviewParagraphs(ctx) : previewParagraphs(ctx);
  const ha = analyzeTeam(competitionMatches, m.homeTeam.id);
  const aa = analyzeTeam(competitionMatches, m.awayTeam.id);
  const sameRound = competitionMatches
    .filter((x) => x.id !== m.id && x.stage === m.stage && x.matchday === m.matchday && (m.group ? x.group === m.group : true))
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const meetings = (h2h?.meetings ?? []).slice(0, 6);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsEvent",
    name: `${m.homeTeam.name} vs ${m.awayTeam.name}`,
    sport: "Soccer",
    startDate: m.utcDate,
    eventStatus: m.status === "POSTPONED" ? "https://schema.org/EventPostponed" : "https://schema.org/EventScheduled",
    url: `${SITE_URL}/match/${m.id}`,
    homeTeam: { "@type": "SportsTeam", name: m.homeTeam.name, alternateName: m.homeTeam.englishName },
    awayTeam: { "@type": "SportsTeam", name: m.awayTeam.name, alternateName: m.awayTeam.englishName },
    superEvent: info ? { "@type": "SportsEvent", name: info.name } : undefined,
  };

  return (
    <article className="review">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs-bar">
        <a href={`/${code}`}>{info?.name}</a> ·{" "}
        {m.matchday && (m.stage === "REGULAR_SEASON" || m.stage === "LEAGUE_STAGE") ? (
          <a href={`/${code}/matches?matchday=${m.matchday}`}>{roundLabel(m)}</a>
        ) : (
          roundLabel(m)
        )}
      </p>

      <div className="h2h-head match-head">
        <a href={`/${code}/team/${m.homeTeam.id}`} className="h2h-team">
          <Crest src={m.homeTeam.crest} tla={m.homeTeam.tla} size={56} />
          <strong>{m.homeTeam.name}</strong>
          <span className="muted">홈</span>
        </a>
        <div className="match-center">
          {done || live ? (
            <strong className="match-score">
              {m.score.fullTime.home} - {m.score.fullTime.away}
            </strong>
          ) : (
            <strong className="match-score">{formatTime(m.utcDate)}</strong>
          )}
          <span>
            {formatFullDate(m.utcDate)} · {live ? "진행 중" : done ? "경기 종료" : "한국시간"}
          </span>
          {done && m.score.halfTime.home != null ? (
            <small>
              전반 {m.score.halfTime.home}-{m.score.halfTime.away}
            </small>
          ) : null}
        </div>
        <a href={`/${code}/team/${m.awayTeam.id}`} className="h2h-team">
          <Crest src={m.awayTeam.crest} tla={m.awayTeam.tla} size={56} />
          <strong>{m.awayTeam.name}</strong>
          <span className="muted">원정</span>
        </a>
      </div>

      <div className="prose review-lead">
        <h1 className="sr-title">
          {m.homeTeam.name} vs {m.awayTeam.name} {done ? "경기 결과" : "프리뷰"}
        </h1>
        {paragraphs.map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="cols">
        <div className="block">
          <h3 className="block-title">이번 시즌 {info?.name} 기록 비교</h3>
          <table className="standings compare">
            <thead>
              <tr>
                <th scope="col">{m.homeTeam.shortName}</th>
                <td />
                <th scope="col">{m.awayTeam.shortName}</th>
              </tr>
            </thead>
            <tbody>
              <Row label="순위" a={ctx.positions.get(m.homeTeam.id)?.position} b={ctx.positions.get(m.awayTeam.id)?.position} suffix="위" />
              <Row label="경기당 승점" a={perGame(points(ha.overall), ha.overall.played)} b={perGame(points(aa.overall), aa.overall.played)} />
              <Row label="경기당 득점" a={perGame(ha.overall.goalsFor, ha.overall.played)} b={perGame(aa.overall.goalsFor, aa.overall.played)} />
              <Row label="경기당 실점" a={perGame(ha.overall.goalsAgainst, ha.overall.played)} b={perGame(aa.overall.goalsAgainst, aa.overall.played)} />
              <Row label="홈 / 원정 승점" a={perGame(points(ha.home), ha.home.played)} b={perGame(points(aa.away), aa.away.played)} />
              <Row label="무실점" a={ha.cleanSheets} b={aa.cleanSheets} />
            </tbody>
          </table>
          <p className="muted note">홈 / 원정 승점은 {m.homeTeam.shortName}의 홈 경기, {m.awayTeam.shortName}의 원정 경기 기준입니다.</p>
        </div>

        <div className="block">
          <h3 className="block-title">최근 5경기</h3>
          <div className="form-compare">
            <div>
              <strong>{m.homeTeam.shortName}</strong>
              <div className="form">
                {ha.lastFive.map(({ match, result }) => (
                  <FormBadge key={match.id} result={result} />
                ))}
              </div>
            </div>
            <div>
              <strong>{m.awayTeam.shortName}</strong>
              <div className="form">
                {aa.lastFive.map(({ match, result }) => (
                  <FormBadge key={match.id} result={result} />
                ))}
              </div>
            </div>
          </div>
          {meetings.length ? (
            <>
              <h3 className="block-title">최근 맞대결</h3>
              <ul className="facts">
                {meetings.map((x) => (
                  <li key={x.id}>
                    <span>{formatFullDate(x.utcDate)}</span>
                    <b>
                      {x.homeTeamId === m.homeTeam.id ? m.homeTeam.shortName : x.homeTeamId === m.awayTeam.id ? m.awayTeam.shortName : x.homeName}{" "}
                      {x.home}-{x.away}{" "}
                      {x.awayTeamId === m.homeTeam.id ? m.homeTeam.shortName : x.awayTeamId === m.awayTeam.id ? m.awayTeam.shortName : x.awayName}
                    </b>
                  </li>
                ))}
              </ul>
              <a href={`/h2h/${h2hSlug(m.homeTeam.id, m.awayTeam.id)}`} className="h2h-link">
                역대 맞대결 전체 보기 →
              </a>
            </>
          ) : null}
        </div>
      </div>

      {sameRound.length ? (
        <div className="block">
          <h3 className="block-title">
            같은 {roundLabel(m)} 다른 경기
          </h3>
          {sameRound.map((x: Match) => (
            <MatchRow key={x.id} match={x} league={code} showDate />
          ))}
        </div>
      ) : null}
    </article>
  );
}

function Row({ label, a, b, suffix = "" }: { label: string; a: string | number | undefined; b: string | number | undefined; suffix?: string }) {
  return (
    <tr>
      <td>{a == null ? "-" : `${a}${suffix}`}</td>
      <td>{label}</td>
      <td>{b == null ? "-" : `${b}${suffix}`}</td>
    </tr>
  );
}
