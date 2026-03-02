"use client";

import * as React from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  CartesianGrid,
  XAxis,
  YAxis,
  Tooltip,
  Bar,
  Line,
} from "recharts";

type Row = {
  day: string; // YYYY-MM-DD
  entity_id: string;
  net_sales: number;
  net_sales_ma3: number;
};

function money(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

// ✅ Safari-safe date parse
function parseYmd(ymd: string): Date | null {
  if (!ymd) return null;
  const parts = ymd.split("-").map((x) => Number(x));
  if (parts.length !== 3) return null;
  const [y, m, d] = parts;
  if (!y || !m || !d) return null;
  const dt = new Date(y, m - 1, d);
  return Number.isNaN(dt.getTime()) ? null : dt;
}

function formatMonthLabel(ymd: string) {
  const dt = parseYmd(ymd);
  if (!dt) return "—";
  return dt.toLocaleString("en-US", { month: "short", year: "numeric" });
}

function formatFullDate(ymd: string) {
  const dt = parseYmd(ymd);
  if (!dt) return "—";
  return dt.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
}

export function RevenueTrendChart(props: { entityId?: string; limit?: number }) {
  const entityId = props.entityId ?? "1";
  const limit = props.limit ?? 24;

  const [loading, setLoading] = React.useState(true);
  const [err, setErr] = React.useState<string | null>(null);
  const [data, setData] = React.useState<Row[]>([]);

  React.useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr(null);

        const res = await fetch(
          `/api/finance/revenue-trend?entityId=${encodeURIComponent(entityId)}&limit=${limit}`,
          { cache: "no-store", signal: ac.signal }
        );

        if (!res.ok) throw new Error(`revenue-trend HTTP ${res.status}`);

        const json = await res.json();
        const rows = (json?.data ?? []) as Row[];

        // ✅ normalize types defensively
        const normalized = rows.map((r) => ({
          day: String(r.day).slice(0, 10),
          entity_id: String(r.entity_id),
          net_sales: Number(r.net_sales ?? 0),
          net_sales_ma3: Number(r.net_sales_ma3 ?? 0),
        }));

        setData(normalized);
      } catch (e: any) {
        if (e?.name !== "AbortError") setErr(e?.message ?? String(e));
      } finally {
        setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [entityId, limit]);

  // compute range for nicer Y domain
  const maxY = React.useMemo(() => {
    const m = Math.max(
      0,
      ...data.map((d) => Math.max(d.net_sales ?? 0, d.net_sales_ma3 ?? 0))
    );
    if (!Number.isFinite(m) || m <= 0) return 1;
    return m * 1.15; // headroom
  }, [data]);

  if (loading) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Net Sales Trend</div>
        <div className="mt-2 text-sm text-muted-foreground">Loading…</div>
      </div>
    );
  }

  if (err) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Net Sales Trend</div>
        <div className="mt-2 text-sm text-danger">{err}</div>
      </div>
    );
  }

  if (!data.length) {
    return (
      <div className="rounded-2xl border border-border bg-card p-4">
        <div className="text-sm font-semibold text-foreground">Net Sales Trend</div>
        <div className="mt-2 text-sm text-muted-foreground">No data yet.</div>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="text-sm font-semibold text-foreground">Net Sales Trend</div>
          <div className="text-xs text-muted-foreground">
            Bars = Net Sales • Line = Moving Avg (3)
          </div>
        </div>

        <div className="text-[11px] text-muted-foreground">
          {formatMonthLabel(data[0].day)} → {formatMonthLabel(data[data.length - 1].day)}
        </div>
      </div>

      <div className="mt-4 h-80">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 16, left: 8, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" opacity={0.25} />

            <XAxis
              dataKey="day"
              tickFormatter={formatMonthLabel}
              tick={{ fontSize: 12 }}
              interval="preserveStartEnd"
              minTickGap={18}
            />

            <YAxis
              domain={[0, maxY]}
              tickFormatter={(v) => money(Number(v))}
              tick={{ fontSize: 12 }}
              width={88}
            />

            <Tooltip
              labelFormatter={(label) => formatFullDate(String(label))}
              formatter={(value, name) => {
                const v = Number(value ?? 0);
                if (name === "net_sales") return [money(v), "Net Sales"];
                if (name === "net_sales_ma3") return [money(v), "Moving Avg (3)"];
                return [String(value), String(name)];
              }}
              contentStyle={{
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.15)",
                background: "rgba(15,23,42,0.72)",
                backdropFilter: "blur(10px)",
              }}
              labelStyle={{ color: "rgba(226,232,240,0.9)" }}
              itemStyle={{ color: "rgba(226,232,240,0.9)" }}
            />

            {/* Bars + line (clean/premium) */}
            <Bar
              dataKey="net_sales"
              radius={[10, 10, 0, 0]}
              fill="rgba(148,163,184,0.35)"
              stroke="rgba(148,163,184,0.20)"
            />
            <Line
              type="monotone"
              dataKey="net_sales_ma3"
              stroke="rgba(56,189,248,0.95)"
              strokeWidth={2.5}
              dot={false}
            />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}