import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { GLOSSARY_CATEGORIES, getGlossary, type GlossaryTerm } from "@/lib/data";
import { plainText } from "@/lib/glossary";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

type Params = Promise<{ slug: string }>;

async function load(params: Params) {
  const { slug } = await params;
  // 이전·다음 용어가 분류 순서대로 이어지도록 분류별로 정렬한다.
  const terms = [...(await getGlossary())].sort(
    (a, b) =>
      GLOSSARY_CATEGORIES.indexOf(a.category as (typeof GLOSSARY_CATEGORIES)[number]) -
      GLOSSARY_CATEGORIES.indexOf(b.category as (typeof GLOSSARY_CATEGORIES)[number]),
  );
  const index = terms.findIndex((t) => t.slug === slug);
  if (index < 0) return null;
  return { term: terms[index], terms, index };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const data = await load(params).catch(() => null);
  if (!data) return {};
  const { term } = data;
  const text = plainText(term.body);
  return {
    title: `${term.term}${term.english ? `(${term.english})` : ""} 뜻 · 축구 용어 사전`,
    description: text.length > 150 ? `${text.slice(0, 147)}...` : text,
    alternates: { canonical: `/glossary/${term.slug}` },
  };
}

export default async function GlossaryTermPage({ params }: { params: Params }) {
  let data: Awaited<ReturnType<typeof load>>;
  try {
    data = await load(params);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!data) notFound();
  const { term, terms, index } = data;
  const related = terms.filter((t) => t.category === term.category && t.slug !== term.slug);
  const prev: GlossaryTerm | undefined = terms[index - 1];
  const next: GlossaryTerm | undefined = terms[index + 1];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTerm",
    name: term.term,
    alternateName: term.english ?? undefined,
    description: plainText(term.body),
    url: `${SITE_URL}/glossary/${term.slug}`,
    inDefinedTermSet: { "@type": "DefinedTermSet", name: "토리코리 축구 용어 사전", url: `${SITE_URL}/glossary` },
  };

  return (
    <article className="prose">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs">
        <a href="/glossary">축구 용어 사전</a> · {term.category}
      </p>
      <header>
        <h1>{term.term}</h1>
        {term.english ? <p className="lead">{term.english}</p> : null}
      </header>
      <div className="glossary-body" dangerouslySetInnerHTML={{ __html: `<p>${term.body}</p>` }} />

      {related.length ? (
        <aside className="article-more">
          <h2>{term.category} 분류의 다른 용어</h2>
          <nav className="round-links">
            {related.map((t) => (
              <a key={t.slug} href={`/glossary/${t.slug}`}>
                {t.term}
              </a>
            ))}
          </nav>
        </aside>
      ) : null}

      <nav className="round-nav glossary-nav">
        {prev ? <a href={`/glossary/${prev.slug}`}>← {prev.term}</a> : <span />}
        <a href="/glossary" className="glossary-home">
          전체 용어
        </a>
        {next ? <a href={`/glossary/${next.slug}`}>{next.term} →</a> : <span />}
      </nav>
    </article>
  );
}
