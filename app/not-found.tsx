import { LEAGUES } from "@/lib/leagues";

export default function NotFound() {
  return (
    <article className="prose">
      <header>
        <h1>페이지를 찾을 수 없습니다</h1>
        <p className="lead">주소가 바뀌었거나 없는 페이지입니다. 아래에서 보고 싶은 리그를 골라 주세요.</p>
      </header>
      <ul>
        {LEAGUES.map((l) => (
          <li key={l.code}>
            <a href={`/${l.code}`}>{l.name}</a>
          </li>
        ))}
      </ul>
      <p>
        <a href="/">홈으로 가기</a>
      </p>
    </article>
  );
}
