import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { Stat } from "@/components/Stat";
import { getAllSeasonMatches, getKoreanPlayers, type KoreanPlayer } from "@/lib/data";
import { homeCompetition, teamSchedule, totalAssists, totalGoals } from "@/lib/korean";
import { josa } from "@/lib/josa";
import { age, positionLabel } from "@/lib/labels";
import { findLeague } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function findPlayer(params: Params) {
  const id = Number((await params).id);
  const players = await getKoreanPlayers();
  return { player: players.find((p) => p.id === id) ?? null, players };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { player } = await findPlayer(params).catch(() => ({ player: null }));
  if (!player) return {};
  const team = player.team?.name;
  return {
    title: `${player.nameKo} 경기 일정 · 이번 시즌 기록${team ? ` (${team})` : ""}`,
    description: `${player.nameKo}${player.nameEn ? `(${player.nameEn})` : ""}${team ? ` - ${team} 소속` : ""}. 소속팀 다음 경기 한국시간 일정, 최근 결과, 이번 시즌 골·도움과 경력, 관전 포인트를 정리했습니다.`,
    alternates: { canonical: `/player/${player.id}` },
  };
}

function leagueName(code: string) {
  return findLeague(code)?.name ?? code;
}

export default async function PlayerPage({ params }: { params: Params }) {
  let player: KoreanPlayer | null;
  let players: KoreanPlayer[];
  let matches: Match[];
  try {
    [{ player, players }, matches] = await Promise.all([findPlayer(params), getAllSeasonMatches()]);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!player) notFound();

  const team = player.team;
  const code = team ? homeCompetition(team.id, matches) : null;
  const sched = team ? teamSchedule(team.id, matches) : { upcoming: [], recent: [] };
  const recent = sched.recent.slice(0, 5);
  const record = recent.reduce(
    (r, m) => {
      const home = m.homeTeam.id === team!.id;
      const gf = (home ? m.score.fullTime.home : m.score.fullTime.away) ?? 0;
      const ga = (home ? m.score.fullTime.away : m.score.fullTime.home) ?? 0;
      return gf > ga ? { ...r, w: r.w + 1 } : gf < ga ? { ...r, l: r.l + 1 } : { ...r, d: r.d + 1 };
    },
    { w: 0, d: 0, l: 0 },
  );
  const goals = totalGoals(player);
  const assists = totalAssists(player);
  const others = players.filter((p) => p.id !== player.id);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.nameKo,
    alternateName: player.nameEn ?? undefined,
    birthDate: player.dateOfBirth ?? undefined,
    nationality: "대한민국",
    jobTitle: "축구 선수",
    url: `${SITE_URL}/player/${player.id}`,
    memberOf: team ? { "@type": "SportsTeam", name: team.name, alternateName: team.englishName } : undefined,
  };

  return (
    <article className="review">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs-bar">
        <a href="/korean-players">해외파 한국 선수</a> · {player.nameKo}
      </p>
      <div className="team-head">
        {team ? <Crest src={team.crest} tla={team.tla} size={64} /> : null}
        <div>
          <h1 className="player-name">
            {player.nameKo}
            {player.nameEn ? <small>{player.nameEn}</small> : null}
          </h1>
          <p className="team-record">
            {team ? (
              code ? (
                <a href={`/${code}/team/${team.id}`}>
                  <b>{team.name}</b>
                </a>
              ) : (
                <b>{team.name}</b>
              )
            ) : (
              <b>소속팀 정보 없음</b>
            )}
            <span>{positionLabel(player.position)}</span>
            {age(player.dateOfBirth) != null ? <span>만 {age(player.dateOfBirth)}세</span> : null}
          </p>
        </div>
      </div>

      <div className="stats">
        <Stat label="이번 시즌 골" value={String(goals)} />
        <Stat label="도움" value={String(assists)} />
        <Stat label="공격 포인트" value={String(goals + assists)} />
        <Stat
          label="PK 골"
          value={String(player.scoring.reduce((n, s) => n + (s.penalties ?? 0), 0))}
        />
        <Stat label="소속팀 최근 5경기" value={`${record.w}승 ${record.d}무 ${record.l}패`} />
        <Stat label="남은 소속팀 경기" value={String(sched.upcoming.length)} />
        <Stat label="대회" value={String(new Set([...sched.upcoming, ...sched.recent].map((m) => m.competition)).size)} />
      </div>

      <div className="cols">
        <div className="prose team-intro">
          <h2>경력과 관전 포인트</h2>
          {player.intro ? (
            <div dangerouslySetInnerHTML={{ __html: player.intro }} />
          ) : (
            <p>
              {josa(player.nameKo, "은/는")}{" "}
              {team ? `${team.name} 소속` : "소속팀 정보가 없는"} {positionLabel(player.position)}
              {age(player.dateOfBirth) != null ? `로, 만 ${age(player.dateOfBirth)}세입니다.` : "입니다."} 토리코리는 매일 받아오는
              선수단 정보를 바탕으로 소속팀의 경기 일정과 결과를 한국시간으로 정리하고 있습니다. 자세한 경력 소개는 곧 추가할
              예정입니다.
            </p>
          )}
          {player.scoring.length ? (
            <p>
              이번 시즌 대회별 기록:{" "}
              {player.scoring
                .map((s) => `${leagueName(s.competition)} ${s.goals}골 ${s.assists ?? 0}도움`)
                .join(", ")}
              .
            </p>
          ) : (
            <p className="muted">
              아직 리그 득점 순위 상위 30명 안에 든 기록은 없습니다. 수비수나 수비형 미드필더는 공격 포인트보다 소속팀의 실점
              기록으로 활약을 가늠하는 편이 좋습니다.
            </p>
          )}
        </div>

        <div>
          <div className="block">
            <h3 className="block-title">소속팀 다음 경기 (한국시간)</h3>
            {sched.upcoming.length ? (
              sched.upcoming.slice(0, 5).map((m) => (
                <div key={m.id} className="tagged">
                  <span className="tag">{leagueName(m.competition!)}</span>
                  <MatchRow match={m} league={m.competition!} showDate />
                </div>
              ))
            ) : (
              <p className="muted">예정된 경기가 없습니다.</p>
            )}
          </div>
          <div className="block">
            <h3 className="block-title">소속팀 최근 결과</h3>
            {recent.length ? (
              recent.map((m) => (
                <div key={m.id} className="tagged">
                  <span className="tag">{leagueName(m.competition!)}</span>
                  <MatchRow match={m} league={m.competition!} showDate />
                </div>
              ))
            ) : (
              <p className="muted">최근 경기 결과가 없습니다.</p>
            )}
          </div>
        </div>
      </div>

      {others.length ? (
        <div className="block">
          <h3 className="block-title">다른 해외파 한국 선수</h3>
          <nav className="round-links">
            {others.map((p) => (
              <a key={p.id} href={`/player/${p.id}`}>
                {p.nameKo}
                {p.team ? ` · ${p.team.shortName}` : ""}
              </a>
            ))}
          </nav>
        </div>
      ) : null}
    </article>
  );
}
