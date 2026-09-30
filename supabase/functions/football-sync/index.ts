/**
 * football-data.org v4 → Supabase football_* 테이블 적재.
 *
 * POST { competition: "PL" }
 *   리그 정보, 팀, 현재 시즌 전체 경기, 순위표, 득점 순위를 upsert 한다. (API 호출 3회)
 * POST { action: "squads", limit: 5 }
 *   선수단을 가장 오래전에 받아온 팀부터 limit 개 받아온다. (팀당 API 호출 1회)
 * 헤더 x-sync-token 이 Vault 의 football_sync_token 과 같아야 한다.
 *
 * API 토큰은 Vault(football_data_token)에 있고 service_role 전용 함수 football_sync_config() 로 읽는다.
 * DB 의 pg_cron 이 리그별로 10분마다 pg_net 으로 호출한다.
 */
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://api.football-data.org/v4";
const COMPETITIONS = ["PL", "PD", "BL1", "SA", "FL1", "CL"];

const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
  auth: { persistSession: false },
});

let config: { sync_token: string; api_token: string } | null = null;
async function loadConfig() {
  if (config) return config;
  const { data, error } = await supabase.rpc("football_sync_config");
  if (error) throw new Error(`설정을 읽지 못했습니다: ${error.message}`);
  config = (Array.isArray(data) ? data[0] : data) as typeof config;
  return config!;
}

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });
}

interface ApiTeam {
  id: number;
  name: string;
  shortName: string | null;
  tla: string | null;
  crest: string | null;
}

interface ApiMatch {
  id: number;
  utcDate: string;
  status: string;
  matchday: number | null;
  stage: string | null;
  group: string | null;
  lastUpdated: string | null;
  season: { id: number };
  homeTeam: ApiTeam;
  awayTeam: ApiTeam;
  score: {
    winner: string | null;
    fullTime: { home: number | null; away: number | null };
    halfTime: { home: number | null; away: number | null };
  };
}

interface ApiStandings {
  competition: { id: number; name: string; code: string; emblem: string | null };
  season: { id: number; startDate: string; endDate: string; currentMatchday: number | null };
  standings: Array<{
    stage: string;
    type: string;
    group: string | null;
    table: Array<{
      position: number;
      team: ApiTeam;
      playedGames: number;
      form: string | null;
      won: number;
      draw: number;
      lost: number;
      points: number;
      goalsFor: number;
      goalsAgainst: number;
      goalDifference: number;
    }>;
  }>;
}

interface ApiScorers {
  scorers: Array<{
    player: { id: number; name: string; nationality: string | null; section: string | null; position: string | null };
    team: ApiTeam;
    playedMatches: number | null;
    goals: number | null;
    assists: number | null;
    penalties: number | null;
  }>;
}

interface ApiTeamDetail extends ApiTeam {
  address: string | null;
  website: string | null;
  founded: number | null;
  clubColors: string | null;
  venue: string | null;
  coach: { name: string | null; nationality: string | null } | null;
  squad: Array<{ id: number; name: string; position: string | null; dateOfBirth: string | null; nationality: string | null }>;
}

async function api<T>(path: string, token: string): Promise<T> {
  const res = await fetch(`${API}${path}`, {
    headers: { "X-Auth-Token": token },
    signal: AbortSignal.timeout(30000),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`football-data.org 응답 오류 (${res.status}): ${text.slice(0, 200)}`);
  return JSON.parse(text) as T;
}

async function upsert(table: string, rows: Record<string, unknown>[], onConflict: string) {
  for (let i = 0; i < rows.length; i += 500) {
    const { error } = await supabase.from(table).upsert(rows.slice(i, i + 500), { onConflict });
    if (error) throw new Error(`${table} 저장 실패: ${error.message}`);
  }
}

async function sync(code: string, token: string) {
  const standings = await api<ApiStandings>(`/competitions/${code}/standings`, token);
  const { matches } = await api<{ matches: ApiMatch[] }>(`/competitions/${code}/matches`, token);
  const { scorers } = await api<ApiScorers>(`/competitions/${code}/scorers?limit=30`, token);
  const now = new Date().toISOString();

  const teams = new Map<number, ApiTeam>();
  for (const m of matches) {
    if (m.homeTeam?.id) teams.set(m.homeTeam.id, m.homeTeam);
    if (m.awayTeam?.id) teams.set(m.awayTeam.id, m.awayTeam);
  }
  for (const s of standings.standings) for (const r of s.table) teams.set(r.team.id, r.team);
  for (const sc of scorers) if (sc.team?.id && !teams.has(sc.team.id)) teams.set(sc.team.id, sc.team);

  await upsert(
    "football_competitions",
    [
      {
        code,
        id: standings.competition.id,
        name: standings.competition.name,
        emblem: standings.competition.emblem,
        season_id: standings.season.id,
        season_start: standings.season.startDate,
        season_end: standings.season.endDate,
        current_matchday: standings.season.currentMatchday,
        synced_at: now,
      },
    ],
    "code",
  );

  await upsert(
    "football_teams",
    [...teams.values()].map((t) => ({
      id: t.id,
      name: t.name,
      short_name: t.shortName,
      tla: t.tla,
      crest: t.crest,
      synced_at: now,
    })),
    "id",
  );

  const matchRows = matches.map((m) => ({
    id: m.id,
    competition_code: code,
    season_id: m.season?.id ?? standings.season.id,
    utc_date: m.utcDate,
    status: m.status,
    matchday: m.matchday,
    stage: m.stage,
    group_name: m.group,
    // 녹아웃 대진 미정 경기는 팀이 비어 있다.
    home_team_id: m.homeTeam?.id ?? null,
    away_team_id: m.awayTeam?.id ?? null,
    winner: m.score.winner,
    home_score: m.score.fullTime.home,
    away_score: m.score.fullTime.away,
    home_half: m.score.halfTime.home,
    away_half: m.score.halfTime.away,
    last_updated: m.lastUpdated,
    synced_at: now,
  }));
  await upsert("football_matches", matchRows, "id");

  const standingRows = standings.standings.flatMap((s) =>
    s.table.map((r) => ({
      competition_code: code,
      season_id: standings.season.id,
      stage: s.stage,
      type: s.type,
      group_name: s.group ?? "",
      team_id: r.team.id,
      position: r.position,
      played: r.playedGames,
      won: r.won,
      draw: r.draw,
      lost: r.lost,
      points: r.points,
      goals_for: r.goalsFor,
      goals_against: r.goalsAgainst,
      goal_difference: r.goalDifference,
      form: r.form,
      synced_at: now,
    })),
  );
  await upsert("football_standings", standingRows, "competition_code,season_id,stage,type,group_name,team_id");

  // 이번 동기화에 없던 순위 행(조 재편성 등)은 지운다.
  const { error } = await supabase
    .from("football_standings")
    .delete()
    .eq("competition_code", code)
    .eq("season_id", standings.season.id)
    .lt("synced_at", now);
  if (error) throw new Error(`순위 정리 실패: ${error.message}`);

  const scorerRows = scorers.map((sc) => ({
    competition_code: code,
    season_id: standings.season.id,
    player_id: sc.player.id,
    player_name: sc.player.name,
    nationality: sc.player.nationality,
    position: sc.player.section ?? sc.player.position,
    team_id: sc.team?.id ?? null,
    played_matches: sc.playedMatches,
    goals: sc.goals ?? 0,
    assists: sc.assists,
    penalties: sc.penalties,
    synced_at: now,
  }));
  await upsert("football_scorers", scorerRows, "competition_code,season_id,player_id");
  // 순위 밖으로 밀려난 선수는 지운다.
  const { error: scorerError } = await supabase
    .from("football_scorers")
    .delete()
    .eq("competition_code", code)
    .eq("season_id", standings.season.id)
    .lt("synced_at", now);
  if (scorerError) throw new Error(`득점 순위 정리 실패: ${scorerError.message}`);

  await supabase.from("football_sync_log").insert({
    competition_code: code,
    matches: matchRows.length,
    standings: standingRows.length,
  });
  return {
    competition: code,
    season: standings.season.id,
    teams: teams.size,
    matches: matchRows.length,
    standings: standingRows.length,
    scorers: scorerRows.length,
  };
}

// 선수단: 한 번도 받지 않았거나 하루 넘게 지난 팀부터 가져온다.
async function syncSquads(limit: number, token: string) {
  const staleBefore = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const { data: targets, error } = await supabase
    .from("football_teams")
    .select("id")
    .or(`squad_synced_at.is.null,squad_synced_at.lt.${staleBefore}`)
    .order("squad_synced_at", { ascending: true, nullsFirst: true })
    .limit(limit);
  if (error) throw new Error(`팀 목록 조회 실패: ${error.message}`);

  const done: Array<{ id: number; players: number }> = [];
  for (const { id } of targets ?? []) {
    const t = await api<ApiTeamDetail>(`/teams/${id}`, token);
    const now = new Date().toISOString();
    const { error: teamError } = await supabase
      .from("football_teams")
      .update({
        founded: t.founded,
        venue: t.venue,
        club_colors: t.clubColors,
        website: t.website,
        address: t.address,
        coach_name: t.coach?.name ?? null,
        coach_nationality: t.coach?.nationality ?? null,
        squad_synced_at: now,
      })
      .eq("id", id);
    if (teamError) throw new Error(`팀 정보 저장 실패: ${teamError.message}`);

    const players = (t.squad ?? []).map((p) => ({
      id: p.id,
      team_id: id,
      name: p.name,
      position: p.position,
      date_of_birth: p.dateOfBirth ? p.dateOfBirth.slice(0, 10) : null,
      nationality: p.nationality,
      synced_at: now,
    }));
    await upsert("football_players", players, "id");
    // 이번 선수단에 없는 선수(이적 등)는 팀에서 뺀다.
    await supabase.from("football_players").update({ team_id: null }).eq("team_id", id).lt("synced_at", now);
    done.push({ id, players: players.length });
  }

  await supabase.from("football_sync_log").insert({
    competition_code: "SQUADS",
    matches: done.length,
    standings: done.reduce((n, d) => n + d.players, 0),
  });
  return { squads: done };
}

Deno.serve(async (req) => {
  let code: string | undefined;
  try {
    const cfg = await loadConfig();
    if (req.headers.get("x-sync-token") !== cfg.sync_token) return json({ error: "unauthorized" }, 401);
    if (!cfg.api_token) throw new Error("football_data_token 이 Vault 에 없습니다.");
    const body = (await req.json().catch(() => ({}))) as { competition?: string; action?: string; limit?: number };
    if (body.action === "squads") {
      code = "SQUADS";
      return json(await syncSquads(Math.min(8, Math.max(1, Number(body.limit) || 5)), cfg.api_token));
    }
    code = body.competition?.toUpperCase();
    if (!code || !COMPETITIONS.includes(code)) return json({ error: `competition 은 ${COMPETITIONS.join(" | ")}` }, 400);
    return json(await sync(code, cfg.api_token));
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e);
    await supabase
      .from("football_sync_log")
      .insert({ competition_code: code ?? "unknown", error: message })
      .then(() => {}, () => {});
    return json({ error: message }, 500);
  }
});
