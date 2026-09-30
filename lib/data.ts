import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Article, ArticleSummary } from "./articles";
import { nationName } from "./labels";
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
}

function toTeam(t: TeamRow): Team {
  // 대표팀은 한글 국가명으로 보여준다.
  const korean = nationName(t.name);
  return {
    id: t.id,
    name: korean ?? t.name,
    shortName: korean ?? t.short_name ?? t.name,
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
    .select("*, team:football_teams(id, name, short_name, tla, crest)")
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
      "*, home:football_teams!football_matches_home_team_id_fkey(id, name, short_name, tla, crest), away:football_teams!football_matches_away_team_id_fkey(id, name, short_name, tla, crest)",
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

const TEAM_COLUMNS = "id, name, short_name, tla, crest";

export const getScorers = cache(async (code: string): Promise<Scorer[]> => {
  const comp = await getCompetition(code);
  const { data, error } = await supabase
    .from("football_scorers")
    .select(`*, team:football_teams(${TEAM_COLUMNS})`)
    .eq("competition_code", code)
    .eq("season_id", comp.season_id)
    .order("goals", { ascending: false })
    .order("assists", { ascending: false, nullsFirst: false })
    .order("played_matches", { ascending: true, nullsFirst: false });
  if (error) throw new DataError("db", error.message);
  return (data ?? []).map((r) => ({
    playerId: r.player_id,
    name: r.player_name,
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
