import { getArticles } from "@/lib/data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

// 예약 발행된 칼럼이 날짜가 되면 바로 피드에 나오도록 요청마다 만든다.
export const dynamic = "force-dynamic";

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// 발행일(YYYY-MM-DD)을 한국시간 오전 9시 기준 RFC 822 날짜로 바꾼다.
function rfc822(day: string) {
  return new Date(`${day.slice(0, 10)}T09:00:00+09:00`).toUTCString();
}

export async function GET() {
  const articles = await getArticles(30).catch(() => []);
  const items = articles
    .map(
      (a) => `    <item>
      <title>${esc(a.title)}</title>
      <link>${SITE_URL}/articles/${a.slug}</link>
      <guid isPermaLink="true">${SITE_URL}/articles/${a.slug}</guid>
      <description>${esc(a.description)}</description>
      <category>${esc(a.category)}</category>
      <pubDate>${rfc822(a.publishedAt)}</pubDate>
    </item>`,
    )
    .join("\n");
  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(SITE_NAME)} 축구 칼럼</title>
    <link>${SITE_URL}/articles</link>
    <atom:link href="${SITE_URL}/rss.xml" rel="self" type="application/rss+xml" />
    <description>해외축구 규칙, 대회 방식, 리그와 경기 분석을 다루는 ${esc(SITE_NAME)} 칼럼</description>
    <language>ko</language>
${articles[0] ? `    <lastBuildDate>${rfc822(articles[0].publishedAt)}</lastBuildDate>\n` : ""}${items}
  </channel>
</rss>
`;
  return new Response(xml, {
    headers: {
      "Content-Type": "application/rss+xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800",
    },
  });
}
