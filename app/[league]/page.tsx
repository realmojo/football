import { ErrorBox } from "@/components/ErrorBox";
import { FormString } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { TeamLabel } from "@/components/TeamLabel";
import { computeTable, isFinished, isLive, isUpcoming, recentForm } from "@/lib/analysis";
import { getSeasonMatches, getStandings } from "@/lib/data";
import { findLeague, ZONE_LABEL, zoneFor, zonesOf } from "@/lib/leagues";
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
  const info = findLeague(league)!;
  const code = info.code;
  const current = VIEWS.find((v) => v.key === view) ?? VIEWS[0];

  const [standingsResult, matchesResult] = await Promise.allSettled([
    getStandings(code),
    getSeasonMatches(code),
  ]);

  return (
    <div className="split">
      <section>
        <div className="sec-head">
          <h2>순위</h2>
          <div className="seg">
            {VIEWS.map((v) => (
              <a
                key={v.key}
                href={v.key === "total" ? `/${code}` : `/${code}?view=${v.key}`}
                className={v.key === current.key ? "active" : ""}
              >
                {v.label}
              </a>
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

        <div className="league-intro">
          <h2>{info.name} 알아보기</h2>
          {info.intro.map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          <p className="muted">
            순위표 항목과 색 막대의 뜻은 <a href="/guide">이용 가이드</a>에서 자세히 볼 수 있습니다.
          </p>
        </div>
      </section>

      <aside className="rail">
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

  const zones = type === "TOTAL" ? zonesOf(league) : [];

  return (
    <>
      {tables.map((s, i) => (
        <div key={i} className="table-wrap">
          {s.group?.startsWith("GROUP_") ? <h3 className="group">{s.group.replace("GROUP_", "")}조</h3> : null}
          <table className="standings">
            <thead>
              <tr>
                <th className="pos">순위</th>
                <th className="left">팀</th>
                <th>경기</th>
                <th>승</th>
                <th>무</th>
                <th>패</th>
                <th className="hide-sm">득점</th>
                <th className="hide-sm">실점</th>
                <th>득실</th>
                <th className="pts">승점</th>
                <th className="hide-sm left">최근 5경기</th>
              </tr>
            </thead>
            <tbody>
              {s.table.map((row) => {
                const zone = type === "TOTAL" ? zoneFor(league, row.position) : null;
                return (
                  <tr key={row.team.id} className={zone ? `z-${zone}` : undefined}>
                    <td className="pos">{row.position}</td>
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
                    <td className="pts">{row.points}</td>
                    <td className="hide-sm left">
                      <FormString form={row.form} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
      {zones.length ? (
        <ul className="legend">
          {zones.map((z) => (
            <li key={z} className={`z-${z}`}>
              {ZONE_LABEL[z]}
            </li>
          ))}
        </ul>
      ) : null}
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
        <div className="block">
          <h3 className="block-title live-title">진행 중</h3>
          {live.map((m) => (
            <MatchRow key={m.id} match={m} league={league} showDate />
          ))}
        </div>
      ) : null}
      <div className="block">
        <h3 className="block-title">최근 결과</h3>
        {recent.length ? (
          recent.map((m) => <MatchRow key={m.id} match={m} league={league} showDate />)
        ) : (
          <p className="muted">경기 결과가 없습니다.</p>
        )}
      </div>
      <div className="block">
        <h3 className="block-title">다음 경기</h3>
        {upcoming.length ? (
          upcoming.map((m) => <MatchRow key={m.id} match={m} league={league} showDate />)
        ) : (
          <p className="muted">예정된 경기가 없습니다.</p>
        )}
      </div>
    </>
  );
}
