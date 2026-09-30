import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { MatchRow } from "@/components/MatchRow";
import { scorerRank } from "@/components/ScorerTable";
import { Stat } from "@/components/Stat";
import {
  getAllSeasonMatches,
  getKoreanPlayers,
  getPlayerDetail,
  getScorers,
  getStandings,
  type PlayerDetail,
} from "@/lib/data";
import { homeCompetition, teamSchedule, totalAssists, totalGoals } from "@/lib/korean";
import { josa } from "@/lib/josa";
import { age, countryLabel, positionLabel } from "@/lib/labels";
import { findLeague } from "@/lib/leagues";
import { SITE_URL } from "@/lib/site";
import type { Match, Scorer } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function findPlayer(params: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return null;
  return getPlayerDetail(id);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const player = await findPlayer(params).catch(() => null);
  if (!player) return {};
  const team = player.team?.name;
  const goals = totalGoals(player);
  const assists = totalAssists(player);
  const en = player.nameEn && player.nameEn !== player.nameKo ? `(${player.nameEn})` : "";
  return {
    title: `${player.nameKo}${en} 이번 시즌 기록 · 골 ${goals} 도움 ${assists}${team ? ` · ${team}` : ""}`,
    description: `${player.nameKo}${en}${team ? ` - ${team} 소속` : ""}. 이번 시즌 대회별 골·도움·PK 기록과 리그 득점 순위, 팀 득점 기여도, 소속팀 다음 경기 한국시간 일정과 최근 결과를 정리했습니다.`,
    alternates: { canonical: `/player/${player.id}` },
  };
}

function leagueName(code: string) {
  return findLeague(code)?.name ?? code;
}

interface CompetitionLine {
  code: string;
  goals: number;
  assists: number;
  penalties: number;
  played: number | null;
  rank: number | null;
  teamGoals: number | null;
}

// 기록으로 쓰는 이번 시즌 분석 문단
function seasonParagraphs(lines: CompetitionLine[]): string[] {
  return lines.map((l) => {
    const parts: string[] = [];
    parts.push(
      `${leagueName(l.code)}에서 ${l.goals}골 ${l.assists}도움을 기록 중입니다` +
        (l.rank ? `(득점 순위 ${l.rank}위)` : "") +
        (l.played ? `. ${l.played}경기에서 경기당 ${(l.goals / l.played).toFixed(2)}골 페이스입니다.` : "."),
    );
    // 표본이 작을 때(3경기 이하)는 비율 해석을 붙이지 않는다.
    if (l.teamGoals && l.goals && (l.played ?? 0) >= 4) {
      const share = Math.round((l.goals / l.teamGoals) * 100);
      parts.push(
        `팀이 이 대회에서 넣은 ${l.teamGoals}골 가운데 ${share}%를 책임졌습니다.` +
          (share >= 35
            ? " 팀 공격이 한 선수에게 크게 기대고 있다는 뜻이라, 이 선수가 빠지는 경기에서는 팀 득점력이 눈에 띄게 떨어질 수 있습니다."
            : share <= 15
              ? " 여러 선수가 골을 나눠 넣는 팀이라 득점 부담이 한 사람에게 몰려 있지 않습니다."
              : ""),
      );
    }
    if (l.goals >= 3 && l.penalties / l.goals >= 0.4) {
      parts.push(`골의 ${Math.round((l.penalties / l.goals) * 100)}%가 페널티킥이라, 필드골 페이스는 기록보다 낮게 보는 편이 정확합니다.`);
    }
    if (l.assists > l.goals && l.assists >= 2) {
      parts.push("골보다 도움이 많아, 직접 마무리하기보다 동료의 득점을 만드는 역할에 더 무게가 실려 있습니다.");
    }
    if (l.played && l.played >= 4 && l.goals / l.played >= 0.8) {
      parts.push("경기당 0.8골이 넘는 페이스는 시즌 끝까지 이어지면 득점왕 경쟁에 충분한 수준입니다.");
    }
    return parts.join(" ");
  });
}

export default async function PlayerPage({ params }: { params: Params }) {
  let player: PlayerDetail | null;
  let matches: Match[];
  let koreans: Awaited<ReturnType<typeof getKoreanPlayers>>;
  try {
    [player, matches, koreans] = await Promise.all([findPlayer(params), getAllSeasonMatches(), getKoreanPlayers()]);
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

  // 대회별 득점 순위와 팀 득점
  const byCode = new Map<string, Scorer[]>();
  const lines: CompetitionLine[] = await Promise.all(
    player.scoring.map(async (s) => {
      const [list, standings] = await Promise.all([
        getScorers(s.competition).catch(() => [] as Scorer[]),
        getStandings(s.competition).catch(() => null),
      ]);
      byCode.set(s.competition, list);
      const i = list.findIndex((x) => x.playerId === player.id);
      const teamRow = standings?.standings
        .find((st) => st.type === "TOTAL" && st.table.some((r) => r.team.id === team?.id))
        ?.table.find((r) => r.team.id === team?.id);
      return {
        code: s.competition,
        goals: s.goals,
        assists: s.assists ?? 0,
        penalties: s.penalties ?? 0,
        played: s.playedMatches,
        rank: i >= 0 ? scorerRank(list, i) : null,
        teamGoals: teamRow?.goalsFor ?? null,
      };
    }),
  );
  const mainCode = lines.find((l) => l.code !== "CL")?.code ?? lines[0]?.code ?? null;
  const mainRank = lines.find((l) => l.code === mainCode)?.rank ?? null;
  const rivals = mainCode ? (byCode.get(mainCode) ?? []).filter((s) => s.playerId !== player.id).slice(0, 12) : [];
  const otherKoreans = player.korean ? koreans.filter((p) => p.id !== player.id) : [];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Person",
    name: player.nameKo,
    alternateName: player.nameEn ?? undefined,
    birthDate: player.dateOfBirth ?? undefined,
    nationality: player.korean ? "대한민국" : player.nationality ? countryLabel(player.nationality) : undefined,
    jobTitle: "축구 선수",
    url: `${SITE_URL}/player/${player.id}`,
    memberOf: team ? { "@type": "SportsTeam", name: team.name, alternateName: team.englishName } : undefined,
  };

  return (
    <article className="review">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs-bar">
        {player.korean ? <a href="/korean-players">해외파 한국 선수</a> : <a href="/players">득점 선수</a>} ·{" "}
        {player.nameKo}
      </p>
      <div className="team-head">
        {team ? <Crest src={team.crest} tla={team.tla} size={64} /> : null}
        <div>
          <h1 className="player-name">
            {player.nameKo}
            {player.nameEn && player.nameEn !== player.nameKo ? <small>{player.nameEn}</small> : null}
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
            {player.nationality ? <span>{countryLabel(player.nationality)}</span> : null}
            {age(player.dateOfBirth) != null ? <span>만 {age(player.dateOfBirth)}세</span> : null}
          </p>
        </div>
      </div>

      <div className="stats">
        <Stat label="이번 시즌 골" value={String(goals)} />
        <Stat label="도움" value={String(assists)} />
        <Stat label="공격 포인트" value={String(goals + assists)} />
        <Stat label="PK 골" value={String(player.scoring.reduce((n, s) => n + (s.penalties ?? 0), 0))} />
        <Stat label="리그 득점 순위" value={mainRank ? `${mainRank}위` : "-"} />
        <Stat label="소속팀 최근 5경기" value={`${record.w}승 ${record.d}무 ${record.l}패`} />
        <Stat label="남은 소속팀 경기" value={String(sched.upcoming.length)} />
      </div>

      <div className="cols">
        <div className="prose team-intro">
          <h2>{player.intro ? "경력과 관전 포인트" : "이번 시즌 분석"}</h2>
          {player.intro ? (
            <div dangerouslySetInnerHTML={{ __html: player.intro }} />
          ) : (
            <p>
              {josa(player.nameKo, "은/는")} {team ? `${team.name} 소속` : "소속팀 정보가 없는"}{" "}
              {player.nationality ? `${countryLabel(player.nationality)} 출신 ` : ""}
              {positionLabel(player.position)}
              {age(player.dateOfBirth) != null ? `로, 만 ${age(player.dateOfBirth)}세입니다.` : "입니다."}
            </p>
          )}
          {seasonParagraphs(lines).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
          {lines.length ? (
            <p className="muted">
              기록은 각 대회 득점 순위(상위 30명)를 기준으로 하며, 약 10분마다 갱신됩니다. 순위표에서 밀려나면 기록이 보이지
              않을 수 있습니다.
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

      {rivals.length ? (
        <div className="block">
          <h3 className="block-title">{leagueName(mainCode!)} 득점 경쟁자</h3>
          <nav className="round-links">
            {rivals.map((s) => (
              <a key={s.playerId} href={`/player/${s.playerId}`}>
                {s.name} {s.goals}골{s.team ? ` · ${s.team.shortName}` : ""}
              </a>
            ))}
          </nav>
        </div>
      ) : null}

      {otherKoreans.length ? (
        <div className="block">
          <h3 className="block-title">다른 해외파 한국 선수</h3>
          <nav className="round-links">
            {otherKoreans.map((p) => (
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
