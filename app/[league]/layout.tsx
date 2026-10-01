import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { SubNav } from "@/components/SubNav";
import { SyncedAt } from "@/components/SyncedAt";
import { findLeague, isCup, leagueEmblem } from "@/lib/leagues";

// 제목과 대표 주소(canonical)는 하위 페이지마다 따로 정한다. 여기서 정하면 일정·결과 같은
// 하위 페이지가 순위 페이지를 원본으로 가리키게 되어 검색에 따로 잡히지 않는다.

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
