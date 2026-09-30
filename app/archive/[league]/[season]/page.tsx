import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { Stat } from "@/components/Stat";
import { describeZone, findArchiveLeague, seasonLabel, type ArchiveLeague } from "@/lib/archive";
import { getArchive, getArchiveSeasons, type ArchiveRow, type ArchiveScorer } from "@/lib/data";
import { josa } from "@/lib/josa";
import { findLeague } from "@/lib/leagues";

export const dynamic = "force-dynamic";

type Params = Promise<{ league: string; season: string }>;

async function load(params: Params) {
  const p = await params;
  const league = findArchiveLeague(p.league);
  const season = Number(p.season);
  if (!league || !Number.isInteger(season)) return null;
  const data = await getArchive(league.code, season);
  if (!data.table.length) return null;
  return { league, season, ...data };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load(params).catch(() => null);
  if (!d) return {};
  const label = seasonLabel(d.league, d.season);
  const champ = d.table[0];
  const top = d.scorers[0];
  return {
    title: `${label} ${d.league.name} 최종 순위 · 우승 ${champ.teamName}${top ? ` · 득점왕 ${top.playerName}` : ""}`,
    description: `${label} 시즌 ${d.league.name} 최종 순위표와 우승 팀 ${champ.teamName}(승점 ${champ.points}), 강등 팀, 득점 순위${top ? `(득점왕 ${top.playerName} ${top.goals}골)` : ""}를 정리했습니다.`,
    alternates: { canonical: `/archive/${d.league.code}/${d.season}` },
  };
}

function paragraphs(league: ArchiveLeague, season: number, table: ArchiveRow[], scorers: ArchiveScorer[]) {
  const label = seasonLabel(league, season);
  const [first, second] = table;
  const games = table.reduce((n, r) => n + r.played, 0) / 2;
  const goals = table.reduce((n, r) => n + r.goalsFor, 0);
  const relegated = table.filter((r) => describeZone(r.description) === "강등");
  const bestDefense = [...table].sort((a, b) => a.goalsAgainst - b.goalsAgainst)[0];
  const bestAttack = [...table].sort((a, b) => b.goalsFor - a.goalsFor)[0];
  const out: string[] = [];
  out.push(
    `${label} 시즌 ${league.name} 우승 팀은 ${first.teamName}입니다. ${first.played}경기에서 ${first.won}승 ${first.draw}무 ${first.lost}패, 승점 ${first.points}점을 기록했고` +
      (second ? `, 2위 ${second.teamName}보다 승점 ${first.points - second.points}점 앞섰습니다.` : "."),
  );
  if (games) {
    out.push(
      `시즌 전체 ${Math.round(games)}경기에서 ${goals}골이 나와 경기당 ${(goals / games).toFixed(2)}골을 기록했습니다. ` +
        `가장 많은 골을 넣은 팀은 ${bestAttack.teamName}(${bestAttack.goalsFor}골), 가장 적게 실점한 팀은 ${bestDefense.teamName}(${bestDefense.goalsAgainst}실점)입니다.`,
    );
  }
  if (scorers[0]) {
    const s = scorers[0];
    out.push(
      `득점왕은 ${s.teamName ? `${s.teamName}의 ` : ""}${s.playerName}입니다(${s.goals}골${s.assists ? ` ${s.assists}도움` : ""}${s.appearances ? `, ${s.appearances}경기` : ""}).` +
        (scorers[1] ? ` 2위는 ${scorers[1].playerName}(${scorers[1].goals}골)입니다.` : ""),
    );
  }
  if (relegated.length) {
    out.push(
      relegated.length === 1
        ? `이 시즌을 끝으로 ${josa(relegated[0].teamName, "이/가")} 2부 리그로 강등됐습니다.`
        : `이 시즌을 끝으로 ${relegated.map((r) => r.teamName).join(", ")}까지 ${relegated.length}팀이 2부 리그로 강등됐습니다.`,
    );
  }
  return out;
}

export default async function ArchiveSeasonPage({ params }: { params: Params }) {
  let d: Awaited<ReturnType<typeof load>>;
  let seasons: { league: string; season: number }[];
  try {
    [d, seasons] = await Promise.all([load(params), getArchiveSeasons()]);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!d) notFound();
  const { league, season, table, scorers } = d;
  const label = seasonLabel(league, season);
  const others = seasons.filter((s) => s.league === league.code && s.season !== season).sort((a, b) => b.season - a.season);
  const current = findLeague(league.code);
  const games = table.reduce((n, r) => n + r.played, 0) / 2;
  const goals = table.reduce((n, r) => n + r.goalsFor, 0);

  return (
    <article className="review">
      <p className="crumbs-bar">
        <a href="/archive">시즌 기록실</a> · {league.name} · {label}
      </p>
      <header className="prose review-lead">
        <h1>
          {label} {league.name} 최종 순위
        </h1>
        {paragraphs(league, season, table, scorers).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </header>

      <div className="stats">
        <Stat label="우승" value={table[0].teamName} />
        <Stat label="우승 승점" value={String(table[0].points)} />
        <Stat label="참가 팀" value={String(table.length)} />
        <Stat label="총 경기" value={String(Math.round(games))} />
        <Stat label="총 골" value={String(goals)} />
        <Stat label="경기당 골" value={games ? (goals / games).toFixed(2) : "-"} />
        <Stat label="득점왕" value={scorers[0] ? `${scorers[0].goals}골` : "-"} sub={scorers[0]?.playerName} />
      </div>

      <div className="block">
        <h3 className="block-title">최종 순위표</h3>
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr>
                <th className="pos">#</th>
                <th className="left">팀</th>
                <th>경기</th>
                <th>승</th>
                <th>무</th>
                <th>패</th>
                <th>득점</th>
                <th>실점</th>
                <th>득실</th>
                <th className="pts">승점</th>
                <th className="left">비고</th>
              </tr>
            </thead>
            <tbody>
              {table.map((r) => (
                <tr key={r.position}>
                  <td className="pos">{r.position}</td>
                  <td className="left">
                    <span className="team">
                      {r.teamLogo ? <img src={r.teamLogo} alt="" width={20} height={20} className="crest" loading="lazy" /> : null}
                      <span>{r.teamName}</span>
                    </span>
                  </td>
                  <td>{r.played}</td>
                  <td>{r.won}</td>
                  <td>{r.draw}</td>
                  <td>{r.lost}</td>
                  <td>{r.goalsFor}</td>
                  <td>{r.goalsAgainst}</td>
                  <td>{r.goalsFor - r.goalsAgainst > 0 ? `+${r.goalsFor - r.goalsAgainst}` : r.goalsFor - r.goalsAgainst}</td>
                  <td className="pts">{r.points}</td>
                  <td className="left muted">{describeZone(r.description) ?? ""}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {scorers.length ? (
        <div className="block">
          <h3 className="block-title">득점 순위</h3>
          <div className="table-wrap">
            <table className="standings">
              <thead>
                <tr>
                  <th className="pos">#</th>
                  <th className="left">선수</th>
                  <th className="left">팀</th>
                  <th>경기</th>
                  <th className="pts">골</th>
                  <th>도움</th>
                  <th>PK</th>
                </tr>
              </thead>
              <tbody>
                {scorers.slice(0, 20).map((s) => (
                  <tr key={s.rank}>
                    <td className="pos">{s.rank}</td>
                    <td className="left">{s.playerName}</td>
                    <td className="left">{s.teamName}</td>
                    <td>{s.appearances ?? "-"}</td>
                    <td className="pts">{s.goals}</td>
                    <td>{s.assists ?? "-"}</td>
                    <td>{s.penalties ?? "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      <div className="block">
        <h3 className="block-title">다른 시즌</h3>
        <nav className="round-links">
          {others.map((s) => (
            <a key={s.season} href={`/archive/${league.code}/${s.season}`}>
              {seasonLabel(league, s.season)} 시즌
            </a>
          ))}
          {current ? <a href={`/${current.code}`}>이번 시즌 {current.name} 순위 →</a> : null}
        </nav>
      </div>
      <p className="muted note">
        최종 순위는 API-Football, 득점 순위는 football-data.org 데이터를 바탕으로 정리했습니다. 승점 삭감 등 시즌 뒤 징계가
        반영되지 않았을 수 있습니다.
        {!scorers.length ? " 이 리그의 득점 순위는 데이터 검증이 끝나지 않아 싣지 않았습니다." : ""}
      </p>
    </article>
  );
}
