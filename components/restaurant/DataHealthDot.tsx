"use client";

import * as React from "react";

type HealthResponse = {
  latest_day?: string | null;
  last_ingested_at?: string | null;
  rows_24h?: string | number | null;
};

function daysDiffFromToday(dateIso: string) {
  const d = new Date(dateIso);
  if (!Number.isFinite(d.getTime())) return null;

  const today = new Date();
  const a = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const b = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  return Math.round((a - b) / 86400000);
}

function toInt(v: any) {
  if (v === null || v === undefined) return 0;
  const n = typeof v === "string" ? Number(v) : v;
  return Number.isFinite(n) ? Math.trunc(n) : 0;
}

export function DataHealthDot({ className = "" }: { className?: string }) {
  const [data, setData] = React.useState<HealthResponse | null>(null);

  React.useEffect(() => {
    let alive = true;

    async function fetchHealth() {
      try {
        const r = await fetch("/api/restaurant/data-status", { cache: "no-store" });
        if (!r.ok) return;
        const j = await r.json();
        if (alive) setData(j);
      } catch {}
    }

    fetchHealth();
    const id = setInterval(fetchHealth, 60000); // poll every 60s

    return () => {
      alive = false;
      clearInterval(id);
    };
  }, []);

  const latestDay = data?.latest_day ?? null;
  const rows = toInt(data?.rows_24h);
  const dayAge = latestDay ? daysDiffFromToday(latestDay) : null;

  const status: "green" | "amber" | "red" = (() => {
    if (rows > 0) return "green";
    if (dayAge === null) return "red";
    if (dayAge <= 1) return "green";
    if (dayAge <= 3) return "amber";
    return "red";
  })();

  const dotCls =
    status === "green"
      ? "bg-emerald-400"
      : status === "amber"
      ? "bg-amber-400"
      : "bg-rose-400";

  const ringCls =
    status === "green"
      ? "bg-emerald-400/20"
      : status === "amber"
      ? "bg-amber-400/20"
      : "bg-rose-400/15";

  // Animations:
  // - Green: realistic lub-dub (two beats + rest)
  // - Amber: slow pulse (warning)
  // - Red: no animation
  const ringAnim =
    status === "green"
      ? "animate-[pulseRingLubDub_1.6s_ease-out_infinite]"
      : status === "amber"
      ? "animate-[pulseRingSlow_2.6s_ease-out_infinite]"
      : "";

  const dotAnim =
    status === "green"
      ? "animate-[heartLubDub_1.6s_ease-in-out_infinite]"
      : status === "amber"
      ? "animate-[heartSlow_2.6s_ease-in-out_infinite]"
      : "";

  return (
    <>
      <span className={`relative inline-flex h-3 w-3 items-center justify-center ${className}`}>
        {/* ring */}
        <span className={`absolute inset-0 rounded-full ${ringCls} ${ringAnim}`} />
        {/* dot */}
        <span className={`relative h-2 w-2 rounded-full ${dotCls} ${dotAnim}`} />
      </span>

      <style jsx global>{`
        /* GREEN: ring expands twice (lub-dub), then rests */
        @keyframes pulseRingLubDub {
          0%   { transform: scale(1);   opacity: 0.55; }
          12%  { transform: scale(2.05); opacity: 0; }     /* LUB */
          22%  { transform: scale(1.05); opacity: 0.25; }  /* reset */
          34%  { transform: scale(2.10); opacity: 0; }     /* DUB */
          100% { transform: scale(2.10); opacity: 0; }     /* rest */
        }

        /* GREEN: dot does a subtle double beat */
        @keyframes heartLubDub {
          0%, 100% { transform: scale(1); }
          10%      { transform: scale(1.10); }  /* LUB up */
          16%      { transform: scale(0.92); }  /* LUB down */
          22%      { transform: scale(1.02); }  /* rebound */
          32%      { transform: scale(1.12); }  /* DUB up */
          38%      { transform: scale(0.94); }  /* DUB down */
          46%      { transform: scale(1); }     /* settle */
        }

        /* AMBER: slow gentle pulse */
        @keyframes pulseRingSlow {
          0%   { transform: scale(1);   opacity: 0.45; }
          70%  { transform: scale(2.2); opacity: 0; }
          100% { transform: scale(2.2); opacity: 0; }
        }

        @keyframes heartSlow {
          0%, 100% { transform: scale(1); }
          50%      { transform: scale(1.06); }
        }

        @media (prefers-reduced-motion: reduce) {
          .animate-\$begin:math:display$pulseRingLubDub\_1\\\\\.6s\_ease\-out\_infinite\\$end:math:display$,
          .animate-\$begin:math:display$pulseRingSlow\_2\\\\\.6s\_ease\-out\_infinite\\$end:math:display$,
          .animate-\$begin:math:display$heartLubDub\_1\\\\\.6s\_ease\-in\-out\_infinite\\$end:math:display$,
          .animate-\$begin:math:display$heartSlow\_2\\\\\.6s\_ease\-in\-out\_infinite\\$end:math:display$ {
            animation: none !important;
          }
        }
      `}</style>
    </>
  );
}