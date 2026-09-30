export function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="stat">
      <span>{label}</span>
      <strong>
        {value}
        {sub ? <small>{sub}</small> : null}
      </strong>
    </div>
  );
}
