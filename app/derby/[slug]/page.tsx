import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { analyzeTeam, isFinished, perGame, points } from "@/lib/analysis";
import { getAllSeasonMatches, getDerbies, getH2h, getStandings, getTeamsByIds, h2hSlug } from "@/lib/data";
import { formatFullDate, formatKickoff } from "@/lib/format";
import { findLeague } from "@/lib/leagues";
import { positionsFor } from "@/lib/match";
import { SITE_URL } from "@/lib/site";
import { nextMeeting } from "@/lib/derby";
import { josa } from "@/lib/josa";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function load(params: Params) {
  const { slug } = await params;
  const derbies = await getDerbies();
  const derby = derbies.find((d) => d.slug === slug);
  if (!derby) return null;
  const [teams, matches, h2h] = await Promise.all([
    getTeamsByIds([derby.teamA, derby.teamB]),
    getAllSeasonMatches(),
    getH2h(derby.teamA, derby.teamB).catch(() => null),
  ]);
  const A = teams.get(derby.teamA);
  const B = teams.get(derby.teamB);
  if (!A || !B) return null;
  return { derby, derbies, A, B, matches, h2h };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load(params).catch(() => null);
  if (!d) return {};
  const next = nextMeeting(d.derby, d.matches);
  return {
    title: `${d.derby.name}${d.derby.english ? `(${d.derby.english})` : ""} · ${d.A.name} vs ${d.B.name} 역대 전적과 일정`,
    description:
      `${josa(d.A.name, "와/과")} ${d.B.name}의 라이벌전 ${d.derby.name}의 역사와 역대 맞대결 기록,` +
      (next ? ` 다음 경기 일정(${formatKickoff(next.utcDate)} 한국시간),` : "") +
      ` 이번 시즌 두 팀의 성적 비교를 정리했습니다.`,
    alternates: { canonical: `/derby/${d.derby.slug}` },
  };
}

export default async function DerbyPage({ params }: { params: Params }) {
  let d: Awaited<ReturnType<typeof load>>;
  try {
    d = await load(params);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!d) notFound();
  const { derby, derbies, A, B, matches, h2h } = d;
  const code = derby.league;
  const league = findLeague(code);
  const compMatches = matches.filter((m) => m.competition === code);
  const standings = await getStandings(code).catch(() => null);
  const positions = positionsFor(standings, compMatches);
  const aa = analyzeTeam(compMatches, A.id);
  const ba = analyzeTeam(compMatches, B.id);
  const next = nextMeeting(derby, matches);
  const thisSeason = matches
    .filter(
      (m) =>
        isFinished(m) &&
        ((m.homeTeam.id === A.id && m.awayTeam.id === B.id) || (m.homeTeam.id === B.id && m.awayTeam.id === A.id)),
    )
    .sort((x, y) => y.utcDate.localeCompare(x.utcDate));

  let aw = 0;
  let dr = 0;
  let bw = 0;
  for (const m of h2h?.meetings ?? []) {
    if (m.home == null || m.away == null) continue;
    const ag = m.homeTeamId === A.id ? m.home : m.away;
    const bg = m.homeTeamId === A.id ? m.away : m.home;
    if (ag > bg) aw++;
    else if (ag < bg) bw++;
    else dr++;
  }
  const n = aw + dr + bw;
  const nameOf = (id: number, fallback: string) => (id === A.id ? A.shortName : id === B.id ? B.shortName : fallback);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${derby.name} · ${A.name} vs ${B.name}`,
    inLanguage: "ko",
    mainEntityOfPage: `${SITE_URL}/derby/${derby.slug}`,
    about: [
      { "@type": "SportsTeam", name: A.name },
      { "@type": "SportsTeam", name: B.name },
    ],
    publisher: { "@type": "Organization", name: "토리코리", url: SITE_URL },
  };

  return (
    <article className="review">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs-bar">
        <a href="/derby">더비·라이벌전</a> · {league?.name}
      </p>
      <div className="h2h-head">
        <a href={`/${code}/team/${A.id}`} className="h2h-team">
          <Crest src={A.crest} tla={A.tla} size={56} />
          <strong>{A.name}</strong>
        </a>
        <div className="match-center">
          <strong className="match-score derby-name">{derby.name}</strong>
          {derby.english ? <span>{derby.english}</span> : null}
          {n ? (
            <small>
              최근 {n}경기 {A.shortName} {aw}승 · 무 {dr} · {B.shortName} {bw}승
            </small>
          ) : null}
        </div>
        <a href={`/${code}/team/${B.id}`} className="h2h-team">
          <Crest src={B.crest} tla={B.tla} size={56} />
          <strong>{B.name}</strong>
        </a>
      </div>

      <div className="cols">
        <div className="prose team-intro">
          <h1 className="sr-title">
            {derby.name} · {A.name} vs {B.name}
          </h1>
          <div dangerouslySetInnerHTML={{ __html: derby.intro }} />
        </div>

        <div>
          <div className="block">
            <h3 className="block-title">다음 맞대결 (한국시간)</h3>
            {next ? (
              <>
                <MatchRow match={next} league={next.competition!} showDate />
                <a href={`/match/${next.id}`} className="h2h-link">
                  경기 프리뷰 보기 →
                </a>
              </>
            ) : (
              <p className="muted">이번 시즌 남은 맞대결 일정이 없습니다.</p>
            )}
          </div>
          {thisSeason.length ? (
            <div className="block">
              <h3 className="block-title">이번 시즌 맞대결</h3>
              {thisSeason.map((m) => (
                <MatchRow key={m.id} match={m} league={m.competition!} showDate />
              ))}
            </div>
          ) : null}
          <div className="block">
            <h3 className="block-title">최근 맞대결 기록</h3>
            {h2h?.meetings.length ? (
              <>
                <ul className="facts">
                  {h2h.meetings.map((m) => (
                    <li key={m.id}>
                      <span>{formatFullDate(m.utcDate)}</span>
                      <b>
                        {nameOf(m.homeTeamId, m.homeName)} {m.home}-{m.away} {nameOf(m.awayTeamId, m.awayName)}
                      </b>
                    </li>
                  ))}
                </ul>
                <a href={`/h2h/${h2hSlug(A.id, B.id)}`} className="h2h-link">
                  맞대결 분석 페이지 →
                </a>
              </>
            ) : (
              <p className="muted">맞대결 기록을 모으는 중입니다. 다음 맞대결이 가까워지면 자동으로 채워집니다.</p>
            )}
          </div>
        </div>
      </div>

      <div className="block">
        <h3 className="block-title">이번 시즌 {league?.name} 성적 비교</h3>
        <table className="standings compare">
          <thead>
            <tr>
              <th>{A.shortName}</th>
              <th />
              <th>{B.shortName}</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>{positions.get(A.id)?.position ?? "-"}위</td>
              <td>순위</td>
              <td>{positions.get(B.id)?.position ?? "-"}위</td>
            </tr>
            <tr>
              <td>{perGame(points(aa.overall), aa.overall.played)}</td>
              <td>경기당 승점</td>
              <td>{perGame(points(ba.overall), ba.overall.played)}</td>
            </tr>
            <tr>
              <td>{perGame(aa.overall.goalsFor, aa.overall.played)}</td>
              <td>경기당 득점</td>
              <td>{perGame(ba.overall.goalsFor, ba.overall.played)}</td>
            </tr>
            <tr>
              <td>{perGame(aa.overall.goalsAgainst, aa.overall.played)}</td>
              <td>경기당 실점</td>
              <td>{perGame(ba.overall.goalsAgainst, ba.overall.played)}</td>
            </tr>
            <tr>
              <td>
                {aa.lastFiveRecord.won}승 {aa.lastFiveRecord.draw}무 {aa.lastFiveRecord.lost}패
              </td>
              <td>최근 5경기</td>
              <td>
                {ba.lastFiveRecord.won}승 {ba.lastFiveRecord.draw}무 {ba.lastFiveRecord.lost}패
              </td>
            </tr>
          </tbody>
        </table>
      </div>

      <div className="block">
        <h3 className="block-title">다른 더비</h3>
        <nav className="round-links">
          {derbies
            .filter((x) => x.slug !== derby.slug)
            .map((x) => (
              <a key={x.slug} href={`/derby/${x.slug}`}>
                {x.name}
              </a>
            ))}
        </nav>
      </div>
    </article>
  );
}
