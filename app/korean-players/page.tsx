import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { getAllSeasonMatches, getKoreanPlayers, type KoreanPlayer } from "@/lib/data";
import { formatKickoff } from "@/lib/format";
import { homeCompetition, koreansByTeam, teamSchedule, totalAssists, totalGoals } from "@/lib/korean";
import { age, positionLabel } from "@/lib/labels";
import { findLeague } from "@/lib/leagues";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "해외파 한국 선수 · 소속팀 경기 일정과 이번 시즌 기록",
  description:
    "김민재, 이강인, 황희찬, 황인범 등 유럽에서 뛰는 한국 선수들의 소속팀, 이번 시즌 골·도움, 다음 경기 한국시간 일정과 최근 결과를 한곳에 모았습니다.",
  alternates: { canonical: "/korean-players" },
};

function leagueName(code: string | null | undefined) {
  return code ? (findLeague(code)?.name ?? code) : "";
}

function scoreLine(m: Match, teamId: number) {
  const home = m.homeTeam.id === teamId;
  const opp = home ? m.awayTeam : m.homeTeam;
  const gf = (home ? m.score.fullTime.home : m.score.fullTime.away) ?? 0;
  const ga = (home ? m.score.fullTime.away : m.score.fullTime.home) ?? 0;
  const r = gf > ga ? "승" : gf < ga ? "패" : "무";
  return `${r} ${gf}-${ga} vs ${opp.shortName} (${home ? "홈" : "원정"})`;
}

export default async function KoreanPlayersPage() {
  let players: KoreanPlayer[];
  let matches: Match[];
  try {
    [players, matches] = await Promise.all([getKoreanPlayers(), getAllSeasonMatches()]);
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const byTeam = koreansByTeam(players);
  const now = Date.now();
  const weekAhead = matches
    .filter((m) => byTeam.has(m.homeTeam.id) || byTeam.has(m.awayTeam.id))
    .filter((m) => {
      const t = new Date(m.utcDate).getTime();
      return t >= now - 3 * 3600_000 && t <= now + 7 * 86400_000;
    })
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate));
  const scorers = players.filter((p) => totalGoals(p) + totalAssists(p) > 0);

  return (
    <article className="review">
      <header className="prose review-lead">
        <h1>해외파 한국 선수</h1>
        <p className="lead">
          유럽 무대에서 뛰는 한국 선수 {players.length}명의 소속팀 경기 일정과 이번 시즌 기록을 한국시간으로 정리했습니다.
          선수 이름을 누르면 경력과 관전 포인트, 소속팀의 최근 흐름을 볼 수 있습니다.
        </p>
        {scorers.length ? (
          <p>
            이번 시즌 공격 포인트를 기록한 선수는{" "}
            {scorers
              .map((p) => `${p.nameKo}(${totalGoals(p)}골 ${totalAssists(p)}도움)`)
              .join(", ")}
            입니다. 득점 순위 상위 30명 안에 든 기록만 집계되므로 실제 기록과 다를 수 있습니다.
          </p>
        ) : null}
      </header>

      <div className="block">
        <h3 className="block-title">앞으로 7일 한국 선수 소속팀 경기</h3>
        {weekAhead.length ? (
          <ul className="facts">
            {weekAhead.map((m) => {
              const names = [...(byTeam.get(m.homeTeam.id) ?? []), ...(byTeam.get(m.awayTeam.id) ?? [])]
                .map((p) => p.nameKo)
                .join(", ");
              return (
                <li key={m.id}>
                  <span>
                    {formatKickoff(m.utcDate)} · {leagueName(m.competition)}
                  </span>
                  <b>
                    {m.homeTeam.shortName} vs {m.awayTeam.shortName} <em className="ko-tag">{names}</em>
                  </b>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="muted note">앞으로 7일 안에 예정된 소속팀 경기가 없습니다.</p>
        )}
      </div>

      <div className="block">
        <h3 className="block-title">선수별 현황</h3>
        <div className="table-wrap">
          <table className="standings">
            <thead>
              <tr>
                <th scope="col" className="left">선수</th>
                <th scope="col" className="left">소속팀</th>
                <th scope="col">포지션</th>
                <th scope="col">나이</th>
                <th scope="col">골</th>
                <th scope="col">도움</th>
                <th scope="col" className="left">다음 경기</th>
                <th scope="col" className="left">최근 결과</th>
              </tr>
            </thead>
            <tbody>
              {players.map((p) => {
                const code = p.team ? homeCompetition(p.team.id, matches) : null;
                const sched = p.team ? teamSchedule(p.team.id, matches) : null;
                const next = sched?.upcoming[0];
                const last = sched?.recent[0];
                return (
                  <tr key={p.id}>
                    <td className="left">
                      <a href={`/player/${p.id}`} className="player-link">
                        <strong>{p.nameKo}</strong>
                      </a>
                    </td>
                    <td className="left">
                      {p.team ? (
                        code ? (
                          <a href={`/${code}/team/${p.team.id}`} className="team">
                            <Crest src={p.team.crest} tla={p.team.tla} />
                            <span>{p.team.shortName}</span>
                          </a>
                        ) : (
                          p.team.shortName
                        )
                      ) : (
                        "-"
                      )}
                    </td>
                    <td>{positionLabel(p.position)}</td>
                    <td>{age(p.dateOfBirth) ?? "-"}</td>
                    <td>{totalGoals(p)}</td>
                    <td>{totalAssists(p)}</td>
                    <td className="left">
                      {next ? `${formatKickoff(next.utcDate)} vs ${next.homeTeam.id === p.team!.id ? next.awayTeam.shortName : next.homeTeam.shortName}` : "-"}
                    </td>
                    <td className="left">{last && p.team ? scoreLine(last, p.team.id) : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="muted note">
          소속팀과 포지션은 각 구단 선수단 정보를 하루 한 번 받아와 갱신합니다. 이적 직후에는 반영이 늦을 수 있습니다. 골·도움은
          리그별 득점 순위 상위 30명 기록을 합산한 값입니다.
        </p>
      </div>

      <div className="prose review-lead">
        <h2>해외파를 볼 때 알아두면 좋은 점</h2>
        <p>
          유럽 리그 경기는 대부분 한국시간으로 밤늦게나 새벽에 열립니다. 주말 리그 경기는 토요일 밤 11시부터 일요일 새벽
          사이, 챔피언스리그는 수요일과 목요일 새벽 4시 무렵에 많이 몰려 있습니다. 날짜별 전체 경기는{" "}
          <a href="/schedule">해외축구 일정</a>에서 한국시간으로 확인할 수 있습니다.
        </p>
        <p>
          선수 개인의 출전 시간과 교체 여부는 이 페이지에서 다루지 않습니다. 대신 소속팀의 흐름을 함께 보면 선수가 어떤
          환경에서 뛰고 있는지 가늠할 수 있습니다. 팀이 상승세일 때는 주전 경쟁이 치열해지고, 부진할 때는 새로운 얼굴에게
          기회가 돌아가기도 합니다.
        </p>
      </div>
    </article>
  );
}
