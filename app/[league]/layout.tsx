import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { SubNav } from "@/components/SubNav";
import { SyncedAt } from "@/components/SyncedAt";
import { findLeague, isCup, leagueEmblem } from "@/lib/leagues";

export async function generateMetadata({ params }: { params: Promise<{ league: string }> }): Promise<Metadata> {
  const info = findLeague((await params).league);
  if (!info) return {};
  return {
    title: isCup(info) ? `${info.country} ${info.name} 조별리그 순위 · 경기 결과` : `${info.name} 순위 · 일정 · 결과`,
    description: isCup(info)
      ? `${info.country} ${info.name} 조별리그 순위, 토너먼트 대진표, 전 경기 결과와 득점 순위.`
      : `${info.name} 순위표, 라운드별 일정과 경기 결과, 팀별 최근 폼과 홈·원정 성적 분석.`,
    alternates: { canonical: `/${info.code}` },
  };
}

export default async function LeagueLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ league: string }>;
}) {
  const { league } = await params;
  const info = findLeague(league);
  if (!info) notFound();

  return (
    <>
      <div className="league-head">
        <Crest src={isCup(info) ? "https://crests.football-data.org/wm26.png" : leagueEmblem(info.code)} tla={info.code} size={40} />
        <div>
          <p className="eyebrow">{info.country}</p>
          <h1>{info.name}</h1>
        </div>
        <SyncedAt code={info.code} />
      </div>
      <SubNav league={info.code} cup={isCup(info)} />
      {children}
    </>
  );
}
