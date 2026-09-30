import type { Metadata } from "next";
import Image from "next/image";
import { LeagueNav } from "@/components/LeagueNav";
import { ADSENSE_CLIENT } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://toricori.com"),
  title: {
    default: "토리코리 - 해외축구 순위, 일정, 결과 분석",
    template: "%s | 토리코리",
  },
  description: "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그 순위와 일정, 경기 결과, 팀 분석을 한눈에.",
  applicationName: "토리코리",
  verification: {
    other: {
      "naver-site-verification": "2abf5815d1275fde30cd6248ff5775067484a1c8",
    },
  },
  openGraph: {
    siteName: "토리코리",
    type: "website",
    locale: "ko_KR",
    url: "https://toricori.com",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css"
        />
        {/* Google tag (gtag.js) */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-XZ0HSLNP7B" />
        <script
          dangerouslySetInnerHTML={{
            __html: `window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', 'G-XZ0HSLNP7B');`,
          }}
        />
        {ADSENSE_CLIENT ? <meta name="google-adsense-account" content={ADSENSE_CLIENT} /> : null}
        {ADSENSE_CLIENT ? (
          <script
            async
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ADSENSE_CLIENT}`}
            crossOrigin="anonymous"
          />
        ) : null}
      </head>
      <body>
        <header className="masthead">
          <div className="container masthead-inner">
            <a href="/" className="brand" aria-label="토리코리 홈">
              <Image src="/brand/toricori-logo.png" alt="" width={36} height={36} className="brand-mark" unoptimized loading="eager" />
              <span className="brand-wordmark">토리코리<small>TORICORI</small></span>
            </a>
            <LeagueNav />
          </div>
        </header>
        <main className="container page">{children}</main>
        <footer className="footer">
          <div className="container">
            <div className="footer-top">
              <a href="/" className="footer-brand" aria-label="토리코리 홈">
                <Image src="/brand/toricori-logo.png" alt="" width={24} height={24} unoptimized />
                <strong>토리코리</strong>
              </a>
              <nav className="footer-nav">
                <a href="/about">사이트 소개</a>
                <a href="/schedule">해외축구 일정</a>
                <a href="/korean-players">해외파 한국 선수</a>
                <a href="/players">득점 선수</a>
                <a href="/leagues">전체 리그</a>
                <a href="/archive">시즌 기록실</a>
                <a href="/articles">축구 칼럼</a>
                <a href="/stats">5대 리그 통계</a>
                <a href="/glossary">축구 용어 사전</a>
                <a href="/guide">이용 가이드</a>
                <a href="/privacy">개인정보처리방침</a>
                <a href="/terms">이용약관</a>
                <a href="/contact">문의하기</a>
              </nav>
            </div>
            <p>
              해외축구 순위 · 일정 · 결과와 팀 분석. 경기 데이터는{" "}
              <a href="https://www.football-data.org">football-data.org</a> 에서 제공받으며, 모든 시간은
              한국시간(KST) 기준입니다.
            </p>
            <p>© 2026 토리코리 (toricori.com)</p>
          </div>
        </footer>
        {/* 네이버 애널리틱스 */}
        <script type="text/javascript" src="https://wcs.pstatic.net/wcslog.js" />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `if(!wcs_add) var wcs_add = {};
wcs_add["wa"] = "1225732732ef530";
if(window.wcs) {
  wcs_do();
}`,
          }}
        />
      </body>
    </html>
  );
}
