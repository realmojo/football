import "server-only";
import type { MatchesResponse, StandingsResponse } from "./types";

const BASE_URL = process.env.FOOTBALL_DATA_BASE_URL ?? "https://api.football-data.org/v4";

// 무료 플랜은 분당 10회 제한이 있으므로 응답을 10분간 캐시한다.
const REVALIDATE_SECONDS = 600;

export class FootballApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

async function request<T>(path: string): Promise<T> {
  const token = process.env.FOOTBALL_DATA_TOKEN;
  if (!token) {
    throw new FootballApiError(500, "FOOTBALL_DATA_TOKEN 환경변수가 설정되지 않았습니다.");
  }

  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { "X-Auth-Token": token },
    next: { revalidate: REVALIDATE_SECONDS },
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new FootballApiError(res.status, body?.message ?? `API 요청 실패 (${res.status})`);
  }
  return res.json() as Promise<T>;
}

export function getStandings(code: string) {
  return request<StandingsResponse>(`/competitions/${code}/standings`);
}

// 현재 시즌 전체 경기. 일정/결과/팀 분석 모두 이 한 번의 호출로 계산한다.
export async function getSeasonMatches(code: string) {
  const data = await request<MatchesResponse>(`/competitions/${code}/matches`);
  return data.matches;
}
