import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { Crest } from "@/components/Crest";
import { FormBadge } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { analyzeTeam, headToHead, perGame, points, type Record } from "@/lib/analysis";
import { getSeasonMatches, getStandings } from "@/lib/data";
import { findLeague } from "@/lib/leagues";
import type { Match, TableRow } from "@/lib/types";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ league: string; teamId: string }>;
}): Promise<Metadata> {
  const { league, teamId } = await params;
  const info = findLeague(league);
  if (!info) return {};
  const id = Number(teamId);
  const matches = await getSeasonMatches(info.code).catch(() => []);
  const m = matches.find((x) => x.homeTeam.id === id || x.awayTeam.id === id);
  if (!m) return {};
  const team = m.homeTeam.id === id ? m.homeTeam : m.awayTeam;
  return {
    title: `${team.name} 분석 - ${info.name}`,
    description: `${team.name}의 이번 시즌 성적, 최근 5경기 폼, 홈·원정 기록, 다음 경기 프리뷰.`,
    alternates: { canonical: `/${info.code}/team/${id}` },
  };
}

export default async function TeamPage({ params }: { params: Promise<{ league: string; teamId: string }> }) {
  const { league, teamId } = await params;
  const code = findLeague(league)!.code;
  const id = Number(teamId);

  let matches: Match[];
  let rows: TableRow[] = [];
  try {
    const [m, s] = await Promise.all([getSeasonMatches(code), getStandings(code).catch(() => null)]);
    matches = m;
    rows = s?.standings.find((st) => st.type === "TOTAL" && st.table.some((r) => r.team.id === id))?.table ?? [];
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const sample = matches.find((m) => m.homeTeam.id === id || m.awayTeam.id === id);
  if (!sample) notFound();
  const team = sample.homeTeam.id === id ? sample.homeTeam : sample.awayTeam;
  const row = rows.find((r) => r.team.id === id);

  const a = analyzeTeam(matches, id);
  const played = a.overall.played;
  const pct = (n: number) => (played ? `${Math.round((n / played) * 100)}%` : "-");

  const nextMatch = a.upcoming[0];
  const opponent = nextMatch ? (nextMatch.homeTeam.id === id ? nextMatch.awayTeam : nextMatch.homeTeam) : null;
  const h2h = opponent ? headToHead(matches, id, opponent.id) : [];
  const opponentAnalysis = opponent ? analyzeTeam(matches, opponent.id) : null;

  return (
    <div className="team-page">
      <div className="team-head">
        <Crest src={team.crest} tla={team.tla} size={56} />
        <div>
          <h2>{team.name}</h2>
          {row ? (
            <p className="muted">
              {row.position}위 · 승점 {row.points} · {row.won}승 {row.draw}무 {row.lost}패
            </p>
          ) : null}
        </div>
      </div>

      <div className="stats">
        <Stat label="경기당 득점" value={perGame(a.overall.goalsFor, played)} />
        <Stat label="경기당 실점" value={perGame(a.overall.goalsAgainst, played)} />
        <Stat label="경기당 승점" value={perGame(points(a.overall), played)} />
        <Stat label="무실점 경기" value={`${a.cleanSheets} (${pct(a.cleanSheets)})`} />
        <Stat label="무득점 경기" value={`${a.failedToScore} (${pct(a.failedToScore)})`} />
        <Stat label="2.5골 오버" value={`${a.over25} (${pct(a.over25)})`} />
        <Stat label="양팀 득점" value={`${a.bttsCount} (${pct(a.bttsCount)})`} />
      </div>

      <div className="grid-2">
        <div className="card">
          <h3>홈 / 원정 성적</h3>
          <table className="standings">
            <thead>
              <tr>
                <th className="left">구분</th>
                <th>경기</th>
                <th>승</th>
                <th>무</th>
                <th>패</th>
                <th>득</th>
                <th>실</th>
                <th>승점</th>
              </tr>
            </thead>
            <tbody>
              <RecordRow label="전체" r={a.overall} />
              <RecordRow label="홈" r={a.home} />
              <RecordRow label="원정" r={a.away} />
              <RecordRow label="최근 5경기" r={a.lastFiveRecord} />
            </tbody>
          </table>
        </div>

        <div className="card">
          <h3>최근 5경기</h3>
          <div className="form big">
            {a.lastFive.map(({ match, result }) => (
              <FormBadge key={match.id} result={result} />
            ))}
          </div>
          {a.lastFive.map(({ match }) => (
            <MatchRow key={match.id} match={match} league={code} showDate />
          ))}
        </div>
      </div>

      {nextMatch && opponent && opponentAnalysis ? (
        <div className="card">
          <h3>다음 경기 프리뷰</h3>
          <MatchRow match={nextMatch} league={code} showDate />
          <table className="standings compare">
            <thead>
              <tr>
                <th>{team.shortName}</th>
                <th />
                <th>{opponent.shortName}</th>
              </tr>
            </thead>
            <tbody>
              <CompareRow label="승점/경기" a={perGame(points(a.overall), played)} b={perGame(points(opponentAnalysis.overall), opponentAnalysis.overall.played)} />
              <CompareRow label="득점/경기" a={perGame(a.overall.goalsFor, played)} b={perGame(opponentAnalysis.overall.goalsFor, opponentAnalysis.overall.played)} />
              <CompareRow label="실점/경기" a={perGame(a.overall.goalsAgainst, played)} b={perGame(opponentAnalysis.overall.goalsAgainst, opponentAnalysis.overall.played)} />
              <CompareRow
                label="최근 5경기"
                a={`${a.lastFiveRecord.won}승 ${a.lastFiveRecord.draw}무 ${a.lastFiveRecord.lost}패`}
                b={`${opponentAnalysis.lastFiveRecord.won}승 ${opponentAnalysis.lastFiveRecord.draw}무 ${opponentAnalysis.lastFiveRecord.lost}패`}
              />
            </tbody>
          </table>
          <h4>이번 시즌 맞대결</h4>
          {h2h.length ? (
            h2h.map((m) => <MatchRow key={m.id} match={m} league={code} showDate />)
          ) : (
            <p className="muted">이번 시즌 맞대결 기록이 없습니다.</p>
          )}
        </div>
      ) : null}

      {a.upcoming.length > 1 ? (
        <div className="card">
          <h3>이후 일정</h3>
          {a.upcoming.slice(1).map((m) => (
            <MatchRow key={m.id} match={m} league={code} showDate />
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="stat">
      <span className="muted small">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function RecordRow({ label, r }: { label: string; r: Record }) {
  return (
    <tr>
      <td className="left">{label}</td>
      <td>{r.played}</td>
      <td>{r.won}</td>
      <td>{r.draw}</td>
      <td>{r.lost}</td>
      <td>{r.goalsFor}</td>
      <td>{r.goalsAgainst}</td>
      <td>
        <strong>{points(r)}</strong>
      </td>
    </tr>
  );
}

function CompareRow({ label, a, b }: { label: string; a: string; b: string }) {
  return (
    <tr>
      <td>{a}</td>
      <td className="muted">{label}</td>
      <td>{b}</td>
    </tr>
  );
}
