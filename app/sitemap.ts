import type { MetadataRoute } from "next";
import { getArticles, getSeasonMatches, getStandings } from "@/lib/data";
import { completedRounds } from "@/lib/insights";
import { isCup, LEAGUES } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";

// 수집된 최신 데이터를 보여주기 위해 요청마다 렌더링한다.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const articles = await getArticles().catch(() => []);
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...["about", "guide", "privacy", "terms", "contact"].map((p) => ({
      url: `${SITE_URL}/${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
    { url: `${SITE_URL}/stats`, lastModified: now, changeFrequency: "daily", priority: 0.7 },
    { url: `${SITE_URL}/glossary`, lastModified: now, changeFrequency: "monthly", priority: 0.5 },
    { url: `${SITE_URL}/articles`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    ...articles.map((a) => ({
      url: `${SITE_URL}/articles/${a.slug}`,
      lastModified: new Date(a.updatedAt),
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
  ];

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
      pages.push({ url: `${SITE_URL}/${l.code}/team/${id}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
    }
  }
  return pages;
}
