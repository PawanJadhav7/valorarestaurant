//frontend/components/restaurant/ MenuEngineeringChart.tsx
"use client";

import * as React from "react";

export type MatrixPoint = {
  item_name: string;
  category: string;
  quantity_sold: number;
  revenue: string;
  gross_profit: string;
  margin_per_unit: string;
  engineering_bucket: string;
  avg_qty: string;
  avg_margin: string;
};

function bucketColor(bucket: string) {
  switch ((bucket ?? "").toLowerCase()) {
    case "star":
      return "#34d399";
    case "plowhorse":
      return "#60a5fa";
    case "puzzle":
      return "#f59e0b";
    case "dog":
      return "#f87171";
    default:
      return "#a1a1aa";
  }
}

function fmtUsd(v: string | number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(Number(v ?? 0));
}

function bubbleRadius(revenue: number, minRev: number, maxRev: number) {
  if (maxRev <= minRev) return 10;
  const t = (revenue - minRev) / (maxRev - minRev);
  return 7 + t * 15;
}

function BubbleSizeLegend() {
  return (
    <div className="inline-flex items-end gap-4 rounded-xl border border-border/50 bg-background/70 px-3 py-2 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
      <div className="font-medium text-foreground">Bubble size</div>

      <div className="flex items-end gap-2">
        <div className="flex flex-col items-center gap-1">
          <span className="inline-block h-3 w-3 rounded-full bg-muted-foreground/70" />
          <span>Low</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="inline-block h-5 w-5 rounded-full bg-muted-foreground/70" />
          <span>Mid</span>
        </div>

        <div className="flex flex-col items-center gap-1">
          <span className="inline-block h-7 w-7 rounded-full bg-muted-foreground/70" />
          <span>High</span>
        </div>
      </div>
    </div>
  );
}

export function MenuEngineeringChart({ points }: { points: MatrixPoint[] }) {
  const w = 820;
  const h = 460;
  const pad = 58;

  const [hoveredKey, setHoveredKey] = React.useState<string | null>(null);
  const [hovered, setHovered] = React.useState<MatrixPoint | null>(null);
  const [activeBucket, setActiveBucket] = React.useState<string>("all");

  const visiblePoints = points;

  const qtys = visiblePoints.map((p) => Number(p.quantity_sold ?? 0));
  const margins = visiblePoints.map((p) => Number(p.margin_per_unit ?? 0));
  const revenues = visiblePoints.map((p) => Number(p.revenue ?? 0));

  const minX = 0;
  const maxX = Math.max(...qtys, 1);
  const minY = 0;
  const maxY = Math.max(...margins, 1);

  const minRev = Math.min(...revenues, 0);
  const maxRev = Math.max(...revenues, 1);

  const avgQty =
  visiblePoints.length > 0 ? Number(visiblePoints[0]?.avg_qty ?? 0) : 0;

const avgMargin =
  visiblePoints.length > 0 ? Number(visiblePoints[0]?.avg_margin ?? 0) : 0;

  const sx = (v: number) =>
    pad + ((v - minX) / (maxX - minX || 1)) * (w - pad * 2);

  const sy = (v: number) =>
    h - pad - ((v - minY) / (maxY - minY || 1)) * (h - pad * 2);

  const legend = [
    { key: "all", label: "All", color: "#a1a1aa" },
    { key: "star", label: "Stars", color: bucketColor("star") },
    { key: "plowhorse", label: "Plowhorses", color: bucketColor("plowhorse") },
    { key: "puzzle", label: "Puzzles", color: bucketColor("puzzle") },
    { key: "dog", label: "Dogs", color: bucketColor("dog") },
  ];

  return (
  <div className="rounded-2xl border border-border bg-card p-4">
    {/* Top header row */}
    <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
      <div className="min-w-0">
        <div className="text-sm font-semibold text-foreground">
          Interactive Menu Engineering Matrix
        </div>
        <div className="mt-1 text-xs text-muted-foreground">
          Bubble size = revenue, X = popularity, Y = margin per unit.
        </div>

        <div className="mt-4 flex flex-wrap gap-2">
          {legend.map((l) => {
            const active = activeBucket === l.key;
            return (
              <button
                key={l.key}
                onClick={() => setActiveBucket(l.key)}
                className={`inline-flex items-center gap-2 rounded-xl border px-3 py-1.5 text-sm transition ${
                  active
                    ? "border-border bg-background text-foreground shadow-sm"
                    : "border-border/60 bg-background/40 text-muted-foreground hover:bg-background/70"
                }`}
              >
                <span
                  className="inline-block h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: l.color }}
                />
                {l.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="shrink-0 xl:pt-0.5">
        <BubbleSizeLegend />
      </div>
    </div>

    <div className="relative mt-4">
      {hovered ? (
        <div className="absolute right-2 top-2 z-10 rounded-xl border border-border bg-background px-3 py-2 text-xs shadow-sm">
          <div className="font-semibold text-foreground">{hovered.item_name}</div>
          <div className="text-muted-foreground">{hovered.category}</div>
          <div className="mt-1 text-muted-foreground">
            Qty: <span className="text-foreground">{hovered.quantity_sold}</span>
          </div>
          <div className="text-muted-foreground">
            Revenue: <span className="text-foreground">{fmtUsd(hovered.revenue)}</span>
          </div>
          <div className="text-muted-foreground">
            Profit: <span className="text-foreground">{fmtUsd(hovered.gross_profit)}</span>
          </div>
          <div className="text-muted-foreground">
            Margin/unit:{" "}
            <span className="text-foreground">
              ${Number(hovered.margin_per_unit).toFixed(2)}
            </span>
          </div>
          <div className="text-muted-foreground">
            Bucket:{" "}
            <span className="capitalize text-foreground">
              {hovered.engineering_bucket}
            </span>
          </div>
        </div>
      ) : null}

      {/* overlay quadrant guides */}
      <div className="pointer-events-none absolute inset-0 z-[1]">
        <div className="absolute left-5 top-4 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          🧩 Puzzles
        </div>
        <div className="absolute right-5 top-4 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          ⭐ Stars
        </div>
        <div className="absolute left-5 bottom-4 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          🐶 Dogs
        </div>
        <div className="absolute right-5 bottom-4 rounded-full border border-border/50 bg-background/70 px-2.5 py-1 text-[11px] text-muted-foreground shadow-sm backdrop-blur">
          🐴 Plowhorses
        </div>
      </div>

      <svg viewBox={`0 0 ${w} ${h}`} className="h-[460px] w-full">
        {/* quadrant backgrounds */}
        <rect
          x={pad}
          y={pad}
          width={(w - pad * 2) / 2}
          height={(h - pad * 2) / 2}
          fill="rgba(245,158,11,0.06)"
        />
        <rect
          x={pad + (w - pad * 2) / 2}
          y={pad}
          width={(w - pad * 2) / 2}
          height={(h - pad * 2) / 2}
          fill="rgba(52,211,153,0.06)"
        />
        <rect
          x={pad}
          y={pad + (h - pad * 2) / 2}
          width={(w - pad * 2) / 2}
          height={(h - pad * 2) / 2}
          fill="rgba(248,113,113,0.06)"
        />
        <rect
          x={pad + (w - pad * 2) / 2}
          y={pad + (h - pad * 2) / 2}
          width={(w - pad * 2) / 2}
          height={(h - pad * 2) / 2}
          fill="rgba(96,165,250,0.06)"
        />

        {/* outer axes */}
        <line
          x1={pad}
          y1={h - pad}
          x2={w - pad}
          y2={h - pad}
          stroke="currentColor"
          opacity="0.18"
        />
        <line
          x1={pad}
          y1={pad}
          x2={pad}
          y2={h - pad}
          stroke="currentColor"
          opacity="0.18"
        />

        {/* benchmark crosshair lines */}
        <line
          x1={sx(avgQty)}
          y1={pad}
          x2={sx(avgQty)}
          y2={h - pad}
          stroke="currentColor"
          opacity="0.28"
          strokeDasharray="7 7"
        />
        <line
          x1={pad}
          y1={sy(avgMargin)}
          x2={w - pad}
          y2={sy(avgMargin)}
          stroke="currentColor"
          opacity="0.28"
          strokeDasharray="7 7"
        />

        {/* benchmark labels */}
        <g>
          <rect
            x={sx(avgQty) - 40}
            y={h - pad + 8}
            width="80"
            height="20"
            rx="10"
            fill="rgba(255,255,255,0.06)"
          />
          <text
            x={sx(avgQty)}
            y={h - pad + 22}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.7"
          >
            Avg Qty
          </text>
        </g>

        <g>
          <rect
            x={pad - 2}
            y={sy(avgMargin) - 10}
            width="82"
            height="20"
            rx="10"
            fill="rgba(255,255,255,0.06)"
          />
          <text
            x={pad + 39}
            y={sy(avgMargin) + 4}
            textAnchor="middle"
            fontSize="10"
            fill="currentColor"
            opacity="0.7"
          >
            Avg Margin
          </text>
        </g>

        {/* point bubbles */}
        {visiblePoints.map((p, i) => {
          const x = sx(Number(p.quantity_sold ?? 0));
          const y = sy(Number(p.margin_per_unit ?? 0));
          const revenue = Number(p.revenue ?? 0);
          const color = bucketColor(p.engineering_bucket);
          const r = bubbleRadius(revenue, minRev, maxRev);

          const pointBucket = (p.engineering_bucket ?? "").toLowerCase();
          const isActive = activeBucket === "all" || pointBucket === activeBucket;

          const key = `${p.item_name}-${i}`;
          const isHovered = hoveredKey === key;

          return (
            <g key={`${p.item_name}-${i}`}>
              <circle
                cx={x}
                cy={y}
                r={isHovered ? r + 3 : r}
                fill={color}
                fillOpacity={isActive ? 0.82 : 0.16}
                stroke="white"
                strokeOpacity={isActive ? 0.35 : 0.12}
                strokeWidth={isHovered ? 1.8 : 1.2}
                onMouseEnter={() => {
                  setHovered(p);
                  setHoveredKey(key);
                }}
                onMouseLeave={() => {
                  setHovered(null);
                  setHoveredKey(null);
                }}
                 style={{
                  cursor: "pointer",
                  transition: "r 180ms ease, stroke-width 180ms ease, fill-opacity 180ms ease",
                }}
              />
              <text
                x={x}
                y={y - r - 6}
                textAnchor="middle"
                fontSize="10"
                fill="currentColor"
                opacity={isHovered ? 0.95 : isActive ? 0.72 : 0.22}
              >
                {p.item_name.length > 14 ? `${p.item_name.slice(0, 14)}…` : p.item_name}
              </text>
            </g>
          );
        })}

        {/* axis labels */}
        <text
          x={w / 2}
          y={h - 12}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          opacity="0.75"
        >
          Popularity (Quantity Sold)
        </text>

        <text
          x={18}
          y={h / 2}
          textAnchor="middle"
          fontSize="12"
          fill="currentColor"
          opacity="0.75"
          transform={`rotate(-90 18 ${h / 2})`}
        >
          Profitability (Margin per Unit)
        </text>
      </svg>
    </div>
  </div>
);
}