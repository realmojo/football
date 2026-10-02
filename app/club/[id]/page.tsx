import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Crest } from "@/components/Crest";
import { ErrorBox } from "@/components/ErrorBox";
import { FormBadge } from "@/components/Form";
import { MatchRow } from "@/components/MatchRow";
import { Stat } from "@/components/Stat";
import { analyzeTeam, perGame, points } from "@/lib/analysis";
import {
  getAllSeasonMatches,
  getDerbies,
  getKoreanPlayers,
  getScorers,
  getStandings,
  getTeamIntro,
  getTeamProfile,
  getTeamsByIds,
} from "@/lib/data";
import { josa } from "@/lib/josa";
import { homeCompetition, teamSchedule } from "@/lib/korean";
import { age, countryLabel, POSITION_GROUP_LABEL, positionGroup, type PositionGroup } from "@/lib/labels";
import { findLeague } from "@/lib/leagues";
import { positionsFor } from "@/lib/match";
import { SITE_URL } from "@/lib/site";
import type { Player } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

async function load(params: Params) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) return null;
  const [teams, intro] = await Promise.all([getTeamsByIds([id]), getTeamIntro(id)]);
  const team = teams.get(id);
  // 구단 소개가 있는 팀만 구단 페이지를 연다.
  if (!team || !intro) return null;
  return { id, team, intro };
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const d = await load(params).catch(() => null);
  if (!d) return {};
  const en = d.team.englishName && d.team.englishName !== d.team.name ? `(${d.team.englishName})` : "";
  const text = d.intro.intro.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  return {
    title: `${d.team.name}${en} 구단 소개 · 역사, 홈구장, 별명, 선수단`,
    description: text.length > 150 ? `${text.slice(0, 147)}...` : text,
    alternates: { canonical: `/club/${d.id}` },
  };
}

// 선수단 구성 요약
function squadSummary(squad: Player[], homeCountry: string | null) {
  const ages = squad.map((p) => age(p.dateOfBirth)).filter((a): a is number => a != null);
  const byGroup = new Map<PositionGroup, number>();
  for (const p of squad) {
    const g = positionGroup(p.position);
    if (g) byGroup.set(g, (byGroup.get(g) ?? 0) + 1);
  }
  const byNation = new Map<string, number>();
  for (const p of squad) if (p.nationality) byNation.set(p.nationality, (byNation.get(p.nationality) ?? 0) + 1);
  const nations = [...byNation.entries()].sort((a, b) => b[1] - a[1]);
  const local = homeCountry ? (byNation.get(homeCountry) ?? 0) : 0;
  const sorted = [...squad].filter((p) => p.dateOfBirth).sort((a, b) => a.dateOfBirth!.localeCompare(b.dateOfBirth!));
  return {
    count: squad.length,
    avgAge: ages.length ? ages.reduce((n, a) => n + a, 0) / ages.length : null,
    byGroup,
    nations,
    local,
    oldest: sorted[0] ?? null,
    youngest: sorted[sorted.length - 1] ?? null,
  };
}

export default async function ClubPage({ params }: { params: Params }) {
  let d: Awaited<ReturnType<typeof load>>;
  try {
    d = await load(params);
  } catch (e) {
    return <ErrorBox error={e} />;
  }
  if (!d) notFound();
  const { id, team, intro } = d;

  const [profile, matches, derbies, koreans] = await Promise.all([
    getTeamProfile(id).catch(() => null),
    getAllSeasonMatches().catch(() => []),
    getDerbies().catch(() => []),
    getKoreanPlayers().catch(() => []),
  ]);
  const code = homeCompetition(id, matches);
  const league = code ? findLeague(code) : null;
  const compMatches = code ? matches.filter((m) => m.competition === code) : [];
  const [standings, scorers] = code
    ? await Promise.all([getStandings(code).catch(() => null), getScorers(code).catch(() => [])])
    : [null, []];
  const position = positionsFor(standings, compMatches).get(id);
  const a = analyzeTeam(compMatches, id);
  const sched = teamSchedule(id, matches);
  const teamScorers = scorers.filter((s) => s.team?.id === id).slice(0, 5);
  const myDerbies = derbies.filter((x) => x.teamA === id || x.teamB === id);
  const rivalTeams = await getTeamsByIds(myDerbies.map((x) => (x.teamA === id ? x.teamB : x.teamA))).catch(() => new Map());
  const myKoreans = koreans.filter((p) => p.team?.id === id);
  // 이름 목록 끝에 붙일 조사 (마지막 이름의 받침에 맞춘다)
  const lastKorean = myKoreans[myKoreans.length - 1]?.nameKo ?? "";
  const koreanParticle = josa(lastKorean, "이/가").slice(lastKorean.length);

  // 국내 리그 국가 (자국 선수 비율 계산용)
  const COUNTRY: Record<string, string> = {
    PL: "England",
    ELC: "England",
    PD: "Spain",
    BL1: "Germany",
    SA: "Italy",
    FL1: "France",
    DED: "Netherlands",
    PPL: "Portugal",
    BSA: "Brazil",
  };
  const squad = profile?.squad ?? [];
  // 소개글 태그의 창단 연도를 우선한다(API 값이 축구부 창단 연도 등으로 다른 경우가 있다).
  const tagYear = intro.tags.map((t) => /^(\d{4})년 (재)?창단$/.exec(t)?.[1]).find(Boolean);
  const founded = tagYear ? Number(tagYear) : profile?.founded;
  const sq = squadSummary(squad, code ? (COUNTRY[code] ?? null) : null);

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "SportsTeam",
    name: team.name,
    alternateName: [team.englishName, intro.nickname].filter(Boolean),
    sport: "Soccer",
    url: `${SITE_URL}/club/${id}`,
    logo: team.crest || undefined,
    foundingDate: founded ? String(founded) : undefined,
    location: profile?.venue ? { "@type": "Place", name: profile.venue } : undefined,
    coach: profile?.coachName ? { "@type": "Person", name: profile.coachName } : undefined,
    memberOf: league ? { "@type": "SportsOrganization", name: league.name } : undefined,
  };

  return (
    <article className="review">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <p className="crumbs-bar">
        <a href="/clubs">구단 소개</a> · {league?.name ?? ""}
      </p>
      <div className="team-head">
        <Crest src={team.crest} tla={team.tla} size={72} />
        <div>
          <h1 className="player-name">
            {team.name}
            {team.englishName && team.englishName !== team.name ? <small>{team.englishName}</small> : null}
          </h1>
          <p className="team-record">
            {intro.nickname ? <b>{intro.nickname}</b> : null}
            {intro.tags.map((t) => (
              <span key={t}>{t}</span>
            ))}
          </p>
        </div>
      </div>

      <div className="cols">
        <div className="prose team-intro">
          <h2>구단 이야기</h2>
          <div dangerouslySetInnerHTML={{ __html: intro.intro }} />
          {myKoreans.length ? (
            <p>
              현재 선수단에는 한국 선수{" "}
              {myKoreans.map((p, i) => (
                <span key={p.id}>
                  {i ? ", " : ""}
                  <a href={`/player/${p.id}`}>{p.nameKo}</a>
                </span>
              ))}
              {koreanParticle} {myKoreans.length > 1 ? "함께 뛰고 있습니다." : "뛰고 있습니다."}
            </p>
          ) : null}
        </div>

        <div>
          <div className="block">
            <h3 className="block-title">구단 정보</h3>
            <ul className="facts">
              {founded ? (
                <li>
                  <span>창단</span>
                  <b>{founded}년</b>
                </li>
              ) : null}
              {profile?.venue ? (
                <li>
                  <span>홈구장</span>
                  <b>{profile.venue}</b>
                </li>
              ) : null}
              {profile?.coachName ? (
                <li>
                  <span>감독</span>
                  <b>
                    {profile.coachName} ({countryLabel(profile.coachNationality)})
                  </b>
                </li>
              ) : null}
              {profile?.clubColors ? (
                <li>
                  <span>클럽 컬러</span>
                  <b>{profile.clubColors}</b>
                </li>
              ) : null}
              {league ? (
                <li>
                  <span>리그</span>
                  <b>
                    <a href={`/${code}`}>{league.name}</a>
                  </b>
                </li>
              ) : null}
              {profile?.website ? (
                <li>
                  <span>공식 홈페이지</span>
                  <b>
                    <a href={profile.website} target="_blank" rel="noopener noreferrer">
                      {profile.website.replace(/^https?:\/\//, "").replace(/\/.*$/, "")}
                    </a>
                  </b>
                </li>
              ) : null}
            </ul>
          </div>

          {myDerbies.length ? (
            <div className="block">
              <h3 className="block-title">라이벌전</h3>
              <ul className="facts">
                {myDerbies.map((x) => {
                  const rival = rivalTeams.get(x.teamA === id ? x.teamB : x.teamA);
                  return (
                    <li key={x.slug}>
                      <a href={`/derby/${x.slug}`}>
                        <b>{x.name}</b>
                      </a>
                      <span>vs {rival?.name ?? ""}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
      </div>

      {a.overall.played ? (
        <>
          <div className="stats">
            <Stat label={`${league?.name ?? ""} 순위`} value={position ? `${position.position}위` : "-"} />
            <Stat label="승점" value={position ? String(position.points) : String(points(a.overall))} />
            <Stat label="경기당 승점" value={perGame(points(a.overall), a.overall.played)} />
            <Stat label="경기당 득점" value={perGame(a.overall.goalsFor, a.overall.played)} />
            <Stat label="경기당 실점" value={perGame(a.overall.goalsAgainst, a.overall.played)} />
            <Stat label="무실점" value={String(a.cleanSheets)} />
            <Stat label="최근 5경기" value={`${a.lastFiveRecord.won}승 ${a.lastFiveRecord.draw}무 ${a.lastFiveRecord.lost}패`} />
          </div>
          <p className="muted note club-note">
            이번 시즌 경기별 기록과 홈·원정 성적, 다음 경기 프리뷰는{" "}
            <a href={`/${code}/team/${id}`}>{team.name} 시즌 분석</a>에서 볼 수 있습니다.
          </p>
        </>
      ) : null}

      <div className="cols">
        <div className="block">
          <h3 className="block-title">다음 경기 (한국시간)</h3>
          {sched.upcoming.slice(0, 3).map((m) => (
            <MatchRow key={m.id} match={m} league={m.competition!} showDate />
          ))}
          {!sched.upcoming.length ? <p className="muted">예정된 경기가 없습니다.</p> : null}
          <h3 className="block-title">최근 결과</h3>
          {sched.recent.slice(0, 3).map((m) => (
            <MatchRow key={m.id} match={m} league={m.competition!} showDate />
          ))}
          {a.lastFive.length ? (
            <div className="form big">
              {a.lastFive.map(({ match, result }) => (
                <FormBadge key={match.id} result={result} />
              ))}
            </div>
          ) : null}
        </div>

        <div className="block">
          <h3 className="block-title">선수단 구성</h3>
          {sq.count ? (
            <ul className="facts">
              <li>
                <span>등록 선수</span>
                <b>{sq.count}명</b>
              </li>
              {sq.avgAge ? (
                <li>
                  <span>평균 나이</span>
                  <b>만 {sq.avgAge.toFixed(1)}세</b>
                </li>
              ) : null}
              <li>
                <span>포지션</span>
                <b>
                  {(["GK", "DF", "MF", "FW"] as PositionGroup[])
                    .map((g) => `${POSITION_GROUP_LABEL[g]} ${sq.byGroup.get(g) ?? 0}`)
                    .join(" · ")}
                </b>
              </li>
              <li>
                <span>국적</span>
                <b>
                  {sq.nations.length}개국
                  {sq.nations.length ? ` (${sq.nations.slice(0, 3).map(([n, c]) => `${countryLabel(n)} ${c}`).join(", ")})` : ""}
                </b>
              </li>
              {sq.local ? (
                <li>
                  <span>자국 선수 비율</span>
                  <b>{Math.round((sq.local / sq.count) * 100)}%</b>
                </li>
              ) : null}
              {sq.youngest && sq.oldest ? (
                <li>
                  <span>최연소 · 최고령</span>
                  <b>
                    {sq.youngest.name} ({age(sq.youngest.dateOfBirth)}세) · {sq.oldest.name} ({age(sq.oldest.dateOfBirth)}세)
                  </b>
                </li>
              ) : null}
            </ul>
          ) : (
            <p className="muted">선수단 정보를 아직 받지 못했습니다. 하루 안에 자동으로 채워집니다.</p>
          )}
          {teamScorers.length ? (
            <>
              <h3 className="block-title">이번 시즌 팀 내 득점 선두</h3>
              <ul className="facts">
                {teamScorers.map((s) => (
                  <li key={s.playerId}>
                    <a href={`/player/${s.playerId}`}>
                      <b>{s.name}</b>
                    </a>
                    <span>
                      {s.goals}골 {s.assists ?? 0}도움
                    </span>
                  </li>
                ))}
              </ul>
            </>
          ) : null}
        </div>
      </div>
    </article>
  );
}
