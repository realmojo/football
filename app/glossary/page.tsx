import type { Metadata } from "next";
import { ErrorBox } from "@/components/ErrorBox";
import { GLOSSARY_CATEGORIES, getGlossary, type GlossaryTerm } from "@/lib/data";
import { SITE_URL } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "축구 용어 사전 · 오프사이드부터 xG, 게겐프레싱까지",
  description:
    "오프사이드, VAR, 클린시트, 기대득점(xG), 승강제, 리그 페이즈, 게겐프레싱, 바이아웃까지 해외축구를 볼 때 자주 나오는 용어를 쉽게 풀어 설명합니다.",
  alternates: { canonical: "/glossary" },
};

export default async function GlossaryPage() {
  let terms: GlossaryTerm[];
  try {
    terms = await getGlossary();
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  const groups = GLOSSARY_CATEGORIES.map((c) => ({ category: c, terms: terms.filter((t) => t.category === c) })).filter(
    (g) => g.terms.length,
  );

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "DefinedTermSet",
    name: "토리코리 축구 용어 사전",
    url: `${SITE_URL}/glossary`,
    hasDefinedTerm: terms.map((t) => ({
      "@type": "DefinedTerm",
      name: t.term,
      alternateName: t.english ?? undefined,
      url: `${SITE_URL}/glossary#${t.slug}`,
      description: t.body.replace(/<[^>]+>/g, ""),
    })),
  };

  return (
    <article className="prose">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <header>
        <h1>축구 용어 사전</h1>
        <p className="lead">
          중계와 기사에서 자주 나오지만 막상 설명하려면 어려운 축구 용어를 모았습니다. 규칙과 기록부터 대회 제도, 전술,
          이적까지 {terms.length}개 용어를 토리코리의 관점을 더해 쉽게 풀었습니다.
        </p>
        <nav className="glossary-index">
          {groups.map((g) => (
            <a key={g.category} href={`#cat-${GLOSSARY_CATEGORIES.indexOf(g.category)}`}>
              {g.category} ({g.terms.length})
            </a>
          ))}
        </nav>
      </header>
      {groups.map((g) => (
        <section key={g.category}>
          <h2 id={`cat-${GLOSSARY_CATEGORIES.indexOf(g.category)}`}>{g.category}</h2>
          <dl className="glossary">
            {g.terms.map((t) => (
              <div key={t.slug}>
                <dt id={t.slug}>
                  {t.term}
                  {t.english ? <small>{t.english}</small> : null}
                </dt>
                <dd dangerouslySetInnerHTML={{ __html: t.body }} />
              </div>
            ))}
          </dl>
        </section>
      ))}
      <p>
        용어가 실제 기록에서 어떻게 쓰이는지는 <a href="/stats">5대 리그 통계</a>와 각 리그의 시즌 통계, 라운드 리뷰에서
        확인할 수 있습니다. 더 깊은 설명은 <a href="/articles">축구 칼럼</a>에 정리하고 있습니다.
      </p>
    </article>
  );
}
