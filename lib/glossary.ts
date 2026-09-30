// 용어 사전 본문(HTML)에서 태그를 걷어낸 글과 첫 문장
export function plainText(html: string) {
  return html.replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

export function firstSentence(html: string) {
  const text = plainText(html);
  const end = text.indexOf("다. ");
  return end > 0 ? text.slice(0, end + 2) : text;
}
