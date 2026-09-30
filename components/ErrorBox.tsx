import { DataError } from "@/lib/data";

export function ErrorBox({ error }: { error: unknown }) {
  let message = "데이터를 불러오지 못했습니다.";
  if (error instanceof DataError && error.kind === "not_synced") {
    message = "아직 수집된 데이터가 없습니다. 10분 안에 자동으로 수집됩니다.";
  }
  return <div className="error">{message}</div>;
}
