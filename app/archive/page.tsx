import type { Metadata } from "next";
import { ErrorBox } from "@/components/ErrorBox";
import { ARCHIVE_LEAGUES, seasonLabel } from "@/lib/archive";
import { getArchive, getArchiveSeasons } from "@/lib/data";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "시즌 기록실 · 지난 시즌 최종 순위와 득점왕",
  description:
    "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, K리그1의 2022~2024 시즌 최종 순위, 우승 팀, 강등 팀, 득점왕을 정리한 기록실입니다.",
  alternates: { canonical: "/archive" },
};

export default async function ArchiveIndexPage() {
  let seasons: { league: string; season: number }[];
  try {
    seasons = await getArchiveSeasons();
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  const champions = await Promise.all(
    seasons.map(async (s) => {
      const a = await getArchive(s.league, s.season).catch(() => null);
      return { ...s, champion: a?.table[0]?.teamName ?? null, scorer: a?.scorers[0] ?? null };
    }),
  );

  return (
    <article className="review">
      <header className="prose review-lead">
        <h1>시즌 기록실</h1>
        <p className="lead">
          지난 시즌의 최종 순위와 득점왕을 리그별로 정리했습니다. 이번 시즌 순위와 비교하며 팀의 흐름을 살펴보세요.
        </p>
      </header>
      {ARCHIVE_LEAGUES.map((league) => {
        const rows = champions.filter((c) => c.league === league.code).sort((a, b) => b.season - a.season);
        if (!rows.length) return null;
        return (
          <div key={league.code} className="block">
            <h3 className="block-title">
              {league.name} <span className="muted">· {league.country}</span>
            </h3>
            <ul className="facts">
              {rows.map((r) => (
                <li key={r.season}>
                  <a href={`/archive/${league.code}/${r.season}`}>
                    <b>{seasonLabel(league, r.season)} 시즌</b>
                  </a>
                  <span>
                    우승 {r.champion ?? "-"}
                    {r.scorer ? ` · 득점왕 ${r.scorer.playerName} ${r.scorer.goals}골` : ""}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        );
      })}
      <p className="muted note">최종 순위는 API-Football, 득점 순위는 football-data.org 데이터를 바탕으로 정리했습니다.</p>
    </article>
  );
}
