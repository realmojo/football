"use client"; // 루트 레이아웃까지 실패했을 때 쓰는 화면. 전역 스타일이 적용되지 않으므로 인라인 스타일을 쓴다.

export default function GlobalError({ error, retry }: { error: Error & { digest?: string }; retry: () => void }) {
  return (
    <html lang="ko">
      <body style={{ margin: 0, fontFamily: "system-ui, sans-serif", background: "#f5f3ee", color: "#0e1a2b" }}>
        <title>일시적인 오류 | 토리코리</title>
        <div style={{ background: "#0e1a2b", color: "#fff", padding: "14px 20px", fontWeight: 900 }}>토리코리</div>
        <main style={{ maxWidth: 640, margin: "48px auto", padding: "0 20px", lineHeight: 1.7 }}>
          <h1 style={{ fontSize: 24 }}>일시적인 오류가 발생했습니다</h1>
          <p>잠시 후 다시 시도해 주세요. 문제가 계속되면 contact@toricori.com 으로 알려 주시면 확인하겠습니다.</p>
          <p>
            <button
              type="button"
              onClick={() => retry()}
              style={{ padding: "8px 16px", fontWeight: 700, border: "1px solid #0e1a2b", background: "#ffc629", cursor: "pointer" }}
            >
              다시 시도
            </button>{" "}
            <a href="/" style={{ color: "#0e1a2b", marginLeft: 8 }}>
              홈으로 가기
            </a>
          </p>
          {error.digest ? <p style={{ color: "#6b7280", fontSize: 13 }}>오류 코드 {error.digest}</p> : null}
        </main>
      </body>
    </html>
  );
}
