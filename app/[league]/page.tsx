import Link from "next/link";
import { ErrorBox } from "@/components/ErrorBox";
import { FormString } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { TeamLabel } from "@/components/TeamLabel";
import { computeTable, isFinished, isLive, isUpcoming, recentForm } from "@/lib/analysis";
import { getSeasonMatches, getStandings } from "@/lib/api";
import { findLeague } from "@/lib/leagues";
import type { Match, Standing, StandingsResponse } from "@/lib/types";

const VIEWS = [
  { key: "total", type: "TOTAL", label: "전체" },
  { key: "home", type: "HOME", label: "홈" },
  { key: "away", type: "AWAY", label: "원정" },
] as const;

export default async function StandingsPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ view?: string }>;
}) {
  const { league } = await params;
  const { view = "total" } = await searchParams;
  const code = findLeague(league)!.code;
  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];

  const [standingsResult, matchesResult] = await Promise.allSettled([
    getStandings(code),
    getSeasonMatches(code),
  ]);

  return (
    <div className="grid">
      <section>
        <div className="section-head">
          <h2>순위</h2>
          <div className="toggle">
            {VIEWS.map((v) => (
              <Link
                key={v.key}
                href={v.key === "total" ? `/${code}` : `/${code}?view=${v.key}`}
                className={v.key === current.key ? "active" : ""}
              >
                {v.label}
              </Link>
            ))}
          </div>
        </div>
        {standingsResult.status === "fulfilled" ? (
          <StandingsTables
            data={standingsResult.value}
            matches={matchesResult.status === "fulfilled" ? matchesResult.value : null}
            type={current.type}
            league={code}
          />
        ) : (
          <ErrorBox error={standingsResult.reason} />
        )}
      </section>

      <aside>
        {matchesResult.status === "fulfilled" ? (
          <MatchesSummary matches={matchesResult.value} league={code} />
        ) : (
          <ErrorBox error={matchesResult.reason} />
        )}
      </aside>
    </div>
  );
}

// API 가 주지 않는 홈/원정 순위와 최근 폼을 경기 결과로 보완한다.
function resolveTables(data: StandingsResponse, matches: Match[] | null, type: Standing["type"]): Standing[] {
  const fromApi = data.standings.filter((s) => s.type === type);
  if (!matches) return fromApi;
  if (fromApi.length > 0) {
    return fromApi.map((s) => ({
      ...s,
      table: s.table.map((row) => ({ ...row, form: row.form ?? (recentForm(matches, row.team.id) || null) })),
    }));
  }
  return data.standings
    .filter((s) => s.type === "TOTAL")
    .map((s) => {
      const ids = new Set(s.table.map((r) => r.team.id));
      const groupMatches = matches.filter((m) => ids.has(m.homeTeam.id) && ids.has(m.awayTeam.id));
      return { ...s, type, table: computeTable(groupMatches, s.table.map((r) => r.team), type) };
    });
}

function StandingsTables({
  data,
  matches,
  type,
  league,
}: {
  data: StandingsResponse;
  matches: Match[] | null;
  type: Standing["type"];
  league: string;
}) {
  const tables = resolveTables(data, matches, type);
  if (tables.length === 0 || tables.every((t) => t.table.length === 0))
    return <p className="muted">순위 정보가 없습니다.</p>;

  return (
    <>
      {data.season.currentMatchday ? (
        <p className="muted small">
          {data.season.startDate.slice(0, 4)}/{data.season.endDate.slice(2, 4)} 시즌 · 현재 {data.season.currentMatchday}라운드
        </p>
      ) : null}
      {tables.map((s, i) => (
        <div key={i} className="card table-wrap">
          {s.group?.startsWith("GROUP_") ? <h3>{s.group.replace("GROUP_", "")}조</h3> : null}
          <table className="standings">
            <thead>
              <tr>
                <th>#</th>
                <th className="left">팀</th>
                <th>경기</th>
                <th>승</th>
                <th>무</th>
                <th>패</th>
                <th className="hide-sm">득점</th>
                <th className="hide-sm">실점</th>
                <th>득실</th>
                <th>승점</th>
                <th className="hide-sm">최근 5경기</th>
              </tr>
            </thead>
            <tbody>
              {s.table.map((row) => (
                <tr key={row.team.id}>
                  <td>{row.position}</td>
                  <td className="left">
                    <TeamLabel team={row.team} league={league} short />
                  </td>
                  <td>{row.playedGames}</td>
                  <td>{row.won}</td>
                  <td>{row.draw}</td>
                  <td>{row.lost}</td>
                  <td className="hide-sm">{row.goalsFor}</td>
                  <td className="hide-sm">{row.goalsAgainst}</td>
                  <td>{row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}</td>
                  <td>
                    <strong>{row.points}</strong>
                  </td>
                  <td className="hide-sm">
                    <FormString form={row.form} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ))}
    </>
  );
}

function MatchesSummary({ matches, league }: { matches: Match[]; league: string }) {
  const live = matches.filter(isLive);
  const recent = matches
    .filter(isFinished)
    .sort((a, b) => b.utcDate.localeCompare(a.utcDate))
    .slice(0, 8);
  const upcoming = matches
    .filter(isUpcoming)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))
    .slice(0, 8);

  return (
    <>
      {live.length > 0 ? (
        <div className="card">
          <h3>진행중인 경기</h3>
          {live.map((m) => (
            <MatchRow key={m.id} match={m} league={league} showDate />
          ))}
        </div>
      ) : null}
      <div className="card">
        <h3>최근 결과</h3>
        {recent.length ? (
          recent.map((m) => <MatchRow key={m.id} match={m} league={league} showDate />)
        ) : (
          <p className="muted">경기 결과가 없습니다.</p>
        )}
      </div>
      <div className="card">
        <h3>다가오는 경기</h3>
        {upcoming.length ? (
          upcoming.map((m) => <MatchRow key={m.id} match={m} league={league} showDate />)
        ) : (
          <p className="muted">예정된 경기가 없습니다.</p>
        )}
      </div>
    </>
  );
}
