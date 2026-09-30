export interface Team {
  id: number;
  name: string;
  shortName: string;
  tla: string;
  crest: string;
}

export interface TableRow {
  position: number;
  team: Team;
  playedGames: number;
  form: string | null;
  won: number;
  draw: number;
  lost: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  goalDifference: number;
}

export interface Standing {
  stage: string;
  type: "TOTAL" | "HOME" | "AWAY";
  group: string | null;
  table: TableRow[];
}

export interface StandingsResponse {
  competition: { id: number; name: string; code: string; emblem: string };
  season: { id: number; startDate: string; endDate: string; currentMatchday: number | null };
  standings: Standing[];
}

export type MatchStatus =
  | "SCHEDULED"
  | "TIMED"
  | "IN_PLAY"
  | "PAUSED"
  | "FINISHED"
  | "SUSPENDED"
  | "POSTPONED"
  | "CANCELLED"
  | "AWARDED";

export interface Score {
  winner: "HOME_TEAM" | "AWAY_TEAM" | "DRAW" | null;
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
}

export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  stage: string;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
}

export interface MatchesResponse {
  matches: Match[];
}
