import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatArticleDate } from "@/lib/articles";
import { getArticle, getArticles } from "@/lib/data";
import { SITE_NAME, SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const article = await getArticle((await params).slug);
  if (!article) return {};
  return {
    title: article.title,
    description: article.description,
    alternates: { canonical: `/articles/${article.slug}` },
    openGraph: {
      type: "article",
      title: article.title,
      description: article.description,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
  };
}

export default async function ArticlePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [article, all] = await Promise.all([getArticle(slug), getArticles()]);
  if (!article) notFound();
  const others = all.filter((a) => a.slug !== article.slug);
  const edited = article.updatedAt.slice(0, 10) > article.publishedAt;

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.title,
    description: article.description,
    datePublished: article.publishedAt,
    dateModified: article.updatedAt,
    inLanguage: "ko",
    mainEntityOfPage: `${SITE_URL}/articles/${article.slug}`,
    author: { "@type": "Organization", name: `${SITE_NAME} 편집부`, url: SITE_URL },
    publisher: { "@type": "Organization", name: SITE_NAME, url: SITE_URL },
  };

  return (
    <article className="prose">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs">
        <a href="/articles">축구 칼럼</a> · {article.category}
      </p>
      <header>
        <h1>{article.title}</h1>
        <p className="lead">{article.description}</p>
        <p className="article-byline">
          {SITE_NAME} 편집부 · <time dateTime={article.publishedAt}>{formatArticleDate(article.publishedAt)}</time>
          {edited ? ` (수정 ${formatArticleDate(article.updatedAt)})` : null}
        </p>
      </header>
      <div dangerouslySetInnerHTML={{ __html: article.body }} />
      {others.length ? (
        <aside className="article-more">
          <h2>다른 칼럼</h2>
          <ul>
            {others.map((a) => (
              <li key={a.slug}>
                <a href={`/articles/${a.slug}`}>{a.title}</a>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}
    </article>
  );
}
