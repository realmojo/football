export type ArticleCategory = "규칙" | "대회" | "리그" | "분석";

export interface ArticleSummary {
  slug: string;
  title: string;
  description: string;
  category: ArticleCategory;
  // YYYY-MM-DD
  publishedAt: string;
  updatedAt: string;
}

export interface Article extends ArticleSummary {
  // 신뢰할 수 있는 HTML (쓰기는 service_role 만 가능)
  body: string;
}

export function formatArticleDate(value: string) {
  const [y, m, d] = value.slice(0, 10).split("-").map(Number);
  return `${y}년 ${m}월 ${d}일`;
}
