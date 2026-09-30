import { getCompetition } from "@/lib/data";
import { formatKickoff } from "@/lib/format";
import { findLeague, isCup } from "@/lib/leagues";

// 마지막 데이터 수집 시각
export async function SyncedAt({ code }: { code: string }) {
  const comp = await getCompetition(code).catch(() => null);
  if (!comp) return null;
  return (
    <p className="synced">
      {comp.current_matchday && !isCup(findLeague(code) ?? { kind: "league" }) ? (
        <strong>{comp.current_matchday}R</strong>
      ) : null}
      <span>{formatKickoff(comp.synced_at)} 업데이트</span>
    </p>
  );
}
