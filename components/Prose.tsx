// 소개·정책 같은 글 위주 페이지의 공통 틀
export function Prose({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <article className="prose">
      <header>
        <h1>{title}</h1>
        {lead ? <p className="lead">{lead}</p> : null}
      </header>
      {children}
    </article>
  );
}
