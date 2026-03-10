type Severity = "good" | "warn" | "risk";

export function SeverityBadge({ severity }: { severity: Severity }) {
  const styles =
    severity === "risk"
      ? "border-rose-500/30 bg-rose-500/10 text-rose-200"
      : severity === "warn"
      ? "border-amber-500/30 bg-amber-500/10 text-amber-200"
      : "border-emerald-500/30 bg-emerald-500/10 text-emerald-200";

  const label =
    severity === "risk"
      ? "⛔️ risk"
      : severity === "warn"
      ? "⚠️ warn"
      : "✅ good";

  return (
    <span
      className={`shrink-0 rounded-xl border px-2 py-1 text-[11px] font-medium ${styles}`}
    >
      {label}
    </span>
  );
}