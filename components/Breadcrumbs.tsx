import { SITE_URL } from "@/lib/site";

export type Crumb = { name: string; href?: string };

/** 페이지 위치 표시(빵부스러기)와 검색엔진용 BreadcrumbList 구조화 데이터를 함께 그린다. */
export function Breadcrumbs({ items }: { items: Crumb[] }) {
  const all: Crumb[] = [{ name: "홈", href: "/" }, ...items];
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: all.map((c, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: `${SITE_URL}${c.href === "/" ? "" : c.href}` } : {}),
    })),
  };
  return (
    <nav className="crumbs-bar" aria-label="현재 위치">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      {all.map((c, i) => (
        <span key={i}>
          {i > 0 ? <span className="crumbs-sep" aria-hidden="true"> › </span> : null}
          {c.href && i < all.length - 1 ? <a href={c.href}>{c.name}</a> : <span aria-current={i === all.length - 1 ? "page" : undefined}>{c.name}</span>}
        </span>
      ))}
    </nav>
  );
}
