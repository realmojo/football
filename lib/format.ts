const TZ = "Asia/Seoul";

export function formatKickoff(utc: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    month: "numeric",
    day: "numeric",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(utc));
}

export function formatDateHeading(utc: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    year: "numeric",
    month: "long",
    day: "numeric",
    weekday: "long",
  }).format(new Date(utc));
}

export function formatTime(utc: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(new Date(utc));
}

export const STATUS_LABEL: Record<string, string> = {
  SCHEDULED: "예정",
  TIMED: "예정",
  IN_PLAY: "진행중",
  PAUSED: "하프타임",
  FINISHED: "종료",
  SUSPENDED: "중단",
  POSTPONED: "연기",
  CANCELLED: "취소",
  AWARDED: "몰수",
};

export function formatDay(utc: string) {
  return new Intl.DateTimeFormat("ko-KR", {
    timeZone: TZ,
    month: "numeric",
    day: "numeric",
    weekday: "short",
  }).format(new Date(utc));
}

// 한국시간 기준 날짜 "YYYY-MM-DD"
export function kstDate(utc: string | Date) {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(utc),
  );
}

// "YYYY-MM-DD" → "10월 4일(토)"
export function formatKstDay(ymd: string) {
  const d = new Date(`${ymd}T12:00:00+09:00`);
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, weekday: "short" }).format(d);
  const [, m, day] = ymd.split("-").map(Number);
  return `${m}월 ${day}일(${weekday})`;
}

// 한국시간 시각 (0~23)
export function kstHour(utc: string) {
  return Number(new Intl.DateTimeFormat("en-GB", { timeZone: TZ, hour: "2-digit", hour12: false }).format(new Date(utc))) % 24;
}

// "2026년 1월 31일" (한국시간)
export function formatFullDate(utc: string) {
  return new Intl.DateTimeFormat("ko-KR", { timeZone: TZ, year: "numeric", month: "long", day: "numeric" }).format(
    new Date(utc),
  );
}
