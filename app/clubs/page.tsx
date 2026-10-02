import type { Metadata } from "next";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { getAllSeasonMatches, getClubs, type ClubSummary } from "@/lib/data";
import { homeCompetition } from "@/lib/korean";
import { LEAGUES } from "@/lib/leagues";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "해외축구 구단 소개 · 프리미어리그부터 브라질까지 전 구단",
  description:
    "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1과 챔피언십, 에레디비시, 프리메이라리가, 브라질 세리에 A, 챔피언스리그 참가 구단의 역사, 홈구장, 별명, 라이벌을 소개합니다.",
  alternates: { canonical: "/clubs" },
};

export default async function ClubsPage() {
  let clubs: ClubSummary[];
  let matches: Match[];
  try {
    [clubs, matches] = await Promise.all([getClubs(), getAllSeasonMatches()]);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  const withCode = clubs.map((c) => ({ ...c, code: homeCompetition(c.team.id, matches) }));
  const groups = LEAGUES.filter((l) => l.code !== "WC")
    .map((l) => ({
      league: l,
      list: withCode.filter((c) => c.code === l.code).sort((a, b) => a.team.name.localeCompare(b.team.name, "ko")),
    }))
    .filter((g) => g.list.length);

  return (
    <article className="review">
      <header className="prose review-lead">
        <h1>해외축구 구단 소개</h1>
        <p className="lead">
          토리코리가 다루는 리그의 {clubs.length}개 구단을 소개합니다. 구단을 누르면 역사와 별명, 홈구장, 라이벌, 선수단 구성과
          이번 시즌 성적을 볼 수 있습니다.
        </p>
        <nav className="glossary-index">
          {groups.map((g) => (
            <a key={g.league.code} href={`#club-${g.league.code}`}>
              {g.league.name} ({g.list.length})
            </a>
          ))}
        </nav>
      </header>
      {groups.map(({ league, list }) => (
        <div key={league.code} className="block" id={`club-${league.code}`}>
          <h3 className="block-title">{league.name}</h3>
          <ul className="club-grid">
            {list.map((c) => (
              <li key={c.team.id}>
                <a href={`/club/${c.team.id}`}>
                  <Crest src={c.team.crest} tla={c.team.tla} size={36} />
                  <span>
                    <strong>{c.team.name}</strong>
                    <small>{[c.nickname, ...c.tags.filter((t) => t.endsWith("창단"))].filter(Boolean).join(" · ")}</small>
                  </span>
                </a>
              </li>
            ))}
          </ul>
        </div>
      ))}
    </article>
  );
}
