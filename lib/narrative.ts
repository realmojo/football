// 계산한 숫자를 문장으로 풀어 쓴다.
// 팀 이름은 영어라 받침을 알 수 없으므로, 이름 바로 뒤에는 받침과 상관없는 말(의, 도, 입니다, 괄호)만 붙인다.
import { fixed, pct, scoreText, type LeagueSummary, type RoundReview, type TeamStats } from "./insights";

function compare(value: number, base: number, unit: string, more: string, less: string, same: string) {
  const diff = value - base;
  if (!Number.isFinite(diff) || Math.abs(diff) < 0.15) return same;
  return `${Math.abs(diff).toFixed(2)}${unit} ${diff > 0 ? more : less}`;
}

export function roundParagraphs(leagueName: string, r: RoundReview, season: LeagueSummary): string[] {
  const s = r.summary;
  const out: string[] = [];
  if (!s.matches) return [`${leagueName} ${r.matchday}라운드는 아직 끝난 경기가 없습니다.`];

  out.push(
    `${leagueName} ${r.matchday}라운드 ${s.matches}경기에서 모두 ${s.goals}골이 나왔습니다. 경기당 ${fixed(s.goalsPerGame)}골로, ` +
      `이번 시즌 평균(${fixed(season.goalsPerGame)}골)과 비교하면 ${compare(s.goalsPerGame, season.goalsPerGame, "골", "많은 라운드였습니다.", "적은 라운드였습니다.", "비슷한 수준이었습니다.")} ` +
      `홈 팀이 ${s.homeWins}경기, 원정 팀이 ${s.awayWins}경기를 이겼고 ${s.draws}경기는 무승부로 끝났습니다.`,
  );

  const leader = r.table[0]?.row;
  const second = r.table[1]?.row;
  if (leader) {
    const gap = second ? leader.points - second.points : 0;
    if (r.leaderBefore && r.leaderBefore.team.id !== leader.team.id) {
      out.push(
        `선두가 바뀌었습니다. 이번 라운드 뒤 1위는 승점 ${leader.points}의 ${leader.team.shortName}입니다. ` +
          `라운드 전 1위 ${r.leaderBefore.team.shortName}의 자리를 넘겨받았고, 2위와의 승점 차는 ${gap}점입니다.`,
      );
    } else if (r.leaderBefore) {
      out.push(
        `선두는 그대로 ${leader.team.shortName}입니다(승점 ${leader.points}). ` +
          (gap === 0
            ? `다만 2위 ${second!.team.shortName}도 승점이 같아 골득실로 순위가 갈린 상태입니다.`
            : `2위 ${second!.team.shortName}보다 승점 ${gap}점 앞서 있습니다.${gap >= 5 ? " 선두 독주 체제가 굳어지는 모양새입니다." : ""}`),
      );
    } else {
      out.push(`첫 라운드를 마친 현재 1위는 ${leader.team.shortName}입니다(${leader.goalsFor}득점 ${leader.goalsAgainst}실점).`);
    }
  }

  const big = s.biggestWins[0];
  if (big) {
    const high = s.highestScoring[0];
    out.push(
      `가장 큰 점수 차 경기는 ${scoreText(big)} 경기입니다.` +
        (high && high.id !== big.id ? ` 가장 많은 골이 나온 경기는 ${scoreText(high)} 경기입니다.` : ""),
    );
  }

  if (r.upsets.length) {
    const u = r.upsets[0];
    out.push(
      `이번 라운드의 가장 큰 이변은 라운드 전 ${u.winnerPos}위 ${u.winner.shortName}의 승리입니다. ` +
        `상대는 ${u.loserPos}위 팀으로, 스코어는 ${scoreText(u.match)}입니다.`,
    );
  }

  if (r.comebacks.length) {
    const names = r.comebacks.map((c) => c.winner.shortName).join(", ");
    out.push(
      r.comebacks.length === 1
        ? `전반을 뒤진 채 마치고도 이긴 역전승은 ${names}의 경기 하나입니다.`
        : `전반을 뒤진 채 마치고도 이긴 역전승이 ${r.comebacks.length}번 나왔습니다(${names}). 후반에 경기가 크게 흔들린 라운드였습니다.`,
    );
  }

  const up = [...r.table].filter((t) => t.before != null).sort((a, b) => b.change - a.change)[0];
  const down = [...r.table].filter((t) => t.before != null).sort((a, b) => a.change - b.change)[0];
  if (up && up.change >= 3) {
    out.push(
      `순위가 가장 많이 오른 팀은 ${up.row.team.shortName}입니다(${up.before}위 → ${up.row.position}위).` +
        (down && down.change <= -3
          ? ` 반대로 ${down.row.team.shortName}의 순위는 ${down.before}위에서 ${down.row.position}위로 내려갔습니다.`
          : ""),
    );
  }

  return out;
}

// 토리코리 관점: 숫자가 말해 주는 것과 조심해서 봐야 할 것
export function roundTakeaways(r: RoundReview, season: LeagueSummary): string[] {
  const s = r.summary;
  const out: string[] = [];
  if (!s.matches) return out;
  if (pct(s.homeWins, s.matches) >= 60) {
    out.push(`홈 팀이 ${pct(s.homeWins, s.matches)}%의 경기를 이겼습니다. 한 라운드의 홈 강세는 우연일 때가 많지만, 시즌 전체 홈 승률(${pct(season.homeWins, season.matches)}%)과 함께 보면 리그의 홈 이점을 가늠할 수 있습니다.`);
  } else if (pct(s.awayWins, s.matches) >= 50) {
    out.push(`원정 팀이 절반 이상의 경기를 이겼습니다. 원정 승리가 몰리는 라운드는 흔치 않아, 이번 라운드 순위 변동이 평소보다 컸던 이유이기도 합니다.`);
  }
  if (pct(s.draws, s.matches) >= 40) {
    out.push(`무승부가 ${s.draws}경기로 많았습니다. 무승부가 쌓이면 중위권 팀들의 승점이 촘촘해져 다음 몇 라운드 결과에 따라 순위가 크게 바뀔 수 있습니다.`);
  }
  if (s.firstHalfGoals + s.secondHalfGoals > 0 && pct(s.secondHalfGoals, s.firstHalfGoals + s.secondHalfGoals) >= 65) {
    out.push(`골의 ${pct(s.secondHalfGoals, s.firstHalfGoals + s.secondHalfGoals)}%가 후반에 나왔습니다. 교체 카드와 체력이 승부를 가른 경기가 많았다는 뜻으로 읽을 수 있습니다.`);
  }
  const winStreak = r.streaks.find((t) => t.kind === "win");
  if (winStreak) {
    out.push(`${winStreak.team.shortName}의 ${winStreak.length}연승이 이어지고 있습니다. 연승 기간의 득실점을 함께 보면 실력으로 쌓은 흐름인지, 접전을 잘 버틴 결과인지 가늠할 수 있습니다.`);
  }
  if (r.matchday <= 5) {
    out.push(`아직 시즌 초반이라 순위표는 일정의 영향을 크게 받습니다. 강팀을 먼저 만난 팀의 순위는 실제 전력보다 낮게 보일 수 있으니, 10라운드 전후까지는 경기당 득실점을 함께 보는 편이 좋습니다.`);
  }
  return out;
}

export function roundDescription(leagueName: string, r: RoundReview) {
  const s = r.summary;
  const leader = r.table[0]?.row;
  return (
    `${leagueName} ${r.matchday}라운드 ${s.matches}경기 결과와 순위 변동. ${s.goals}골(경기당 ${fixed(s.goalsPerGame)}골), ` +
    `홈 ${s.homeWins}승 · 무 ${s.draws} · 원정 ${s.awayWins}승` +
    (leader ? `, 라운드 후 선두 ${leader.team.shortName}` : "") +
    (r.upsets.length ? `, 이변과 역전승, 연승 기록까지 정리했습니다.` : `, 역전승과 연승 기록까지 정리했습니다.`)
  );
}

// ── 리그 통계 ─────────────────────────

function names(rows: TeamStats[]) {
  return rows.map((r) => r.team.shortName).join(", ");
}

function top(rows: TeamStats[], value: (r: TeamStats) => number, dir: "max" | "min" = "max") {
  const valid = rows.filter((r) => r.played > 0 && Number.isFinite(value(r)));
  if (!valid.length) return null;
  const best = dir === "max" ? Math.max(...valid.map(value)) : Math.min(...valid.map(value));
  return { value: best, rows: valid.filter((r) => value(r) === best) };
}

export function leagueParagraphs(leagueName: string, s: LeagueSummary, avg: LeagueSummary, teams: TeamStats[]): string[] {
  const out: string[] = [];
  if (!s.matches) return [`${leagueName} 이번 시즌은 아직 끝난 경기가 없습니다.`];

  out.push(
    `이번 시즌 ${leagueName}에서는 지금까지 ${s.matches}경기가 열려 ${s.goals}골이 나왔습니다. 경기당 ${fixed(s.goalsPerGame)}골로, ` +
      `5대 리그 전체 평균(${fixed(avg.goalsPerGame)}골)과 비교하면 ${compare(s.goalsPerGame, avg.goalsPerGame, "골", "많습니다.", "적습니다.", "비슷한 수준입니다.")}`,
  );

  const home = pct(s.homeWins, s.matches);
  const away = pct(s.awayWins, s.matches);
  const draw = pct(s.draws, s.matches);
  out.push(
    `홈 팀 승률은 ${home}%, 원정 팀 승률은 ${away}%, 무승부는 ${draw}%입니다. ` +
      (home - away >= 20
        ? "홈과 원정의 차이가 큰 편이라, 이 리그에서는 남은 일정 가운데 홈 경기가 몇 번 남았는지가 순위 예측에 중요합니다."
        : home - away <= 5
          ? "홈 이점이 거의 보이지 않는 시즌입니다. 원정에서도 승점을 쌓는 팀이 많다는 뜻이어서, 순위표 중간이 두텁게 뭉쳐 있을 가능성이 큽니다."
          : "홈 팀이 조금 더 유리한, 유럽 리그의 일반적인 흐름과 비슷합니다."),
  );

  const attack = top(teams, (t) => t.goalsFor / t.played);
  const defense = top(teams, (t) => t.goalsAgainst / t.played, "min");
  if (attack && defense) {
    out.push(
      `경기당 득점이 가장 많은 팀은 ${names(attack.rows)}입니다(${fixed(attack.value)}골). ` +
        `경기당 실점이 가장 적은 팀은 ${names(defense.rows)}입니다(${fixed(defense.value)}골). ` +
        (attack.rows.some((a) => defense.rows.some((d) => d.team.id === a.team.id))
          ? "공격과 수비 1위가 같은 팀이라는 점에서, 현재 리그의 전력 구도가 뚜렷하게 드러납니다."
          : "공격 1위와 수비 1위가 서로 다른 팀이라, 두 팀이 맞붙는 경기가 이번 시즌 흐름을 가늠할 좋은 기준이 됩니다."),
    );
  }

  const comeback = top(teams, (t) => t.pointsFromBehind);
  const dropped = top(teams, (t) => t.pointsDroppedFromLead);
  if (comeback && comeback.value > 0) {
    out.push(
      `전반을 뒤진 경기에서 가장 많은 승점을 가져온 팀은 ${names(comeback.rows)}입니다(${comeback.value}점).` +
        (dropped && dropped.value > 0
          ? ` 반대로 전반을 앞서고도 가장 많은 승점을 놓친 팀은 ${names(dropped.rows)}입니다(${dropped.value}점). 리드를 지키는 힘은 시즌 후반 순위 싸움에서 큰 차이를 만듭니다.`
          : ""),
    );
  }

  const halves = s.firstHalfGoals + s.secondHalfGoals;
  if (halves) {
    const second = pct(s.secondHalfGoals, halves);
    out.push(
      `골의 ${second}%가 후반에 나왔습니다. ` +
        (second >= 58
          ? "후반 비중이 높은 편으로, 교체 선수의 질과 체력 관리가 결과에 큰 영향을 주는 리그라고 볼 수 있습니다."
          : second <= 50
            ? "전반에도 골이 활발하게 나오는 편이라, 초반 기싸움이 경기 흐름을 좌우하는 경우가 많습니다."
            : "일반적으로 후반에 골이 조금 더 많이 나오는데, 이 리그도 그 흐름을 따르고 있습니다."),
    );
  }

  return out;
}
