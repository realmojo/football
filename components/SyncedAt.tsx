import { getCompetition } from "@/lib/data";
import { formatKickoff } from "@/lib/format";

// 마지막 데이터 수집 시각
export async function SyncedAt({ code }: { code: string }) {
  const comp = await getCompetition(code).catch(() => null);
  if (!comp) return null;
  return <span className="muted small synced">업데이트 {formatKickoff(comp.synced_at)}</span>;
}
