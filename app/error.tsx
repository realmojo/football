"use client"; // 오류 경계는 클라이언트 컴포넌트여야 한다.

import { useEffect } from "react";

export default function Error({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <article className="prose">
      <header>
        <h1>페이지를 불러오지 못했습니다</h1>
        <p className="lead">
          일시적인 문제로 화면을 그리지 못했습니다. 경기 데이터를 새로 받아오는 중이거나 잠시 연결이 불안정했을 수
          있습니다.
        </p>
      </header>
      <p>
        <button type="button" className="retry-btn" onClick={() => retry()}>
          다시 시도
        </button>
      </p>
      <p>
        문제가 계속되면 <a href="/">홈</a>으로 돌아가거나 <a href="/contact">문의하기</a>로 알려 주세요.
        {error.digest ? <span className="muted"> (오류 코드 {error.digest})</span> : null}
      </p>
    </article>
  );
}
