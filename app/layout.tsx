import type { Metadata } from "next";
import { LeagueNav } from "@/components/LeagueNav";
import "./globals.css";

export const metadata: Metadata = {
  title: "해외축구 분석",
  description: "해외축구 리그 순위, 일정, 경기 결과와 팀 분석",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>
        <header className="header">
          <div className="container">
            <a href="/" className="logo">
              ⚽ 해외축구 분석
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
