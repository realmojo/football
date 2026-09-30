import type { Metadata } from "next";
import { ErrorBox } from "@/components/ErrorBox";
import { getAllScorers, type ScorerEntry } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "해외축구 득점 선수 · 리그별 득점 선두와 선수 기록",
  description:
    "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그 등 리그별 득점 선두 선수들의 이번 시즌 골·도움 기록을 모았습니다. 선수 이름을 누르면 선수별 분석을 볼 수 있습니다.",
  alternates: { canonical: "/players" },
};

export default async function PlayersPage() {
  let scorers: ScorerEntry[];
  try {
    scorers = await getAllScorers();
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  const groups = LEAGUES.map((l) => ({ league: l, list: scorers.filter((s) => s.competition === l.code).slice(0, 10) })).filter(
    (g) => g.list.length,
  );
  // 시즌 일정이 다른 브라질 리그는 빼고 유럽 대회끼리 비교한다.
  const top = [...scorers.filter((s) => s.competition !== "BSA")].sort((a, b) => b.goals - a.goals || (b.assists ?? 0) - (a.assists ?? 0))[0];

  return (
    <article className="review">
      <header className="prose review-lead">
        <h1>해외축구 득점 선수</h1>
        <p className="lead">
          리그별 득점 순위 상위 선수들의 이번 시즌 기록입니다. 선수 이름을 누르면 대회별 골·도움, 리그 득점 순위, 팀 득점에서
          차지하는 비율과 소속팀 일정을 볼 수 있습니다.
        </p>
        {top ? (
          <p>
            지금 유럽 대회를 통틀어 가장 많은 골을 넣은 선수는 {top.name}입니다(
            {LEAGUES.find((l) => l.code === top.competition)?.name} {top.goals}골). 한국 선수들의 기록은{" "}
            <a href="/korean-players">해외파 한국 선수</a>에서 따로 볼 수 있습니다.
          </p>
        ) : null}
      </header>
      <div className="cols">
        {groups.map(({ league, list }) => (
          <div key={league.code} className="block">
            <h3 className="block-title">{league.name}</h3>
            <ul className="facts">
              {list.map((s, i) => (
                <li key={s.playerId}>
                  <a href={`/player/${s.playerId}`}>
                    <b>
                      {i + 1}. {s.name}
                    </b>
                  </a>
                  <span>
                    {s.team?.shortName ?? ""} · {s.goals}골 {s.assists ?? 0}도움
                  </span>
                </li>
              ))}
            </ul>
            <a href={`/${league.code}/scorers`} className="h2h-link">
              {league.name} 전체 득점 순위 →
            </a>
          </div>
        ))}
      </div>
    </article>
  );
}
