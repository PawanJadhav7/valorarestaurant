// components/restaurant/DataFreshnessPill.tsx
"use client";

import * as React from "react";

type DataStatus = {
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

export function DataFreshnessPill({
  className = "",
  greenDays = 1,
  amberDays = 3,
}: {
  className?: string;
  greenDays?: number;
  amberDays?: number;
}) {
  const [s, setS] = React.useState<DataStatus | null>(null);

  React.useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch("/api/restaurant/data-status", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const j = (await r.json()) as DataStatus;
        if (alive) setS(j);
      } catch {
        if (alive) setS({ ok: false });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const rows24h = toInt(s?.rows_24h ?? 0);
  const dayAge = s?.latest_day ? daysDiffFromToday(s.latest_day) : null;

  const status: "green" | "amber" | "red" = (() => {
    if (!s?.ok) return "red";
    if (rows24h > 0) return "green";
    if (dayAge === null) return "red";
    if (dayAge <= greenDays) return "green";
    if (dayAge <= amberDays) return "amber";
    return "red";
  })();

  const label =
    status === "green" ? "Data: Fresh" : status === "amber" ? "Data: Watch" : "Data: Action";

  const pillCls =
    status === "green"
      ? "border-emerald-400/30 bg-emerald-400/10 text-emerald-200"
      : status === "amber"
      ? "border-amber-400/30 bg-amber-400/10 text-amber-200"
      : "border-rose-400/30 bg-rose-400/10 text-rose-200";

  const tooltip = s?.ok
    ? [
        `Latest day: ${fmtDate(s.latest_day)}`,
        `Last ingested: ${fmtDate(s.last_ingested_at)}`,
        `Rows (24h): ${rows24h}`,
        `Total rows: ${s.total_rows ?? "—"}`,
        `Locations: ${s.locations ?? "—"}`,
        s.last_source_file ? `Last file: ${s.last_source_file}` : null,
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
      {s?.ok ? (
        <span className="ml-1 text-[11px] opacity-70">
          • {rows24h > 0 ? "updated" : dayAge === null ? "unknown" : `${dayAge}d old`}
        </span>
      ) : null}
    </span>
  );
}