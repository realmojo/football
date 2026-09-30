import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { Crest } from "@/components/Crest";
import { FormBadge } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { Stat } from "@/components/Stat";
import { analyzeTeam, headToHead, perGame, points, type Record } from "@/lib/analysis";
import {
  getH2h,
  getScorers,
  getSeasonMatches,
  getStandings,
  getTeamIntro,
  getTeamProfile,
  h2hSlug,
  type TeamIntro,
} from "@/lib/data";
import { age, countryLabel, POSITION_GROUP_LABEL, positionGroup, positionLabel, type PositionGroup } from "@/lib/labels";
import { findLeague, groupLabel, isCup, stageLabel } from "@/lib/leagues";
import { teamFinish } from "@/lib/cup";
import type { Match, Player, Scorer, TableRow, TeamProfile } from "@/lib/types";

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
  const intro = await getTeamIntro(id).catch(() => null);
  return {
    title: `${team.name}${team.englishName && team.englishName !== team.name ? ` (${team.englishName})` : ""} 일정 · 결과 · 분석 - ${info.name}`,
    description: `${team.name}${intro?.nickname ? `(${intro.nickname})` : ""}의 구단 소개와 이번 시즌 성적, 최근 5경기 폼, 홈·원정 기록, 다음 경기 프리뷰.`,
    alternates: { canonical: `/${info.code}/team/${id}` },
  };
}

export default async function TeamPage({ params }: { params: Promise<{ league: string; teamId: string }> }) {
  const { league, teamId } = await params;
  const info = findLeague(league)!;
  const code = info.code;
  const cup = isCup(info);
  const id = Number(teamId);

  let matches: Match[];
  let rows: TableRow[] = [];
  let profile: TeamProfile | null = null;
  let teamScorers: Scorer[] = [];
  let intro: TeamIntro | null = null;
  try {
    const [m, s, p, sc, ti] = await Promise.all([
      getSeasonMatches(code),
      getStandings(code).catch(() => null),
      getTeamProfile(id).catch(() => null),
      getScorers(code).catch(() => []),
      getTeamIntro(id).catch(() => null),
    ]);
    matches = m;
    profile = p;
    intro = ti;
    teamScorers = sc.filter((x) => x.team?.id === id);
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
  const hasH2h = opponent ? !!(await getH2h(id, opponent.id).catch(() => null)) : false;

  return (
    <div className="team-page">
      <div className="team-head">
        <Crest src={team.crest} tla={team.tla} size={64} />
        <div>
          <h2>
            {team.name}
            {team.englishName && team.englishName !== team.name ? <small>{team.englishName}</small> : null}
          </h2>
          {row ? (
            <p className="team-record">
              <b>{row.position}위</b>
              <span>승점 {row.points}</span>
              <span>
                {row.won}승 {row.draw}무 {row.lost}패
              </span>
              <span>
                득실 {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
              </span>
            </p>
          ) : null}
          {cup ? (
            <p className="team-record">
              <b>{teamFinish(matches, id) ?? "-"}</b>
              <span>
                {a.overall.won}승 {a.overall.draw}무 {a.overall.lost}패
              </span>
              <span>
                {a.overall.goalsFor}득점 {a.overall.goalsAgainst}실점
              </span>
            </p>
          ) : null}
        </div>
      </div>

      <div className="stats">
        <Stat label="경기당 득점" value={perGame(a.overall.goalsFor, played)} />
        <Stat label="경기당 실점" value={perGame(a.overall.goalsAgainst, played)} />
        <Stat label="경기당 승점" value={perGame(points(a.overall), played)} />
        <Stat label="무실점" value={String(a.cleanSheets)} sub={pct(a.cleanSheets)} />
        <Stat label="무득점" value={String(a.failedToScore)} sub={pct(a.failedToScore)} />
        <Stat label="2.5골 오버" value={String(a.over25)} sub={pct(a.over25)} />
        <Stat label="양팀 득점" value={String(a.bttsCount)} sub={pct(a.bttsCount)} />
      </div>

      {intro ? (
        <section className="team-intro">
          <h3 className="block-title">
            구단 소개{intro.nickname ? ` · ${intro.nickname}` : ""}
          </h3>
          {intro.tags.length ? (
            <div className="team-tags">
              {intro.tags.map((t) => (
                <span key={t}>{t}</span>
              ))}
            </div>
          ) : null}
          <div dangerouslySetInnerHTML={{ __html: intro.intro }} />
        </section>
      ) : null}

      {cup ? (
        <div className="block">
          <h3 className="block-title">대회 경기 기록</h3>
          {matches
            .filter((m) => m.homeTeam.id === id || m.awayTeam.id === id)
            .sort((x, y) => x.utcDate.localeCompare(y.utcDate))
            .map((m) => (
              <div key={m.id} className="tagged">
                <span className="tag">{m.stage === "GROUP_STAGE" ? `조별리그 ${groupLabel(m.group)}` : stageLabel(m.stage)}</span>
                <MatchRow match={m} league={code} showDate />
              </div>
            ))}
        </div>
      ) : (
      <div className="cols">
        <div className="block">
          <h3 className="block-title">홈 / 원정 성적</h3>
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

        <div className="block">
          <h3 className="block-title">최근 5경기</h3>
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
      )}

      {nextMatch && opponent && opponentAnalysis ? (
        <div className="block">
          <h3 className="block-title">다음 경기 프리뷰</h3>
          <MatchRow match={nextMatch} league={code} showDate />
          {hasH2h ? (
            <a href={`/h2h/${h2hSlug(nextMatch.homeTeam.id, nextMatch.awayTeam.id)}`} className="h2h-link">
              {opponent?.shortName}전 역대 맞대결 보기 →
            </a>
          ) : null}
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
          <h4 className="sub-title">이번 시즌 맞대결</h4>
          {h2h.length ? (
            h2h.map((m) => <MatchRow key={m.id} match={m} league={code} showDate />)
          ) : (
            <p className="muted">이번 시즌 맞대결 기록이 없습니다.</p>
          )}
        </div>
      ) : null}

      {a.upcoming.length > 1 ? (
        <div className="block">
          <h3 className="block-title">이후 일정</h3>
          {a.upcoming.slice(1).map((m) => (
            <MatchRow key={m.id} match={m} league={code} showDate />
          ))}
        </div>
      ) : null}

      {profile || teamScorers.length ? (
        <div className="cols">
          {profile ? <TeamInfo profile={profile} /> : <div />}
          {teamScorers.length ? (
            <div className="block">
              <h3 className="block-title">이번 시즌 득점 (리그 득점 순위 기준)</h3>
              <table className="standings">
                <thead>
                  <tr>
                    <th className="left">선수</th>
                    <th>경기</th>
                    <th className="pts">득점</th>
                    <th>도움</th>
                  </tr>
                </thead>
                <tbody>
                  {teamScorers.map((sc) => (
                    <tr key={sc.playerId}>
                      <td className="left">{sc.name}</td>
                      <td>{sc.playedMatches ?? "-"}</td>
                      <td className="pts">{sc.goals}</td>
                      <td>{sc.assists ?? 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : null}
        </div>
      ) : null}

      {profile && profile.squad.length ? <Squad squad={profile.squad} /> : null}
    </div>
  );
}

function TeamInfo({ profile }: { profile: TeamProfile }) {
  const rows: Array<[string, React.ReactNode]> = [
    ["감독", profile.coachName ? `${profile.coachName} (${countryLabel(profile.coachNationality)})` : null],
    ["홈 경기장", profile.venue],
    ["창단", profile.founded ? `${profile.founded}년` : null],
    ["클럽 컬러", profile.clubColors],
    [
      "공식 홈페이지",
      profile.website ? (
        <a href={profile.website} target="_blank" rel="noopener noreferrer">
          {profile.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
        </a>
      ) : null,
    ],
  ];
  const shown = rows.filter(([, v]) => v);
  if (!shown.length) return <div />;
  return (
    <div className="block">
      <h3 className="block-title">팀 정보</h3>
      <dl className="info-list">
        {shown.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

const GROUP_ORDER: PositionGroup[] = ["GK", "DF", "MF", "FW"];

function Squad({ squad }: { squad: Player[] }) {
  const groups = new Map<PositionGroup | "ETC", Player[]>();
  for (const p of squad) {
    const g = positionGroup(p.position) ?? "ETC";
    groups.set(g, [...(groups.get(g) ?? []), p]);
  }
  const order: Array<PositionGroup | "ETC"> = [...GROUP_ORDER, "ETC"];
  return (
    <div className="block">
      <h3 className="block-title">선수단 ({squad.length}명)</h3>
      <div className="squad">
        {order
          .filter((g) => groups.get(g)?.length)
          .map((g) => (
            <div key={g} className="squad-group">
              <h4>{g === "ETC" ? "기타" : POSITION_GROUP_LABEL[g]}</h4>
              <table className="standings">
                <tbody>
                  {groups
                    .get(g)!
                    .sort((x, y) => x.name.localeCompare(y.name))
                    .map((p) => (
                      <tr key={p.id}>
                        <td className="left">
                          <div className="player">
                            <strong>{p.name}</strong>
                            {/* 세부 포지션이 있을 때만 표시 (예: 센터백) */}
                            {g !== "ETC" && positionLabel(p.position) === POSITION_GROUP_LABEL[g] ? null : (
                              <span>{positionLabel(p.position)}</span>
                            )}
                          </div>
                        </td>
                        <td className="left">{countryLabel(p.nationality)}</td>
                        <td>{age(p.dateOfBirth) != null ? `${age(p.dateOfBirth)}세` : "-"}</td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          ))}
      </div>
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
