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
