import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { LEAGUES, leagueEmblem } from "@/lib/leagues";

export const metadata: Metadata = {
  title: "전체 리그 · 대회 목록",
  description:
    "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그와 챔피언십, 에레디비시, 프리메이라리가, 브라질 세리에 A까지 토리코리가 다루는 모든 대회의 순위와 일정을 모았습니다.",
  alternates: { canonical: "/leagues" },
};

export default function LeaguesPage() {
  return (
    <article className="prose">
      <header>
        <h1>전체 리그 · 대회</h1>
        <p className="lead">
          토리코리가 순위, 일정, 결과를 정리하는 대회 목록입니다. 대회 이름을 누르면 순위표와 일정, 시즌 통계로 이동합니다.
          지난 시즌 기록은 <a href="/archive">시즌 기록실</a>에서 볼 수 있습니다.
        </p>
      </header>
      {LEAGUES.map((l) => (
        <section key={l.code} className="league-card">
          <h2>
            <a href={`/${l.code}`} className="league-cell">
              <Crest src={leagueEmblem(l.code)} tla={l.code} size={24} />
              {l.name}
            </a>
            <small>{l.country}</small>
          </h2>
          <p>{l.intro[0]}</p>
        </section>
      ))}
    </article>
  );
}
