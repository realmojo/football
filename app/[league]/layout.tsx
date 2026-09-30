import { notFound } from "next/navigation";
import { SubNav } from "@/components/SubNav";
import { findLeague } from "@/lib/leagues";

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
        <h1>{info.name}</h1>
        <span className="muted">{info.country}</span>
      </div>
      <SubNav league={info.code} />
      {children}
    </>
  );
}
