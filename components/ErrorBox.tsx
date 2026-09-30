import { FootballApiError } from "@/lib/api";

export function ErrorBox({ error }: { error: unknown }) {
  let message = "데이터를 불러오지 못했습니다.";
  if (error instanceof FootballApiError) {
    if (error.status === 429) message = "API 요청 한도(분당 10회)를 초과했습니다. 잠시 후 새로고침해 주세요.";
    else if (error.status === 403) message = "이 리그는 현재 API 플랜에서 제공되지 않습니다.";
    else message = error.message;
  }
  return <div className="error">{message}</div>;
}
