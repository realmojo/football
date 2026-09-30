// 날짜별 해외축구 일정 (한국시간 기준)
import { isFinished, isLive } from "./analysis";
import type { KoreanPlayer } from "./data";
import { formatKstDay, formatTime, kstDate, kstHour } from "./format";
import { margin, scoreText, totalGoals } from "./insights";
import { LEAGUES } from "./leagues";
import type { Match } from "./types";

export function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00+09:00`).getTime());
}

export function matchesOn(all: Match[], ymd: string) {
  return all.filter((m) => kstDate(m.utcDate) === ymd).sort((a, b) => a.utcDate.localeCompare(b.utcDate));
}

// 경기가 있는 날짜 목록 (오름차순)
export function matchDates(all: Match[]) {
  return [...new Set(all.map((m) => kstDate(m.utcDate)))].sort();
}

export function byCompetition(matches: Match[]) {
  return LEAGUES.map((l) => ({ league: l, matches: matches.filter((m) => m.competition === l.code) })).filter(
    (g) => g.matches.length,
  );
}

// 두 팀 모두 리그 상위 6위 안인 국내 리그 경기
export function bigMatches(matches: Match[], positions: Map<number, number>) {
  return matches
    .filter((m) => m.competition !== "CL" && m.competition !== "WC")
    .map((m) => ({ match: m, home: positions.get(m.homeTeam.id), away: positions.get(m.awayTeam.id) }))
    .filter((x): x is { match: Match; home: number; away: number } => !!x.home && !!x.away && x.home <= 6 && x.away <= 6)
    .sort((a, b) => a.home + a.away - (b.home + b.away));
}

export function koreanNames(m: Match, byTeam: Map<number, KoreanPlayer[]>) {
  return [...(byTeam.get(m.homeTeam.id) ?? []), ...(byTeam.get(m.awayTeam.id) ?? [])].map((p) => p.nameKo);
}

export function dayParagraphs(
  ymd: string,
  matches: Match[],
  byTeam: Map<number, KoreanPlayer[]>,
  positions: Map<number, number>,
): string[] {
  const label = formatKstDay(ymd);
  if (!matches.length) return [`${label}에는 토리코리가 다루는 대회의 경기가 없습니다.`];
  const out: string[] = [];
  const groups = byCompetition(matches);
  const done = matches.filter(isFinished);
  const allDone = done.length === matches.length;

  out.push(
    `${label} 해외축구 ${allDone ? "경기는" : "일정은"} 모두 ${matches.length}경기입니다(한국시간 기준). ` +
      groups.map((g) => `${g.league.name} ${g.matches.length}경기`).join(", ") +
      (allDone ? "가 열렸습니다." : "가 열립니다."),
  );

  const first = matches[0];
  const dawn = matches.filter((m) => kstHour(m.utcDate) < 7).length;
  if (!allDone) {
    out.push(
      `첫 경기는 ${formatTime(first.utcDate)}에 시작합니다.` +
        (dawn ? ` 이 가운데 ${dawn}경기는 새벽(오전 7시 이전)에 킥오프하니, 생중계를 보려면 미리 시간을 확인해 두세요.` : ""),
    );
  }

  const korean = matches.filter((m) => koreanNames(m, byTeam).length);
  if (korean.length) {
    out.push(
      `한국 선수 소속팀 경기는 ${korean.length}경기입니다. ` +
        korean
          .map((m) => `${formatTime(m.utcDate)} ${m.homeTeam.shortName} vs ${m.awayTeam.shortName}(${koreanNames(m, byTeam).join(", ")})`)
          .join(", ") +
        ".",
    );
  }

  const big = bigMatches(matches, positions);
  if (big.length) {
    const b = big[0];
    out.push(
      `가장 눈길이 가는 경기는 ${b.home}위 ${b.match.homeTeam.shortName} 대 ${b.away}위 ${b.match.awayTeam.shortName} 경기입니다(현재 순위 기준). ` +
        "상위권끼리의 경기는 순위표에 두 배의 영향을 주는 이른바 \"승점 6점짜리\" 경기입니다.",
    );
  }

  if (done.length) {
    const goals = done.reduce((n, m) => n + totalGoals(m), 0);
    const biggest = [...done].filter((m) => margin(m) > 0).sort((a, b) => margin(b) - margin(a))[0];
    out.push(
      `끝난 ${done.length}경기에서 모두 ${goals}골(경기당 ${(goals / done.length).toFixed(2)}골)이 나왔습니다.` +
        (biggest ? ` 가장 큰 점수 차 경기는 ${scoreText(biggest)} 경기입니다.` : ""),
    );
  }

  if (matches.some(isLive)) out.push("지금 진행 중인 경기가 있습니다. 스코어는 약 10분마다 갱신됩니다.");
  return out;
}

export function dayDescription(ymd: string, matches: Match[], byTeam: Map<number, KoreanPlayer[]>) {
  const label = formatKstDay(ymd);
  const groups = byCompetition(matches);
  const korean = [...new Set(matches.flatMap((m) => koreanNames(m, byTeam)))];
  return (
    `${label} 해외축구 일정과 결과 ${matches.length}경기를 한국시간으로 정리했습니다. ` +
    groups.map((g) => g.league.name).join(", ") +
    (korean.length ? `. 한국 선수 ${korean.join(", ")} 소속팀 경기 포함.` : ".")
  );
}
