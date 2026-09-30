import type { Metadata } from "next";
import { formatArticleDate } from "@/lib/articles";
import { getArticles } from "@/lib/data";

// 새 글을 배포 없이 바로 보여주기 위해 요청마다 렌더링한다.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "축구 칼럼",
  description: "축구 규칙, 대회 방식, 리그 비교, 기록 읽는 법까지 해외축구를 더 깊이 즐기기 위한 토리코리 칼럼 모음입니다.",
  alternates: { canonical: "/articles" },
};

export default async function ArticlesPage() {
  const articles = await getArticles();
  return (
    <article className="prose">
      <header>
        <h1>축구 칼럼</h1>
        <p className="lead">
          순위표와 경기 결과만으로는 보이지 않는 이야기를 정리합니다. 규칙과 대회 방식, 리그별 차이, 기록을 읽는 법까지
          해외축구를 더 깊이 즐기는 데 필요한 내용을 다룹니다.
        </p>
      </header>
      {articles.length ? (
        <ul className="article-list">
          {articles.map((a) => (
            <li key={a.slug}>
              <a href={`/articles/${a.slug}`}>
                <span className="article-meta">
                  <em>{a.category}</em>
                  <time dateTime={a.publishedAt}>{formatArticleDate(a.publishedAt)}</time>
                </span>
                <strong>{a.title}</strong>
                <p>{a.description}</p>
              </a>
            </li>
          ))}
        </ul>
      ) : (
        <p className="muted">아직 공개된 칼럼이 없습니다.</p>
      )}
    </article>
  );
}
