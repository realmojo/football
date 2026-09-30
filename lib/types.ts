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
  // 연장까지의 스코어 (승부차기 골은 뺀 값)
  fullTime: { home: number | null; away: number | null };
  halfTime: { home: number | null; away: number | null };
  duration?: "REGULAR" | "EXTRA_TIME" | "PENALTY_SHOOTOUT" | null;
  penalties?: { home: number | null; away: number | null } | null;
}

export interface Match {
  id: number;
  utcDate: string;
  status: MatchStatus;
  matchday: number | null;
  stage: string;
  group?: string | null;
  homeTeam: Team;
  awayTeam: Team;
  score: Score;
}

export interface MatchesResponse {
  matches: Match[];
}

export interface Scorer {
  playerId: number;
  name: string;
  nationality: string | null;
  position: string | null;
  team: Team | null;
  playedMatches: number | null;
  goals: number;
  assists: number | null;
  penalties: number | null;
}

export interface Player {
  id: number;
  name: string;
  position: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
}

export interface TeamProfile {
  id: number;
  founded: number | null;
  venue: string | null;
  clubColors: string | null;
  website: string | null;
  address: string | null;
  coachName: string | null;
  coachNationality: string | null;
  squad: Player[];
}
