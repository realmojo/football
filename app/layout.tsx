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
      <body>
        <header className="header">
          <div className="container">
            <a href="/" className="logo">
              ⚽ 토리코리
            </a>
            <LeagueNav />
          </div>
        </header>
        <main className="container">{children}</main>
        <footer className="container footer">
          데이터 제공: <a href="https://www.football-data.org">football-data.org</a> · 시간은 한국시간(KST) 기준
        </footer>
      </body>
    </html>
  );
}
