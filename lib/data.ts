import "server-only";
import { cache } from "react";
import { createClient } from "@supabase/supabase-js";
import type { Match, MatchStatus, Standing, StandingsResponse, Team } from "./types";

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
  return { id: t.id, name: t.name, shortName: t.short_name ?? t.name, tla: t.tla ?? "", crest: t.crest ?? "" };
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
      score: {
        winner: m.winner,
        fullTime: { home: m.home_score, away: m.away_score },
        halfTime: { home: m.home_half, away: m.away_half },
      },
    }));
});
