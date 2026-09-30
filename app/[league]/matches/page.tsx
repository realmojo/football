import Link from "next/link";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { isUpcoming } from "@/lib/analysis";
import { getSeasonMatches } from "@/lib/api";
import { formatDateHeading } from "@/lib/format";
import { findLeague } from "@/lib/leagues";
import type { Match } from "@/lib/types";

// 라운드를 지정하지 않으면 아직 끝나지 않은 가장 가까운 라운드를 보여준다.
function defaultMatchday(matches: Match[]) {
  const next = matches
    .filter((m) => isUpcoming(m) && m.matchday != null)
    .sort((a, b) => a.utcDate.localeCompare(b.utcDate))[0];
  if (next) return next.matchday!;
  return Math.max(0, ...matches.map((m) => m.matchday ?? 0)) || null;
}

function groupByDate(matches: Match[]) {
  const groups = new Map<string, Match[]>();
  for (const m of [...matches].sort((a, b) => a.utcDate.localeCompare(b.utcDate))) {
    const key = formatDateHeading(m.utcDate);
    groups.set(key, [...(groups.get(key) ?? []), m]);
  }
  return [...groups.entries()];
}

export default async function MatchesPage({
  params,
  searchParams,
}: {
  params: Promise<{ league: string }>;
  searchParams: Promise<{ matchday?: string }>;
}) {
  const { league } = await params;
  const sp = await searchParams;
  const code = findLeague(league)!.code;

  let matches: Match[];
  try {
    matches = await getSeasonMatches(code);
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const matchdays = [...new Set(matches.map((m) => m.matchday).filter((d): d is number => d != null))].sort(
    (a, b) => a - b,
  );
  const requested = Number(sp.matchday);
  const matchday = matchdays.includes(requested) ? requested : defaultMatchday(matches);
  const shown = matchday != null ? matches.filter((m) => m.matchday === matchday) : matches;
  const idx = matchday != null ? matchdays.indexOf(matchday) : -1;
  const prev = idx > 0 ? matchdays[idx - 1] : null;
  const next = idx >= 0 && idx < matchdays.length - 1 ? matchdays[idx + 1] : null;

  return (
    <section>
      {matchday != null ? (
        <div className="round-nav">
          {prev != null ? <Link href={`/${code}/matches?matchday=${prev}`}>‹ {prev}R</Link> : <span />}
          <strong>{matchday}라운드</strong>
          {next != null ? <Link href={`/${code}/matches?matchday=${next}`}>{next}R ›</Link> : <span />}
        </div>
      ) : null}

      {shown.length === 0 ? <p className="muted">경기가 없습니다.</p> : null}
      {groupByDate(shown).map(([date, list]) => (
        <div key={date} className="card">
          <h3>{date}</h3>
          {list.map((m) => (
            <MatchRow key={m.id} match={m} league={code} />
          ))}
        </div>
      ))}
    </section>
  );
}
