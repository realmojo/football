import type { Metadata } from "next";
import { LeagueNav } from "@/components/LeagueNav";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://toricori.com"),
  title: {
    default: "토리코리 - 해외축구 순위, 일정, 결과 분석",
    template: "%s | 토리코리",
  },
  description: "프리미어리그, 라리가, 분데스리가, 세리에 A, 리그 1, 챔피언스리그 순위와 일정, 경기 결과, 팀 분석을 한눈에.",
  applicationName: "토리코리",
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
      </head>
      <body>
        <header className="masthead">
          <div className="container masthead-inner">
            <a href="/" className="brand">
              토리코리
              <small>TORICORI</small>
            </a>
            <LeagueNav />
          </div>
        </header>
        <main className="container page">{children}</main>
        <footer className="footer">
          <div className="container">
            <strong>토리코리</strong> 해외축구 순위 · 일정 · 결과
            <span>
              데이터 <a href="https://www.football-data.org">football-data.org</a> · 한국시간(KST) 기준
            </span>
          </div>
        </footer>
      </body>
    </html>
  );
}
