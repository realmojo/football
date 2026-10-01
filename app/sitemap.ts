import type { MetadataRoute } from "next";
import { ARCHIVE_LEAGUES } from "@/lib/archive";
import {
  getTeamIntroIds,
  getAllSeasonMatches,
  getArchiveSeasons,
  getAllScorers,
  getArticles,
  getGlossary,
  getH2hIndex,
  getKoreanPlayers,
  getSeasonMatches,
  getStandings,
  h2hSlug,
} from "@/lib/data";
import { matchDates } from "@/lib/schedule";
import { completedRounds } from "@/lib/insights";
import { isCup, LEAGUES } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";

// 수집된 최신 데이터를 보여주기 위해 요청마다 렌더링한다.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const [articles, players, allMatches, archive, h2h] = await Promise.all([
    getArticles().catch(() => []),
    getKoreanPlayers().catch(() => []),
    getAllSeasonMatches().catch(() => []),
    getArchiveSeasons().catch(() => []),
    getH2hIndex().catch(() => []),
  ]);
  const glossary = await getGlossary().catch(() => []);
  const scorerIds = [...new Set((await getAllScorers().catch(() => [])).map((s) => s.playerId))].filter(
    (id) => !players.some((p) => p.id === id),
  );
  const h2hPairs = [...new Set(h2h.map((r) => h2hSlug(r.home_team_id, r.away_team_id)))];
  const dates = matchDates(allMatches);
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...["about", "guide", "privacy", "terms", "contact"].map((p) => ({
      url: `${SITE_URL}/${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    { url: `${SITE_URL}/schedule`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
    { url: `${SITE_URL}/korean-players`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${SITE_URL}/players`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    ...scorerIds.map((id) => ({ url: `${SITE_URL}/player/${id}`, changeFrequency: "daily" as const, priority: 0.5 })),
    ...players.map((p) => ({
      url: `${SITE_URL}/player/${p.id}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.8,
    })),
    ...dates.map((d) => ({
      url: `${SITE_URL}/schedule/${d}`,
      changeFrequency: "daily" as const,
      priority: 0.6,
    })),
    { url: `${SITE_URL}/leagues`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/archive`, lastModified: now, changeFrequency: "monthly", priority: 0.6 },
    ...archive
      .filter((a) => ARCHIVE_LEAGUES.some((l) => l.code === a.league))
      .map((a) => ({
        url: `${SITE_URL}/archive/${a.league}/${a.season}`,
        changeFrequency: "yearly" as const,
        priority: 0.6,
      })),
    ...h2hPairs.map((p) => ({ url: `${SITE_URL}/h2h/${p}`, changeFrequency: "weekly" as const, priority: 0.6 })),
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    ...glossary.map((t) => ({ url: `${SITE_URL}/glossary/${t.slug}`, changeFrequency: "monthly" as const, priority: 0.5 })),
    { url: `${SITE_URL}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: new Date(a.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

  const introIds = await getTeamIntroIds().catch(() => new Set<number>());
  for (const l of LEAGUES) {
    pages.push(
      { url: `${SITE_URL}/${l.code}`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
      { url: `${SITE_URL}/${l.code}/matches`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
      { url: `${SITE_URL}/${l.code}/scorers`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    );
    let teamIds: Set<number>;
    if (isCup(l)) {
      pages.push({ url: `${SITE_URL}/${l.code}/bracket`, lastModified: now, changeFrequency: "daily", priority: 0.8 });
      const matches = await getSeasonMatches(l.code).catch(() => []);
      teamIds = new Set(matches.flatMap((m) => [m.homeTeam.id, m.awayTeam.id]));
    } else {
      const [standings, matches] = await Promise.all([
        getStandings(l.code).catch(() => null),
        getSeasonMatches(l.code).catch(() => []),
      ]);
      teamIds = new Set(standings?.standings.flatMap((s) => s.table.map((r) => r.team.id)) ?? []);
      pages.push({ url: `${SITE_URL}/${l.code}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.7 });
      for (const day of completedRounds(matches)) {
        pages.push({ url: `${SITE_URL}/${l.code}/round/${day}`, changeFrequency: "weekly", priority: 0.6 });
      }
    }
    for (const id of teamIds) {
      if (!introIds.has(id)) continue;
      pages.push({ url: `${SITE_URL}/${l.code}/team/${id}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
    }
  }
  return pages;
}
