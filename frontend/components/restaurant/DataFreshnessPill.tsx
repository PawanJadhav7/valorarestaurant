"use client";

import * as React from "react";

export type DataStatus = {
  ok: boolean;
  now?: string;
  latest_day?: string | null;
  last_ingested_at?: string | null;
  rows_24h?: string | number | null;
  total_rows?: string | number | null;
  locations?: string | number | null;
  last_source_file?: string | null;
};

function daysDiffFromToday(dateIso: string) {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return null;

  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

function toInt(v: string | number | null | undefined) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

function fmtDate(iso?: string | null) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (!Number.isFinite(d.getTime())) return "—";
  return d.toLocaleString();
}

type Props = {
  className?: string;
  greenDays?: number;
  amberDays?: number;

  /** Optional controlled props (TopBar can pass these). If omitted, pill self-fetches. */
  latestDay?: string | null;
  lastIngestedAt?: string | null;
  rows24h?: string | number | null;
  totalRows?: string | number | null;
  locations?: string | number | null;
  lastFile?: string | null;
  ok?: boolean;
};

export function DataFreshnessPill({
  className = "",
  greenDays = 1,
  amberDays = 3,
  latestDay,
  lastIngestedAt,
  rows24h,
  totalRows,
  locations,
  lastFile,
  ok,
}: Props) {
  const isControlled =
    ok !== undefined ||
    latestDay !== undefined ||
    lastIngestedAt !== undefined ||
    rows24h !== undefined ||
    totalRows !== undefined ||
    locations !== undefined ||
    lastFile !== undefined;

  const [s, setS] = React.useState<DataStatus | null>(null);

  React.useEffect(() => {
    if (isControlled) return;

    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/restaurant/data-status", { cache: "no-store" });
        const j = (await r.json()) as DataStatus;
        if (alive) setS(j);
      } catch {
        if (alive) setS({ ok: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, [isControlled]);

  const dataOk = isControlled ? Boolean(ok ?? true) : Boolean(s?.ok);
  const _latestDay = isControlled ? (latestDay ?? null) : (s?.latest_day ?? null);
  const _lastIngestedAt = isControlled ? (lastIngestedAt ?? null) : (s?.last_ingested_at ?? null);
  const _rows24h = toInt(isControlled ? rows24h : s?.rows_24h);
  const _totalRows = isControlled ? totalRows : s?.total_rows;
  const _locations = isControlled ? locations : s?.locations;
  const _lastFile = isControlled ? lastFile : s?.last_source_file;

  const dayAge = _latestDay ? daysDiffFromToday(_latestDay) : null;

  const status: "green" | "amber" | "red" = (() => {
    if (!dataOk) return "red";
    if (_rows24h > 0) return "green";
    if (dayAge === null) return "red";
    if (dayAge <= greenDays) return "green";
    if (dayAge <= amberDays) return "amber";
    return "red";
  })();

  const label = status === "green" ? "Data: Fresh" : status === "amber" ? "Data: Watch" : "Data: Action";

  const pillCls =
  status === "green"
    ? "border-emerald-400/30 bg-emerald-400/10 !text-foreground"
    : status === "amber"
    ? "border-amber-400/30 bg-amber-400/10 !text-foreground"
    : "border-rose-400/30 bg-rose-400/10 !text-foreground";
    
  const tooltip = dataOk
    ? [
        `Latest day: ${fmtDate(_latestDay)}`,
        `Last ingested: ${fmtDate(_lastIngestedAt)}`,
        `Rows (24h): ${_rows24h}`,
        `Total rows: ${_totalRows ?? "—"}`,
        `Locations: ${_locations ?? "—"}`,
        _lastFile ? `Last file: ${_lastFile}` : null,
      ]
        .filter(Boolean)
        .join("\n")
    : "Data status unavailable";

  return (
    <span
      title={tooltip}
      className={[
        "inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-medium",
        "glass backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.06)]",
        pillCls,
        className,
      ].join(" ")}
    >
      <span className="h-2 w-2 rounded-full bg-current opacity-80" />
      {label}
      {dataOk ? (
        <span className="ml-1 text-[11px] opacity-70">
          • {_rows24h > 0 ? "updated" : dayAge === null ? "unknown" : `${dayAge}d old`}
        </span>
      ) : null}
    </span>
  );
}