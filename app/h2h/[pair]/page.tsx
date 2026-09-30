import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { Stat } from "@/components/Stat";
import { analyzeTeam, isUpcoming, perGame, points } from "@/lib/analysis";
import { getAllSeasonMatches, getH2h, getTeamsByIds, h2hSlug, type H2hMeeting, type H2hRecord } from "@/lib/data";
import { formatFullDate } from "@/lib/format";
import { homeCompetition } from "@/lib/korean";
import { findLeague } from "@/lib/leagues";
import { josa } from "@/lib/josa";
import type { Team } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ pair: string }>;

function parse(pair: string) {
  const m = /^(\d+)-(\d+)$/.exec(pair);
  if (!m) return null;
  const a = Number(m[1]);
  const b = Number(m[2]);
  return a < b ? { a, b } : null;
}

interface Tally {
  played: number;
  aWins: number;
  draws: number;
  bWins: number;
  aGoals: number;
  bGoals: number;
}

function tally(meetings: H2hMeeting[], a: number): Tally {
  const t: Tally = { played: 0, aWins: 0, draws: 0, bWins: 0, aGoals: 0, bGoals: 0 };
  for (const m of meetings) {
    if (m.home == null || m.away == null) continue;
    const aHome = m.homeTeamId === a;
    const ag = aHome ? m.home : m.away;
    const bg = aHome ? m.away : m.home;
    t.played++;
    t.aGoals += ag;
    t.bGoals += bg;
    if (ag > bg) t.aWins++;
    else if (ag < bg) t.bWins++;
    else t.draws++;
  }
  return t;
}

async function load(params: Params) {
  const ids = parse((await params).pair);
  if (!ids) return null;
  const [h2h, teams, matches] = await Promise.all([
    getH2h(ids.a, ids.b),
    getTeamsByIds([ids.a, ids.b]),
    getAllSeasonMatches(),
  ]);
  const A = teams.get(ids.a);
  const B = teams.get(ids.b);
  if (!h2h || !A || !B) return null;
  return { ids, h2h, A, B, matches };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params).catch(() => null);
  if (!data) return {};
  const { A, B, h2h, ids } = data;
  const t = tally(h2h.meetings, ids.a);
  return {
    title: `${A.name} vs ${B.name} 역대 전적 · 맞대결 기록`,
    description: `${josa(A.name, "와/과")} ${B.name}의 최근 맞대결 ${t.played}경기 전적(${A.shortName} ${t.aWins}승, 무 ${t.draws}, ${B.shortName} ${t.bWins}승)과 경기 결과, 이번 시즌 두 팀의 성적 비교, 다음 맞대결 일정을 정리했습니다.`,
    alternates: { canonical: `/h2h/${h2hSlug(ids.a, ids.b)}` },
  };
}

function paragraphs(A: Team, B: Team, t: Tally, h2h: H2hRecord): string[] {
  const out: string[] = [];
  if (!t.played) return [`${josa(A.name, "와/과")} ${B.name}의 최근 맞대결 기록이 없습니다.`];
  const recent = h2h.meetings.filter((m) => m.home != null).slice(0, 3);
  out.push(
    `최근 맞대결 ${t.played}경기 전적은 ${A.shortName} ${t.aWins}승, 무승부 ${t.draws}, ${B.shortName} ${t.bWins}승입니다. ` +
      `두 팀은 경기당 평균 ${((t.aGoals + t.bGoals) / t.played).toFixed(1)}골을 주고받았습니다.`,
  );
  const lead = t.aWins - t.bWins;
  out.push(
    lead >= 3
      ? `상대 전적에서는 ${A.shortName} 쪽이 뚜렷하게 앞서 있습니다. 다만 맞대결 기록은 감독과 선수단이 바뀌면 의미가 약해지므로, 이번 시즌 두 팀의 흐름을 함께 보는 것이 좋습니다.`
      : lead <= -3
        ? `상대 전적에서는 ${B.shortName} 쪽이 뚜렷하게 앞서 있습니다. 다만 맞대결 기록은 감독과 선수단이 바뀌면 의미가 약해지므로, 이번 시즌 두 팀의 흐름을 함께 보는 것이 좋습니다.`
        : `상대 전적은 팽팽한 편입니다. 이런 경우에는 과거 기록보다 이번 시즌의 경기당 승점과 최근 5경기 흐름이 결과를 가늠하는 데 더 유용합니다.`,
  );
  if (recent.length) {
    out.push(
      `가장 최근 맞대결은 ${formatFullDate(recent[0].utcDate)} 경기였고, ` +
        `결과는 ${recent[0].homeName} ${recent[0].home}-${recent[0].away} ${recent[0].awayName}입니다.`,
    );
  }
  return out;
}

export default async function H2hPage({ params }: { params: Params }) {
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(params);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!data) notFound();
  const { ids, h2h, A, B, matches } = data;
  const t = tally(h2h.meetings, ids.a);

  const next = matches
    .filter(
      (m) =>
        isUpcoming(m) &&
        ((m.homeTeam.id === ids.a && m.awayTeam.id === ids.b) || (m.homeTeam.id === ids.b && m.awayTeam.id === ids.a)),
    )
    .sort((x, y) => x.utcDate.localeCompare(y.utcDate))[0];
  const comp = next?.competition ?? homeCompetition(ids.a, matches) ?? null;
  const compMatches = comp ? matches.filter((m) => m.competition === comp) : [];
  const aa = analyzeTeam(compMatches, ids.a);
  const ba = analyzeTeam(compMatches, ids.b);
  const aCode = homeCompetition(ids.a, matches);
  const bCode = homeCompetition(ids.b, matches);

  return (
    <article className="review">
      <div className="h2h-head">
        <a href={aCode ? `/${aCode}/team/${A.id}` : "#"} className="h2h-team">
          <Crest src={A.crest} tla={A.tla} size={56} />
          <strong>{A.name}</strong>
        </a>
        <span className="h2h-vs">VS</span>
        <a href={bCode ? `/${bCode}/team/${B.id}` : "#"} className="h2h-team">
          <Crest src={B.crest} tla={B.tla} size={56} />
          <strong>{B.name}</strong>
        </a>
      </div>

      <div className="prose review-lead">
        <h1 className="sr-title">
          {A.name} vs {B.name} 역대 전적
        </h1>
        {paragraphs(A, B, t, h2h).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <div className="stats">
        <Stat label="맞대결" value={`${t.played}경기`} />
        <Stat label={`${A.shortName} 승`} value={String(t.aWins)} />
        <Stat label="무승부" value={String(t.draws)} />
        <Stat label={`${B.shortName} 승`} value={String(t.bWins)} />
        <Stat label={`${A.shortName} 득점`} value={String(t.aGoals)} />
        <Stat label={`${B.shortName} 득점`} value={String(t.bGoals)} />
        <Stat label="경기당 골" value={t.played ? ((t.aGoals + t.bGoals) / t.played).toFixed(1) : "-"} />
      </div>

      <div className="cols">
        <div>
          {next ? (
            <div className="block">
              <h3 className="block-title">다음 맞대결 (한국시간)</h3>
              <div className="tagged">
                <span className="tag">{findLeague(next.competition!)?.name}</span>
                <MatchRow match={next} league={next.competition!} showDate />
              </div>
            </div>
          ) : null}
          <div className="block">
            <h3 className="block-title">최근 맞대결 결과</h3>
            <ul className="facts">
              {h2h.meetings.map((m) => (
                <li key={m.id}>
                  <span>
                    {formatFullDate(m.utcDate)} · {m.competition ? (findLeague(m.competition)?.name ?? m.competition) : ""}
                  </span>
                  <b>
                    {m.homeTeamId === A.id ? A.shortName : m.homeTeamId === B.id ? B.shortName : m.homeName} {m.home ?? "-"}-
                    {m.away ?? "-"} {m.awayTeamId === A.id ? A.shortName : m.awayTeamId === B.id ? B.shortName : m.awayName}
                  </b>
                </li>
              ))}
            </ul>
            <p className="muted note">
              football-data.org 무료 데이터에 포함된 대회의 최근 맞대결만 집계합니다. 컵대회나 오래된 경기는 빠져 있을 수
              있습니다.
            </p>
          </div>
        </div>

        {comp ? (
          <div className="block">
            <h3 className="block-title">이번 시즌 {findLeague(comp)?.name} 성적 비교</h3>
            <table className="standings compare">
              <tbody>
                <CompareRow label="경기당 승점" a={perGame(points(aa.overall), aa.overall.played)} b={perGame(points(ba.overall), ba.overall.played)} />
                <CompareRow label="경기당 득점" a={perGame(aa.overall.goalsFor, aa.overall.played)} b={perGame(ba.overall.goalsFor, ba.overall.played)} />
                <CompareRow label="경기당 실점" a={perGame(aa.overall.goalsAgainst, aa.overall.played)} b={perGame(ba.overall.goalsAgainst, ba.overall.played)} />
                <CompareRow label="무실점" a={String(aa.cleanSheets)} b={String(ba.cleanSheets)} />
                <CompareRow
                  label="최근 5경기"
                  a={`${aa.lastFiveRecord.won}승 ${aa.lastFiveRecord.draw}무 ${aa.lastFiveRecord.lost}패`}
                  b={`${ba.lastFiveRecord.won}승 ${ba.lastFiveRecord.draw}무 ${ba.lastFiveRecord.lost}패`}
                />
              </tbody>
            </table>
            <p className="muted note">
              표의 왼쪽이 {A.shortName}, 오른쪽이 {B.shortName} 기록입니다. 지표 설명은 <a href="/guide">이용 가이드</a>에 있습니다.
            </p>
          </div>
        ) : null}
      </div>
    </article>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td>{a}</td>
      <td>{label}</td>
      <td>{b}</td>
    </tr>
  );
}

