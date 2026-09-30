import type { MetadataRoute } from "next";
import { getStandings } from "@/lib/data";
import { LEAGUES } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";

// 수집된 최신 데이터를 보여주기 위해 요청마다 렌더링한다.
export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const pages: MetadataRoute.Sitemap = [
    { url: `${SITE_URL}/`, lastModified: now, changeFrequency: "hourly", priority: 1 },
    ...["about", "guide", "privacy", "terms", "contact"].map((p) => ({
      url: `${SITE_URL}/${p}`,
      lastModified: now,
      changeFrequency: "monthly" as const,
      priority: 0.3,
    })),
  ];

  for (const l of LEAGUES) {
    pages.push(
      { url: `${SITE_URL}/${l.code}`, lastModified: now, changeFrequency: "hourly", priority: 0.9 },
      { url: `${SITE_URL}/${l.code}/matches`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
      { url: `${SITE_URL}/${l.code}/scorers`, lastModified: now, changeFrequency: "hourly", priority: 0.8 },
    );
    const standings = await getStandings(l.code).catch(() => null);
    const teamIds = new Set(standings?.standings.flatMap((s) => s.table.map((r) => r.team.id)) ?? []);
    for (const id of teamIds) {
      pages.push({ url: `${SITE_URL}/${l.code}/team/${id}`, lastModified: now, changeFrequency: "daily", priority: 0.6 });
    }
  }
  return pages;
}
