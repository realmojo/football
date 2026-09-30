import type { Metadata } from "next";
import { ErrorBox } from "@/components/ErrorBox";
import { ScheduleDay } from "@/components/ScheduleDay";
import { getAllSeasonMatches, getH2hIndex, getKoreanPlayers, type KoreanPlayer } from "@/lib/data";
import { formatKstDay, kstDate } from "@/lib/format";
import { koreansByTeam } from "@/lib/korean";
import { leaguePositions } from "@/lib/positions";
import { byCompetition, dayParagraphs, koreanNames, matchDates, matchesOn } from "@/lib/schedule";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "오늘 해외축구 일정 · 한국시간 경기 시간",
  description:
    "오늘과 이번 주 프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그 경기 일정을 한국시간으로 정리했습니다. 한국 선수 소속팀 경기도 함께 표시합니다.",
  alternates: { canonical: "/schedule" },
};

export default async function SchedulePage() {
  let matches: Match[];
  let players: KoreanPlayer[];
  let positions: Map<number, number>;
  let h2h: Set<number>;
  try {
    let index: Awaited<ReturnType<typeof getH2hIndex>>;
    [matches, players, positions, index] = await Promise.all([
      getAllSeasonMatches(),
      getKoreanPlayers(),
      leaguePositions(),
      getH2hIndex().catch(() => []),
    ]);
    h2h = new Set(index.map((r) => r.match_id));
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const byTeam = koreansByTeam(players);
  const today = kstDate(new Date());
  const todays = matchesOn(matches, today);
  const upcomingDays = matchDates(matches)
    .filter((d) => d > today)
    .slice(0, 7);
  const recentDays = matchDates(matches)
    .filter((d) => d < today)
    .slice(-5)
    .reverse();

  return (
    <article className="review">
      <header className="prose review-lead">
        <h1>해외축구 일정 (한국시간)</h1>
        <p className="lead">
          유럽 5대 리그와 챔피언스리그 경기를 날짜별로 모았습니다. 모든 시간은 한국시간이며, 한국 선수 소속팀 경기에는
          선수 이름을 함께 표시합니다.
        </p>
      </header>

      <div className="prose review-lead">
        <h2>
          오늘 · <a href={`/schedule/${today}`}>{formatKstDay(today)}</a>
        </h2>
        {dayParagraphs(today, todays, byTeam, positions).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>
      <ScheduleDay matches={todays} byTeam={byTeam} h2h={h2h} />

      <div className="cols">
        <div className="block">
          <h3 className="block-title">다가오는 경기일</h3>
          <ul className="facts">
            {upcomingDays.map((d) => {
              const list = matchesOn(matches, d);
              const ko = [...new Set(list.flatMap((m) => koreanNames(m, byTeam)))];
              return (
                <li key={d}>
                  <a href={`/schedule/${d}`}>
                    <b>{formatKstDay(d)}</b>
                  </a>
                  <span>
                    {byCompetition(list)
                      .map((g) => `${g.league.name} ${g.matches.length}`)
                      .join(" · ")}
                    {ko.length ? ` · 한국 선수 ${ko.join(", ")}` : ""}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
        <div className="block">
          <h3 className="block-title">지난 경기일 결과</h3>
          <ul className="facts">
            {recentDays.map((d) => (
              <li key={d}>
                <a href={`/schedule/${d}`}>
                  <b>{formatKstDay(d)}</b>
                </a>
                <span>{matchesOn(matches, d).length}경기 결과 보기 →</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="prose review-lead">
        <h2>유럽 축구, 한국에서 언제 볼 수 있나</h2>
        <p>
          유럽과 한국의 시차는 여름에 7~8시간, 겨울에 8~9시간입니다. 유럽 각국은 3월 마지막 일요일부터 10월 마지막
          일요일까지 서머타임을 쓰기 때문에, 같은 시각에 열리는 경기라도 계절에 따라 한국시간이 한 시간씩 달라집니다.
        </p>
        <p>
          주말 리그 경기는 대체로 토요일 밤 8시 반부터 일요일 새벽 5시 사이에 몰려 있고, 챔피언스리그는 화·수요일 저녁(현지
          시간)에 열려 한국에서는 수·목요일 새벽 4시 무렵에 킥오프하는 경기가 많습니다. 한국 선수 경기만 모아 보려면{" "}
          <a href="/korean-players">해외파 한국 선수</a> 페이지를 이용해 보세요.
        </p>
      </div>
    </article>
  );
}
