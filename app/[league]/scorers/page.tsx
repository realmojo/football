import type { Metadata } from "next";
import { ErrorBox } from "@/components/ErrorBox";
import { ScorerTable } from "@/components/ScorerTable";
import { getScorers } from "@/lib/data";
import { findLeague } from "@/lib/leagues";
import type { Scorer } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ league: string }> }): Promise<Metadata> {
  const info = findLeague((await params).league);
  if (!info) return {};
  return {
    title: `${info.name} 득점 순위`,
    description: `${info.name} 이번 시즌 득점 순위. 선수별 골, 도움, 페널티 골과 경기당 득점을 확인하세요.`,
    alternates: { canonical: `/${info.code}/scorers` },
  };
}

export default async function ScorersPage({ params }: { params: Promise<{ league: string }> }) {
  const info = findLeague((await params).league)!;

  let scorers: Scorer[];
  try {
    scorers = await getScorers(info.code);
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const leader = scorers[0];
  const assistLeader = [...scorers].sort((a, b) => (b.assists ?? 0) - (a.assists ?? 0))[0];

  return (
    <section>
      {leader ? (
        <div className="leaders">
          <div>
            <span>득점 1위</span>
            <strong>{leader.name}</strong>
            <em>
              {leader.goals}골{leader.team ? ` · ${leader.team.shortName || leader.team.name}` : ""}
            </em>
          </div>
          {assistLeader && (assistLeader.assists ?? 0) > 0 ? (
            <div>
              <span>득점 순위 내 도움 1위</span>
              <strong>{assistLeader.name}</strong>
              <em>
                {assistLeader.assists}도움{assistLeader.team ? ` · ${assistLeader.team.shortName || assistLeader.team.name}` : ""}
              </em>
            </div>
          ) : null}
        </div>
      ) : null}

      <div className="sec-head">
        <h2>득점 순위</h2>
      </div>
      {scorers.length ? (
        <div className="table-wrap">
          <ScorerTable scorers={scorers} league={info.code} />
        </div>
      ) : (
        <p className="muted">아직 득점 기록이 없습니다.</p>
      )}

      <div className="league-intro">
        <h2>득점 순위 보는 법</h2>
        <p>
          득점이 많은 선수부터 상위 30명을 보여줍니다. 득점이 같으면 같은 순위로 표시하고, 도움이 많은 선수를 위에
          놓습니다. PK는 득점 가운데 페널티킥으로 넣은 골 수이며, 경기당은 득점을 출전 경기 수로 나눈 값입니다.
        </p>
        <p className="muted">
          득점 순위는 약 10분마다 갱신됩니다. 기록 정정은 리그 공식 발표 후 반영되므로 시간이 걸릴 수 있습니다.
        </p>
      </div>
    </section>
  );
}
