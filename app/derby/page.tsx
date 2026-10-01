import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { getAllSeasonMatches, getDerbies, getTeamsByIds, type Derby } from "@/lib/data";
import { nextMeeting } from "@/lib/derby";
import { formatKickoff } from "@/lib/format";
import { findLeague, LEAGUES } from "@/lib/leagues";
import type { Match, Team } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "축구 더비·라이벌전 모음 · 북런던 더비부터 엘 클라시코까지",
  description:
    "북런던 더비, 맨체스터 더비, 엘 클라시코, 데어 클라시커, 밀라노 더비, 르 클라시크 등 유럽과 브라질의 대표 라이벌전 20개의 역사와 역대 맞대결, 다음 경기 일정을 정리했습니다.",
  alternates: { canonical: "/derby" },
};

export default async function DerbyIndexPage() {
  let derbies: Derby[];
  let matches: Match[];
  let teams: Map<number, Team>;
  try {
    [derbies, matches] = await Promise.all([getDerbies(), getAllSeasonMatches()]);
    teams = await getTeamsByIds([...new Set(derbies.flatMap((d) => [d.teamA, d.teamB]))]);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  const groups = LEAGUES.map((l) => ({ league: l, list: derbies.filter((d) => d.league === l.code) })).filter((g) => g.list.length);

  return (
    <article className="prose">
      <header>
        <h1>더비·라이벌전</h1>
        <p className="lead">
          같은 도시, 같은 지역, 오래된 앙금. 순위와 상관없이 팬들이 가장 기다리는 라이벌전 {derbies.length}개의 역사와
          역대 맞대결, 다음 경기 일정을 정리했습니다.
        </p>
      </header>
      {groups.map(({ league, list }) => (
        <section key={league.code}>
          <h2>{league.name}</h2>
          <ul className="article-list">
            {list.map((d) => {
              const a = teams.get(d.teamA);
              const b = teams.get(d.teamB);
              const next = nextMeeting(d, matches);
              return (
                <li key={d.slug}>
                  <a href={`/derby/${d.slug}`}>
                    <span className="article-meta">
                      <em>{findLeague(d.league)?.name}</em>
                      {next ? <span>다음 경기 {formatKickoff(next.utcDate)}</span> : null}
                    </span>
                    <strong className="derby-title">
                      {a ? <Crest src={a.crest} tla={a.tla} size={20} /> : null}
                      {d.name}
                      {b ? <Crest src={b.crest} tla={b.tla} size={20} /> : null}
                    </strong>
                    <p>
                      {a?.name} vs {b?.name}
                      {d.english ? ` · ${d.english}` : ""}
                    </p>
                  </a>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </article>
  );
}
