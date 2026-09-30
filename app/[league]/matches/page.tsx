import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { isUpcoming } from "@/lib/analysis";
import { getSeasonMatches } from "@/lib/data";
import { formatDateHeading } from "@/lib/format";
import { CUP_STAGES, findLeague, groupLabel, isCup } from "@/lib/leagues";
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
  searchParams: Promise<{ matchday?: string; stage?: string }>;
}) {
  const { league } = await params;
  const sp = await searchParams;
  const info = findLeague(league)!;
  const code = info.code;

  let matches: Match[];
  try {
    matches = await getSeasonMatches(code);
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  if (isCup(info)) return <CupMatches matches={matches} code={code} stageKey={sp.stage} />;

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
          {prev != null ? <a href={`/${code}/matches?matchday=${prev}`}>← {prev}라운드</a> : <span />}
          <strong>
            {matchday}
            <small>라운드</small>
          </strong>
          {next != null ? <a href={`/${code}/matches?matchday=${next}`}>{next}라운드 →</a> : <span />}
        </div>
      ) : null}

      {shown.length === 0 ? <p className="muted">경기가 없습니다.</p> : null}
      {groupByDate(shown).map(([date, list]) => (
        <div key={date} className="block">
          <h3 className="block-title">{date}</h3>
          {list.map((m) => (
            <MatchRow key={m.id} match={m} league={code} />
          ))}
        </div>
      ))}
    </section>
  );
}

function stageMatches(matches: Match[], s: (typeof CUP_STAGES)[number]) {
  return matches.filter((m) => m.stage === s.stage && (!("matchday" in s) || m.matchday === s.matchday));
}

// 컵대회: 조별리그 1~3차전, 32강 … 결승 단위로 본다.
function CupMatches({ matches, code, stageKey }: { matches: Match[]; code: string; stageKey?: string }) {
  const stages = CUP_STAGES.filter((s) => stageMatches(matches, s).length);
  const firstUnfinished = stages.find((s) => stageMatches(matches, s).some(isUpcoming));
  const current = stages.find((s) => s.key === stageKey) ?? firstUnfinished ?? stages[stages.length - 1];
  const shown = current ? stageMatches(matches, current) : [];

  return (
    <section>
      <nav className="stage-nav">
        {stages.map((s) => (
          <a key={s.key} href={`/${code}/matches?stage=${s.key}`} className={s.key === current?.key ? "active" : ""}>
            {s.short}
          </a>
        ))}
      </nav>
      {current ? <h2 className="stage-title">{current.label}</h2> : null}
      {shown.length === 0 ? <p className="muted">경기가 없습니다.</p> : null}
      {groupByDate(shown).map(([date, list]) => (
        <div key={date} className="block">
          <h3 className="block-title">{date}</h3>
          {list.map((m) => (
            <div key={m.id} className="tagged">
              {m.group ? <span className="tag">{groupLabel(m.group)}</span> : null}
              <MatchRow match={m} league={code} />
            </div>
          ))}
        </div>
      ))}
    </section>
  );
}
