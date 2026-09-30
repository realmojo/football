import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { bracketRounds, winnerOf } from "@/lib/cup";
import { getSeasonMatches } from "@/lib/data";
import { formatDay } from "@/lib/format";
import { findLeague, isCup } from "@/lib/leagues";
import type { Match, Team } from "@/lib/types";

export async function generateMetadata({ params }: { params: Promise<{ league: string }> }): Promise<Metadata> {
  const info = findLeague((await params).league);
  if (!info || !isCup(info)) return {};
  return {
    title: `${info.country} ${info.name} 토너먼트 대진표`,
    description: `${info.country} ${info.name} 32강부터 결승까지 토너먼트 대진표와 경기 결과, 연장·승부차기 기록.`,
    alternates: { canonical: `/${info.code}/bracket` },
  };
}

export default async function BracketPage({ params }: { params: Promise<{ league: string }> }) {
  const info = findLeague((await params).league);
  if (!info || !isCup(info)) notFound();

  let matches: Match[];
  try {
    matches = await getSeasonMatches(info.code);
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const rounds = bracketRounds(matches).filter((r) => r.matches.length);
  const third = matches.find((m) => m.stage === "THIRD_PLACE");

  if (!rounds.length) return <p className="muted">토너먼트 대진이 아직 정해지지 않았습니다.</p>;

  return (
    <section>
      <div className="sec-head">
        <h2>토너먼트 대진표</h2>
      </div>
      <div className="bracket-scroll">
        <div className="bracket" style={{ gridTemplateColumns: `repeat(${rounds.length}, minmax(180px, 1fr))` }}>
          {rounds.map((r) => (
            <div key={r.round} className="bracket-round">
              <h3>{r.label}</h3>
              <div className="bracket-matches">
                {r.matches.map((m) => (
                  <BracketMatch key={m.id} match={m} league={info.code} />
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
      <p className="muted small-note">
        화면이 좁으면 대진표를 옆으로 밀어서 볼 수 있습니다. 팀 이름을 누르면 그 팀의 대회 기록을 볼 수 있습니다.
      </p>

      {third ? (
        <div className="block third-match">
          <h3 className="block-title">3·4위전</h3>
          <MatchRow match={third} league={info.code} showDate />
        </div>
      ) : null}
    </section>
  );
}

function BracketMatch({ match, league }: { match: Match; league: string }) {
  const winner = winnerOf(match);
  const pens = match.score.penalties;
  const done = match.status === "FINISHED" || match.status === "AWARDED";
  const note = pens && pens.home != null ? `승부차기 ${pens.home}-${pens.away}` : match.score.duration === "EXTRA_TIME" ? "연장" : null;
  return (
    <div className="bm">
      <div className="bm-date">
        {formatDay(match.utcDate)}
        {note ? <em>{note}</em> : null}
      </div>
      <BracketTeam team={match.homeTeam} score={done ? match.score.fullTime.home : null} won={winner?.id === match.homeTeam.id} league={league} />
      <BracketTeam team={match.awayTeam} score={done ? match.score.fullTime.away : null} won={winner?.id === match.awayTeam.id} league={league} />
    </div>
  );
}

function BracketTeam({ team, score, won, league }: { team: Team; score: number | null; won: boolean; league: string }) {
  return (
    <a href={`/${league}/team/${team.id}`} className={`bm-team${won ? " won" : ""}`}>
      <Crest src={team.crest} tla={team.tla} size={18} />
      <span className="bm-name">{team.shortName || team.name}</span>
      <b>{score ?? "-"}</b>
    </a>
  );
}
