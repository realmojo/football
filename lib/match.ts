// 경기별 페이지(/match/{id})의 프리뷰·리뷰 문장
import { analyzeTeam, isFinished, isLive, perGame, points, type TeamAnalysis } from "./analysis";
import { groupTables } from "./cup";
import type { H2hRecord, KoreanPlayer } from "./data";
import { formatKstDay, formatTime } from "./format";
import { josa } from "./josa";
import { findLeague, groupLabel, stageLabel } from "./leagues";
import type { Match, StandingsResponse } from "./types";

export interface Position {
  position: number;
  points: number;
  played: number;
  size: number;
}

// 대회 안에서 팀의 현재 순위. 국내 리그·챔스는 순위표, 월드컵은 조별 순위를 경기 결과로 계산한다.
export function positionsFor(standings: StandingsResponse | null, matches: Match[]) {
  const map = new Map<number, Position>();
  for (const s of standings?.standings ?? []) {
    if (s.type !== "TOTAL") continue;
    for (const r of s.table) map.set(r.team.id, { position: r.position, points: r.points, played: r.playedGames, size: s.table.length });
  }
  if (!map.size) {
    for (const g of groupTables(matches)) {
      for (const r of g.table) map.set(r.team.id, { position: r.position, points: r.points, played: r.playedGames, size: g.table.length });
    }
  }
  return map;
}

export function roundLabel(m: Match) {
  if (m.stage === "GROUP_STAGE") return `조별리그 ${groupLabel(m.group)} ${m.matchday ?? ""}차전`.replace(/\s+/g, " ").trim();
  if (m.stage === "REGULAR_SEASON" || m.stage === "LEAGUE_STAGE") return m.matchday ? `${m.matchday}라운드` : "";
  return stageLabel(m.stage);
}

export function matchTitle(m: Match) {
  const league = findLeague(m.competition ?? "")?.name ?? "";
  const day = formatKstDay(kstYmd(m.utcDate));
  if (isFinished(m)) {
    const { home, away } = m.score.fullTime;
    return `${m.homeTeam.name} ${home}-${away} ${m.awayTeam.name} 경기 결과 · ${league} ${roundLabel(m)} (${day})`;
  }
  return `${m.homeTeam.name} vs ${m.awayTeam.name} 중계 시간 · 프리뷰 (${day} ${formatTime(m.utcDate)} 한국시간) · ${league} ${roundLabel(m)}`;
}

function kstYmd(utc: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul", year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(utc),
  );
}

function record5(a: TeamAnalysis) {
  const r = a.lastFiveRecord;
  return `${r.won}승 ${r.draw}무 ${r.lost}패`;
}

export interface MatchContext {
  match: Match;
  competitionMatches: Match[];
  positions: Map<number, Position>;
  h2h: H2hRecord | null;
  koreans: Map<number, KoreanPlayer[]>;
}

function h2hTally(h2h: H2hRecord, a: number) {
  let aw = 0;
  let d = 0;
  let bw = 0;
  for (const m of h2h.meetings) {
    if (m.home == null || m.away == null) continue;
    const ag = m.homeTeamId === a ? m.home : m.away;
    const bg = m.homeTeamId === a ? m.away : m.home;
    if (ag > bg) aw++;
    else if (ag < bg) bw++;
    else d++;
  }
  return { aw, d, bw, n: aw + d + bw };
}

function koreanLine(m: Match, koreans: Map<number, KoreanPlayer[]>) {
  const list = [...(koreans.get(m.homeTeam.id) ?? []), ...(koreans.get(m.awayTeam.id) ?? [])];
  if (!list.length) return null;
  const names = list.map((p) => `${p.nameKo}(${p.team?.shortName ?? ""})`).join(", ");
  return `한국 선수 ${names}의 소속팀 경기입니다. 실제 출전 여부는 경기 당일 선발 명단을 확인해 주세요.`;
}

// 경기 전 프리뷰 문단
export function previewParagraphs(ctx: MatchContext): string[] {
  const { match: m, competitionMatches, positions, h2h, koreans } = ctx;
  const H = m.homeTeam;
  const A = m.awayTeam;
  const league = findLeague(m.competition ?? "")?.name ?? "";
  const out: string[] = [];
  out.push(
    `${formatKstDay(kstYmd(m.utcDate))} ${formatTime(m.utcDate)}(한국시간), ${league} ${roundLabel(m)}에서 ` +
      `${josa(H.name, "와/과")} ${josa(A.name, "이/가")} 맞붙습니다. ${H.name}의 홈 경기입니다.`,
  );

  const hp = positions.get(H.id);
  const ap = positions.get(A.id);
  if (hp && ap && hp.played > 0) {
    const gap = Math.abs(hp.position - ap.position);
    out.push(
      `현재 순위는 ${H.shortName} ${hp.position}위(승점 ${hp.points}), ${A.shortName} ${ap.position}위(승점 ${ap.points})입니다. ` +
        (gap >= Math.ceil(hp.size / 3)
          ? `순위 차이가 커서 객관적인 전력은 ${hp.position < ap.position ? H.shortName : A.shortName} 쪽이 앞서 보이지만, 축구에서는 이런 경기에서 이변이 자주 나옵니다.`
          : gap <= 2
            ? "순위가 붙어 있는 팀끼리의 맞대결이라 결과에 따라 순위가 직접 뒤바뀔 수 있습니다."
            : ""),
    );
  }

  const ha = analyzeTeam(competitionMatches, H.id);
  const aa = analyzeTeam(competitionMatches, A.id);
  if (ha.overall.played && aa.overall.played) {
    out.push(
      `최근 5경기는 ${H.shortName} ${record5(ha)}, ${A.shortName} ${record5(aa)}입니다. ` +
        `${H.shortName}의 홈 경기당 승점은 ${perGame(points(ha.home), ha.home.played)}, ` +
        `${A.shortName}의 원정 경기당 승점은 ${perGame(points(aa.away), aa.away.played)}입니다.`,
    );
    const over = (ha.over25 / ha.overall.played + aa.over25 / aa.overall.played) / 2;
    const cs = (ha.cleanSheets / ha.overall.played + aa.cleanSheets / aa.overall.played) / 2;
    out.push(
      over >= 0.6
        ? `두 팀 모두 3골 이상 나온 경기가 많았던 만큼(평균 ${Math.round(over * 100)}%) 골이 많이 나는 경기가 될 가능성이 있습니다.`
        : cs >= 0.4
          ? `두 팀의 무실점 경기 비율이 평균 ${Math.round(cs * 100)}%로 높아, 선제골이 승부를 가를 가능성이 큽니다.`
          : `두 팀의 경기당 득점은 ${H.shortName} ${perGame(ha.overall.goalsFor, ha.overall.played)}골, ${A.shortName} ${perGame(aa.overall.goalsFor, aa.overall.played)}골입니다.`,
    );
  }

  if (h2h) {
    const t = h2hTally(h2h, H.id);
    if (t.n) {
      out.push(
        `최근 맞대결 ${t.n}경기 전적은 ${H.shortName} ${t.aw}승, 무승부 ${t.d}, ${A.shortName} ${t.bw}승입니다.`,
      );
    }
  }

  const ko = koreanLine(m, koreans);
  if (ko) out.push(ko);
  return out;
}

// 경기 뒤 리뷰 문단
export function reviewParagraphs(ctx: MatchContext): string[] {
  const { match: m, positions, koreans } = ctx;
  const H = m.homeTeam;
  const A = m.awayTeam;
  const { home: h, away: a } = m.score.fullTime;
  const out: string[] = [];
  if (h == null || a == null) return out;
  const live = isLive(m);
  const result =
    h === a
      ? `${josa(H.name, "와/과")} ${A.name}의 경기는 ${h}-${a} 무승부로 끝났습니다.`
      : `${josa(h > a ? H.name : A.name, "이/가")} ${josa(h > a ? A.name : H.name, "을/를")} ${Math.max(h, a)}-${Math.min(h, a)}로 이겼습니다.`;
  out.push(live ? `현재 ${H.shortName} ${h}-${a} ${A.shortName}로 경기가 진행 중입니다. 스코어는 약 10분마다 갱신됩니다.` : result);

  const ht = m.score.halfTime;
  if (!live && ht.home != null && ht.away != null) {
    const htLeader = ht.home > ht.away ? "home" : ht.home < ht.away ? "away" : null;
    const ftLeader = h > a ? "home" : h < a ? "away" : null;
    out.push(
      `전반은 ${ht.home}-${ht.away}로 끝났고, 후반에 ${h + a - ht.home - ht.away}골이 더 나왔습니다.` +
        (htLeader && ftLeader && htLeader !== ftLeader
          ? " 전반을 뒤진 팀이 후반에 경기를 뒤집은 역전승입니다."
          : htLeader && !ftLeader
            ? " 전반을 앞선 팀이 리드를 지키지 못했습니다."
            : ""),
    );
  }
  if (m.score.penalties && m.score.penalties.home != null) {
    out.push(`승부차기에서 ${m.score.penalties.home}-${m.score.penalties.away}로 승부가 갈렸습니다.`);
  }

  const hp = positions.get(H.id);
  const ap = positions.get(A.id);
  if (!live && hp && ap) {
    out.push(`현재 순위는 ${H.shortName} ${hp.position}위(승점 ${hp.points}), ${A.shortName} ${ap.position}위(승점 ${ap.points})입니다.`);
  }
  const ko = koreanLine(m, koreans);
  if (ko) out.push(ko.replace("실제 출전 여부는 경기 당일 선발 명단을 확인해 주세요.", "출전 기록은 각 구단 발표를 확인해 주세요."));
  return out;
}

export { kstYmd };
