import type { Result } from "@/lib/analysis";

const LABEL: Record<Result, string> = { W: "승", D: "무", L: "패" };

export function FormBadge({ result }: { result: Result }) {
  return (
    <i className={`res res-${result}`} title={LABEL[result]}>
      {LABEL[result]}
    </i>
  );
}

// form 문자열 ("W,D,L,W,W", 최신순) 을 배지로 표시
export function FormString({ form }: { form: string | null }) {
  if (!form) return <span className="muted">-</span>;
  return (
    <span className="form">
      {form
        .split(",")
        .filter((r): r is Result => r === "W" || r === "D" || r === "L")
        .map((r, i) => (
          <FormBadge key={i} result={r} />
        ))}
    </span>
  );
}
