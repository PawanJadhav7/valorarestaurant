"use client";

type Props = {
  x: number[];
  y: number[];
  height?: number;
};

export function SimpleLineChart({ x, y, height = 120 }: Props) {
  if (!Array.isArray(x) || !Array.isArray(y) || x.length < 2 || y.length < 2 || x.length !== y.length) {
    return <div className="text-xs text-muted-foreground">No chart data</div>;
  }

  const w = 320; // internal svg width (viewBox)
  const h = height;
  const pad = 18;

  const minY = Math.min(...y);
  const maxY = Math.max(...y);
  const denom = maxY - minY || 1;

  const scaleX = (i: number) => pad + (i * (w - 2 * pad)) / (x.length - 1);
  const scaleY = (val: number) => {
    const ratio = (val - minY) / denom; // 0..1
    return h - pad - ratio * (h - 2 * pad);
  };

  const path = y
    .map((val, i) => `${i === 0 ? "M" : "L"} ${scaleX(i).toFixed(2)} ${scaleY(val).toFixed(2)}`)
    .join(" ");

  return (
    <div className="w-full overflow-x-auto">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full max-w-[420px] text-foreground">
        <path d={path} fill="none" stroke="currentColor" strokeWidth="2" opacity="0.9" />
        {y.map((val, i) => (
          <circle key={i} cx={scaleX(i)} cy={scaleY(val)} r="2.75" fill="currentColor" opacity="0.95" />
        ))}
      </svg>
      <div className="mt-1 text-[11px] text-muted-foreground">
        Range: {minY.toLocaleString()} → {maxY.toLocaleString()}
      </div>
    </div>
  );
}