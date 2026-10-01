import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Article, ArticleSummary } from "./articles";
import { nationName } from "./labels";
import { LEAGUES } from "./leagues";
import type { Match, MatchStatus, Player, Scorer, Standing, StandingsResponse, Team, TeamProfile } from "./types";

// 화면은 football-data.org 를 직접 호출하지 않고, Supabase football-sync 가 모아둔 데이터를 읽는다.
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
  { auth: { persistSession: false } },
);

export class DataError extends Error {
  constructor(
    public kind: "not_synced" | "db",
    message: string,
  ) {
    super(message);
  }
}

interface TeamRow {
  id: number;
  name: string;
  short_name: string | null;
  tla: string | null;
  crest: string | null;
  name_ko: string | null;
  short_name_ko: string | null;
}

const TEAM_COLUMNS = "id, name, short_name, tla, crest, name_ko, short_name_ko";

function toTeam(t: TeamRow): Team {
  // 대표팀은 한글 국가명, 클럽은 한글 이름이 있으면 한글로 보여준다.
  const nation = nationName(t.name);
  return {
    id: t.id,
    name: nation ?? t.name_ko ?? t.name,
    shortName: nation ?? t.short_name_ko ?? t.name_ko ?? t.short_name ?? t.name,
    englishName: t.name,
    tla: t.tla ?? "",
    crest: t.crest ?? "",
  };
}

// football-data.org 는 승부차기 경기의 fullTime 에 승부차기 골을 더해서 준다. 화면에는 연장까지의 스코어를 쓴다.
function sumOrNull(a: number | null, b: number | null) {
  return a == null ? null : a + (b ?? 0);
}

export interface Competition {
  code: string;
  id: number;
  name: string;
  emblem: string | null;
  season_id: number;
  season_start: string;
  season_end: string;
  current_matchday: number | null;
  synced_at: string;
}

export const getCompetition = cache(async (code: string): Promise<Competition> => {
  const { data, error } = await supabase.from("football_competitions").select("*").eq("code", code).maybeSingle();
  if (error) throw new DataError("db", error.message);
  if (!data) throw new DataError("not_synced", "아직 수집된 데이터가 없습니다.");
  return data as Competition;
});

export const getStandings = cache(async (code: string): Promise<StandingsResponse> => {
  const comp = await getCompetition(code);
  const { data, error } = await supabase
    .from("football_standings")
    .select(`*, team:football_teams(${TEAM_COLUMNS})`)
    .eq("competition_code", code)
    .eq("season_id", comp.season_id)
    .order("position");
  if (error) throw new DataError("db", error.message);

  const groups = new Map<string, Standing>();
  for (const r of data ?? []) {
    const key = `${r.stage}|${r.type}|${r.group_name}`;
    if (!groups.has(key)) {
      groups.set(key, { stage: r.stage, type: r.type, group: r.group_name || null, table: [] });
    }
    groups.get(key)!.table.push({
      position: r.position,
      team: toTeam(r.team as TeamRow),
      playedGames: r.played,
      form: r.form,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      points: r.points,
      goalsFor: r.goals_for,
      goalsAgainst: r.goals_against,
      goalDifference: r.goal_difference,
    });
  }

  return {
    competition: { id: comp.id, name: comp.name, code: comp.code, emblem: comp.emblem ?? "" },
    season: {
      id: comp.season_id,
      startDate: comp.season_start,
      endDate: comp.season_end,
      currentMatchday: comp.current_matchday,
    },
    standings: [...groups.values()],
  };
});

export const getSeasonMatches = cache(async (code: string): Promise<Match[]> => {
  const comp = await getCompetition(code);
  const { data, error } = await supabase
    .from("football_matches")
    .select(
      `*, home:football_teams!football_matches_home_team_id_fkey(${TEAM_COLUMNS}), away:football_teams!football_matches_away_team_id_fkey(${TEAM_COLUMNS})`,
    )
    .eq("competition_code", code)
    .eq("season_id", comp.season_id)
    .order("utc_date");
  if (error) throw new DataError("db", error.message);

  return (data ?? [])
    .filter((m) => m.home && m.away) // 대진 미정 경기 제외
    .map((m) => ({
      id: m.id,
      utcDate: m.utc_date,
      status: m.status as MatchStatus,
      matchday: m.matchday,
      stage: m.stage ?? "",
      homeTeam: toTeam(m.home as TeamRow),
      awayTeam: toTeam(m.away as TeamRow),
      group: m.group_name,
      score: {
        winner: m.winner,
        fullTime:
          m.duration && m.duration !== "REGULAR" && m.home_regular != null
            ? { home: sumOrNull(m.home_regular, m.home_extra), away: sumOrNull(m.away_regular, m.away_extra) }
            : { home: m.home_score, away: m.away_score },
        halfTime: { home: m.home_half, away: m.away_half },
        duration: m.duration,
        penalties: m.duration === "PENALTY_SHOOTOUT" ? { home: m.home_pen, away: m.away_pen } : null,
      },
    }));
});

// 선수 한글 이름: 선수 소개(한국 선수)와 한글 이름 표를 합친다.
export const getPlayerNames = cache(async (): Promise<Map<number, string>> => {
  const [names, profiles] = await Promise.all([
    supabase.from("football_player_names").select("player_id, name_ko"),
    supabase.from("football_player_profiles").select("player_id, name_ko"),
  ]);
  if (names.error) throw new DataError("db", names.error.message);
  if (profiles.error) throw new DataError("db", profiles.error.message);
  return new Map([...(names.data ?? []), ...(profiles.data ?? [])].map((r) => [r.player_id, r.name_ko]));
});

export const getScorers = cache(async (code: string): Promise<Scorer[]> => {
  const comp = await getCompetition(code);
  const [{ data, error }, names] = await Promise.all([
    supabase
      .from("football_scorers")
      .select(`*, team:football_teams(${TEAM_COLUMNS})`)
      .eq("competition_code", code)
      .eq("season_id", comp.season_id)
      .order("goals", { ascending: false })
      .order("assists", { ascending: false, nullsFirst: false })
      .order("played_matches", { ascending: true, nullsFirst: false }),
    getPlayerNames().catch(() => new Map<number, string>()),
  ]);
  if (error) throw new DataError("db", error.message);
  return (data ?? []).map((r) => ({
    playerId: r.player_id,
    name: names.get(r.player_id) ?? r.player_name,
    englishName: r.player_name,
    nationality: r.nationality,
    position: r.position,
    team: r.team ? toTeam(r.team as TeamRow) : null,
    playedMatches: r.played_matches,
    goals: r.goals,
    assists: r.assists,
    penalties: r.penalties,
  }));
});

// 팀 상세 정보와 선수단. 아직 수집 전이면 null.
export const getTeamProfile = cache(async (teamId: number): Promise<TeamProfile | null> => {
  const [{ data: team, error }, { data: players, error: playerError }] = await Promise.all([
    supabase
      .from("football_teams")
      .select("id, founded, venue, club_colors, website, address, coach_name, coach_nationality, squad_synced_at")
      .eq("id", teamId)
      .maybeSingle(),
    supabase.from("football_players").select("id, name, position, date_of_birth, nationality").eq("team_id", teamId),
  ]);
  if (error) throw new DataError("db", error.message);
  if (playerError) throw new DataError("db", playerError.message);
  if (!team || !team.squad_synced_at) return null;
  return {
    id: team.id,
    founded: team.founded,
    venue: team.venue,
    clubColors: team.club_colors,
    website: team.website,
    address: team.address,
    coachName: team.coach_name,
    coachNationality: team.coach_nationality,
    squad: (players ?? []).map(
      (p): Player => ({
        id: p.id,
        name: p.name,
        position: p.position,
        dateOfBirth: p.date_of_birth,
        nationality: p.nationality,
      }),
    ),
  };
});

const ARTICLE_SUMMARY_COLUMNS = "slug, title, description, category, published_at, updated_at";

function toArticleSummary(r: {
  slug: string;
  title: string;
  description: string;
  category: string;
  published_at: string;
  updated_at: string;
}): ArticleSummary {
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    category: r.category as ArticleSummary["category"],
    publishedAt: r.published_at,
    updatedAt: r.updated_at,
  };
}

// 공개된 칼럼 목록 (최신순). RLS 가 공개된 글만 돌려준다.
export const getArticles = cache(async (limit?: number): Promise<ArticleSummary[]> => {
  let query = supabase
    .from("football_articles")
    .select(ARTICLE_SUMMARY_COLUMNS)
    .order("published_at", { ascending: false })
    .order("created_at", { ascending: false });
  if (limit) query = query.limit(limit);
  const { data, error } = await query;
  if (error) throw new DataError("db", error.message);
  return (data ?? []).map(toArticleSummary);
});

export const getArticle = cache(async (slug: string): Promise<Article | null> => {
  const { data, error } = await supabase
    .from("football_articles")
    .select(`${ARTICLE_SUMMARY_COLUMNS}, body`)
    .eq("slug", slug)
    .maybeSingle();
  if (error) throw new DataError("db", error.message);
  return data ? { ...toArticleSummary(data), body: data.body } : null;
});

export interface GlossaryTerm {
  slug: string;
  term: string;
  english: string | null;
  category: string;
  // 신뢰할 수 있는 HTML (링크 포함)
  body: string;
}

export const GLOSSARY_CATEGORIES = ["경기 규칙", "기록 · 통계", "대회 · 제도", "전술 · 포지션", "이적 · 구단"] as const;

export const getGlossary = cache(async (): Promise<GlossaryTerm[]> => {
  const { data, error } = await supabase
    .from("football_glossary")
    .select("slug, term, english, category, body")
    .order("sort")
    .order("term");
  if (error) throw new DataError("db", error.message);
  return data ?? [];
});

export interface TeamIntro {
  nickname: string | null;
  tags: string[];
  // 신뢰할 수 있는 HTML 문단
  intro: string;
}

export const getTeamIntro = cache(async (teamId: number): Promise<TeamIntro | null> => {
  const { data, error } = await supabase
    .from("football_team_profiles")
    .select("nickname, tags, intro")
    .eq("team_id", teamId)
    .maybeSingle();
  if (error) throw new DataError("db", error.message);
  return data;
});

// 구단 소개 글이 있는 팀. 소개 글이 없는 팀 페이지는 검색 노출과 사이트맵에서 뺀다.
export const getTeamIntroIds = cache(async (): Promise<Set<number>> => {
  const { data, error } = await supabase.from("football_team_profiles").select("team_id");
  if (error) throw new DataError("db", error.message);
  return new Set((data ?? []).map((r) => r.team_id as number));
});

// 모든 대회의 이번 시즌 경기를 대회 코드와 함께 모은다. 수집 전인 대회는 건너뛴다.
export const getAllSeasonMatches = cache(async (): Promise<Match[]> => {
  const lists = await Promise.all(
    LEAGUES.map((l) =>
      getSeasonMatches(l.code)
        .then((ms) => ms.map((m) => ({ ...m, competition: l.code })))
        .catch(() => [] as Match[]),
    ),
  );
  return lists.flat();
});

export interface PlayerScoring {
  competition: string;
  goals: number;
  assists: number | null;
  penalties: number | null;
  playedMatches: number | null;
}

export interface KoreanPlayer {
  id: number;
  nameKo: string;
  nameEn: string | null;
  position: string | null;
  dateOfBirth: string | null;
  // 선수단 수집 데이터에서 찾지 못하면 null
  team: Team | null;
  // 신뢰할 수 있는 HTML 문단 (소개글이 없으면 빈 문자열)
  intro: string;
  scoring: PlayerScoring[];
}

const KOREAN_NATIONALITIES = ["South Korea", "Korea Republic"];

// 해외파 한국 선수: 선수단 국적이 한국인 선수 + 소개글이 있는 선수 (소개글 sort 순, 나머지는 이름순)
export const getKoreanPlayers = cache(async (): Promise<KoreanPlayer[]> => {
  const { data: profiles, error } = await supabase
    .from("football_player_profiles")
    .select("player_id, name_ko, intro, sort")
    .order("sort");
  if (error) throw new DataError("db", error.message);
  const profileIds = (profiles ?? []).map((p) => p.player_id);
  const [byNation, byProfile, comps] = await Promise.all([
    supabase
      .from("football_players")
      .select(`id, name, position, date_of_birth, team:football_teams(${TEAM_COLUMNS})`)
      .in("nationality", KOREAN_NATIONALITIES)
      .not("team_id", "is", null),
    profileIds.length
      ? supabase
          .from("football_players")
          .select(`id, name, position, date_of_birth, team:football_teams(${TEAM_COLUMNS})`)
          .in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
    supabase.from("football_competitions").select("code, season_id"),
  ]);
  for (const r of [byNation, byProfile, comps]) if (r.error) throw new DataError("db", r.error.message);
  const rows = new Map([...(byProfile.data ?? []), ...(byNation.data ?? [])].map((p) => [p.id, p]));
  const profileById = new Map((profiles ?? []).map((p) => [p.player_id, p]));
  const ids = [...new Set([...profileIds, ...rows.keys()])];
  if (!ids.length) return [];

  const { data: scorers, error: scorerError } = await supabase
    .from("football_scorers")
    .select("competition_code, season_id, player_id, goals, assists, penalties, played_matches")
    .in("player_id", ids);
  if (scorerError) throw new DataError("db", scorerError.message);
  const current = new Map((comps.data ?? []).map((c) => [c.code, c.season_id]));

  const players = ids.map((id): KoreanPlayer & { sort: number } => {
    const row = rows.get(id);
    const profile = profileById.get(id);
    const team = row?.team as unknown as TeamRow | null | undefined;
    return {
      id,
      nameKo: profile?.name_ko ?? row?.name ?? String(id),
      nameEn: row?.name ?? null,
      position: row?.position ?? null,
      dateOfBirth: row?.date_of_birth ?? null,
      team: team ? toTeam(team) : null,
      intro: profile?.intro ?? "",
      sort: profile?.sort ?? 10_000,
      scoring: (scorers ?? [])
        .filter((s) => s.player_id === id && current.get(s.competition_code) === s.season_id)
        .map((s) => ({
          competition: s.competition_code,
          goals: s.goals,
          assists: s.assists,
          penalties: s.penalties,
          playedMatches: s.played_matches,
        })),
    };
  });
  return players
    .sort((a, b) => a.sort - b.sort || a.nameKo.localeCompare(b.nameKo))
    .map(({ sort: _sort, ...p }) => p);
});

export interface H2hMeeting {
  id: number;
  utcDate: string;
  competition: string | null;
  homeTeamId: number;
  awayTeamId: number;
  homeName: string;
  awayName: string;
  home: number | null;
  away: number | null;
}

export interface H2hRecord {
  matchId: number;
  homeTeamId: number;
  awayTeamId: number;
  meetings: H2hMeeting[];
  fetchedAt: string;
}

// 맞대결 경로는 작은 id 가 앞에 오는 "a-b" 형식
export function h2hSlug(a: number, b: number) {
  return a < b ? `${a}-${b}` : `${b}-${a}`;
}

// 두 팀의 가장 최근에 받아온 맞대결 기록
export const getH2h = cache(async (a: number, b: number): Promise<H2hRecord | null> => {
  const { data, error } = await supabase
    .from("football_h2h")
    .select("match_id, home_team_id, away_team_id, matches, fetched_at")
    .or(`and(home_team_id.eq.${a},away_team_id.eq.${b}),and(home_team_id.eq.${b},away_team_id.eq.${a})`)
    .order("fetched_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new DataError("db", error.message);
  if (!data) return null;
  return {
    matchId: data.match_id,
    homeTeamId: data.home_team_id,
    awayTeamId: data.away_team_id,
    meetings: (data.matches as H2hMeeting[]).sort((x, y) => y.utcDate.localeCompare(x.utcDate)),
    fetchedAt: data.fetched_at,
  };
});

// 맞대결 기록이 있는 경기 id 와 팀 쌍 (사이트맵·링크용)
export const getH2hIndex = cache(async () => {
  const { data, error } = await supabase
    .from("football_h2h")
    .select("match_id, home_team_id, away_team_id, number_of_matches, fetched_at")
    .gt("number_of_matches", 0);
  if (error) throw new DataError("db", error.message);
  return data ?? [];
});

export const getTeamsByIds = cache(async (ids: number[]): Promise<Map<number, Team>> => {
  if (!ids.length) return new Map();
  const { data, error } = await supabase.from("football_teams").select(TEAM_COLUMNS).in("id", ids);
  if (error) throw new DataError("db", error.message);
  return new Map((data ?? []).map((t) => [t.id, toTeam(t as TeamRow)]));
});

export interface ArchiveRow {
  position: number;
  teamId: number;
  teamName: string;
  teamLogo: string | null;
  played: number;
  won: number;
  draw: number;
  lost: number;
  goalsFor: number;
  goalsAgainst: number;
  points: number;
  description: string | null;
}

export interface ArchiveScorer {
  rank: number;
  playerName: string;
  nationality: string | null;
  teamName: string | null;
  appearances: number | null;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

const getArchiveTeamNames = cache(async () => {
  const { data, error } = await supabase.from("football_archive_team_names").select("team_id, name_ko");
  if (error) throw new DataError("db", error.message);
  return new Map((data ?? []).map((r) => [r.team_id, r.name_ko]));
});

// 기록실에 있는 리그·시즌 목록
export const getArchiveSeasons = cache(async () => {
  const { data, error } = await supabase.from("football_archive_standings").select("league, season").eq("position", 1);
  if (error) throw new DataError("db", error.message);
  return (data ?? []).map((r) => ({ league: r.league as string, season: r.season as number }));
});

export const getArchive = cache(async (league: string, season: number) => {
  const [standings, scorers, names] = await Promise.all([
    supabase.from("football_archive_standings").select("*").eq("league", league).eq("season", season).order("position"),
    supabase.from("football_archive_scorers").select("*").eq("league", league).eq("season", season).order("rank"),
    getArchiveTeamNames(),
  ]);
  if (standings.error) throw new DataError("db", standings.error.message);
  if (scorers.error) throw new DataError("db", scorers.error.message);
  const name = (id: number | null, fallback: string | null) => (id != null ? names.get(id) : undefined) ?? fallback ?? "";
  return {
    table: (standings.data ?? []).map(
      (r): ArchiveRow => ({
        position: r.position,
        teamId: r.team_id,
        teamName: name(r.team_id, r.team_name),
        teamLogo: r.team_logo,
        played: r.played,
        won: r.won,
        draw: r.draw,
        lost: r.lost,
        goalsFor: r.goals_for,
        goalsAgainst: r.goals_against,
        points: r.points,
        description: r.description,
      }),
    ),
    scorers: (scorers.data ?? []).map(
      (r): ArchiveScorer => ({
        rank: r.rank,
        playerName: r.player_name,
        nationality: r.nationality,
        teamName: name(r.team_id, r.team_name),
        appearances: r.appearances,
        goals: r.goals,
        assists: r.assists,
        penalties: r.penalties,
      }),
    ),
  };
});

export interface PlayerDetail extends KoreanPlayer {
  nationality: string | null;
  korean: boolean;
}

// 선수 페이지 대상: 소개글이 있는 선수, 한국 국적 선수, 이번 시즌 득점 순위에 있는 선수
export const getPlayerDetail = cache(async (id: number): Promise<PlayerDetail | null> => {
  const korean = (await getKoreanPlayers()).find((p) => p.id === id);
  const [{ data: row, error }, { data: scorers, error: scorerError }, comps, names] = await Promise.all([
    supabase
      .from("football_players")
      .select(`id, name, position, date_of_birth, nationality, team:football_teams(${TEAM_COLUMNS})`)
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("football_scorers")
      .select(`competition_code, season_id, player_name, nationality, position, goals, assists, penalties, played_matches, team:football_teams(${TEAM_COLUMNS})`)
      .eq("player_id", id),
    supabase.from("football_competitions").select("code, season_id"),
    getPlayerNames(),
  ]);
  if (error) throw new DataError("db", error.message);
  if (scorerError) throw new DataError("db", scorerError.message);
  if (comps.error) throw new DataError("db", comps.error.message);
  const current = new Map((comps.data ?? []).map((c) => [c.code, c.season_id]));
  const season = (scorers ?? []).filter((s) => current.get(s.competition_code) === s.season_id && s.competition_code !== "WC");
  if (!korean && !season.length) return null;

  const first = season[0];
  const teamRow = (row?.team ?? first?.team) as unknown as TeamRow | null | undefined;
  const nameEn = row?.name ?? first?.player_name ?? korean?.nameEn ?? null;
  return {
    id,
    nameKo: korean?.nameKo ?? names.get(id) ?? nameEn ?? String(id),
    nameEn,
    position: row?.position ?? first?.position ?? korean?.position ?? null,
    dateOfBirth: row?.date_of_birth ?? korean?.dateOfBirth ?? null,
    nationality: row?.nationality ?? first?.nationality ?? null,
    team: teamRow ? toTeam(teamRow) : (korean?.team ?? null),
    intro: korean?.intro ?? "",
    korean: !!korean,
    scoring: season.map((s) => ({
      competition: s.competition_code,
      goals: s.goals,
      assists: s.assists,
      penalties: s.penalties,
      playedMatches: s.played_matches,
    })),
  };
});

export interface ScorerEntry extends Scorer {
  competition: string;
}

// 모든 대회의 이번 시즌 득점 순위 (월드컵 제외)
export const getAllScorers = cache(async (): Promise<ScorerEntry[]> => {
  const lists = await Promise.all(
    LEAGUES.filter((l) => l.code !== "WC").map((l) =>
      getScorers(l.code)
        .then((list) => list.map((s) => ({ ...s, competition: l.code })))
        .catch(() => [] as ScorerEntry[]),
    ),
  );
  return lists.flat();
});
