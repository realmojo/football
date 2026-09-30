import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ErrorBox } from "@/components/ErrorBox";
import { ScheduleDay } from "@/components/ScheduleDay";
import { getAllSeasonMatches, getH2hIndex, getKoreanPlayers, type KoreanPlayer } from "@/lib/data";
import { formatKstDay, kstDate } from "@/lib/format";
import { koreansByTeam } from "@/lib/korean";
import { leaguePositions } from "@/lib/positions";
import { dayDescription, dayParagraphs, isYmd, matchDates, matchesOn } from "@/lib/schedule";
import type { Match } from "@/lib/types";

export const dynamic = "force-dynamic";

type Params = Promise<{ date: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { date } = await params;
  if (!isYmd(date)) return {};
  const [matches, players] = await Promise.all([
    getAllSeasonMatches().catch(() => [] as Match[]),
    getKoreanPlayers().catch(() => [] as KoreanPlayer[]),
  ]);
  const day = matchesOn(matches, date);
  const past = date < kstDate(new Date());
  return {
    title: `${formatKstDay(date)} 해외축구 ${past ? "결과" : "일정"} · 한국시간 경기 시간`,
    description: day.length ? dayDescription(date, day, koreansByTeam(players)) : `${formatKstDay(date)} 해외축구 일정`,
    alternates: { canonical: `/schedule/${date}` },
    robots: day.length ? undefined : { index: false },
  };
}

export default async function ScheduleDatePage({ params }: { params: Params }) {
  const { date } = await params;
  if (!isYmd(date)) notFound();

  let matches: Match[];
  let players: KoreanPlayer[];
  let positions: Map<number, number>;
  let h2h: Set<number>;
  try {
    let index: Awaited<ReturnType<typeof getH2hIndex>>;
    [matches, players, positions, index] = await Promise.all([
      getAllSeasonMatches(),
      getKoreanPlayers(),
      leaguePositions(),
      getH2hIndex().catch(() => []),
    ]);
    h2h = new Set(index.map((r) => r.match_id));
  } catch (e) {
    return <ErrorBox error={e} />;
  }

  const byTeam = koreansByTeam(players);
  const day = matchesOn(matches, date);
  const dates = matchDates(matches);
  const prev = [...dates].reverse().find((d) => d < date);
  const next = dates.find((d) => d > date);
  const today = kstDate(new Date());

  return (
    <article className="review">
      <p className="crumbs-bar">
        <a href="/schedule">해외축구 일정</a> · {formatKstDay(date)}
      </p>
      <div className="round-nav">
        {prev ? <a href={`/schedule/${prev}`}>← {formatKstDay(prev)}</a> : <span />}
        <strong className="day-title">
          {formatKstDay(date)}
          {date === today ? <small>오늘</small> : null}
        </strong>
        {next ? <a href={`/schedule/${next}`}>{formatKstDay(next)} →</a> : <span />}
      </div>

      <div className="prose review-lead">
        <h1 className="sr-title">
          {formatKstDay(date)} 해외축구 {date < today ? "결과" : "일정"}
        </h1>
        {dayParagraphs(date, day, byTeam, positions).map((p, i) => (
          <p key={i}>{p}</p>
        ))}
      </div>

      <ScheduleDay matches={day} byTeam={byTeam} h2h={h2h} />

      <p className="muted note">
        모든 시간은 한국시간(KST) 기준입니다. 경기 일정은 방송 편성과 대회 사정에 따라 바뀔 수 있으며, 약 10분마다 새 정보를
        반영합니다. 한국 선수 표시는 소속팀 기준이며 실제 출전 여부와는 다를 수 있습니다.
      </p>
    </article>
  );
}
