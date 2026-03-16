// app/restaurant/menu-intelligence/menu-client.tsx
"use client";

import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
import {
  MenuEngineeringChart,
  type MatrixPoint,
} from "@/components/restaurant/MenuEngineeringChart";

type MatrixRow = {
  engineering_bucket: string;
  item_count: number;
  revenue: string;
  gross_profit: string;
};

type ItemRow = {
  item_name: string;
  category: string;
  quantity_sold: number;
  revenue: string;
  gross_profit: string;
  margin_per_unit: string;
  engineering_bucket: string;
};

type CategoryRow = {
  category: string;
  quantity_sold: string;
  revenue: string;
  gross_profit: string;
};

type MenuResponse = {
  ok: boolean;
  has_data?: boolean;
  refreshed_at?: string;
  location?: { id: string | number; name?: string };
  matrix_summary: MatrixRow[];
  top_items: ItemRow[];
  top_margin_items: ItemRow[];
  category_performance: CategoryRow[];
  matrix_points: MatrixPoint[];
  notes?: string;
  error?: string;
};

function hasMenuData(data: MenuResponse | null) {
  if (!data || !data.ok) return false;
  if (data.has_data === false) return false;

  return (
    (data.matrix_summary?.length ?? 0) > 0 ||
    (data.top_items?.length ?? 0) > 0 ||
    (data.top_margin_items?.length ?? 0) > 0 ||
    (data.category_performance?.length ?? 0) > 0 ||
    (data.matrix_points?.length ?? 0) > 0
  );
}

function MenuSkeleton() {
  return (
    <div className="space-y-4">
      <SectionCard
        title="Menu Optimization"
        subtitle="Loading menu performance, profitability, and engineering insights."
      >
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-24 animate-pulse rounded-xl border border-border bg-muted/30"
            />
          ))}
        </div>
      </SectionCard>

      <div className="h-[420px] animate-pulse rounded-2xl border border-border bg-muted/30" />
      <div className="h-56 animate-pulse rounded-2xl border border-border bg-muted/30" />
    </div>
  );
}

export function MenuIntelligenceClient() {
  const [data, setData] = React.useState<MenuResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const res = await fetch("/api/restaurant/menu-intelligence", {
          cache: "no-store",
        });

        const text = await res.text();
        let json: MenuResponse;

        try {
          json = JSON.parse(text);
        } catch {
          throw new Error(
            `Menu Intelligence API returned non-JSON (${res.status})`
          );
        }

        if (cancelled) return;

        if (!json.ok) {
          setError(json.error ?? "Failed to load menu intelligence");
          setData(null);
          return;
        }

        setData({
          ...json,
          matrix_summary: json.matrix_summary ?? [],
          top_items: json.top_items ?? [],
          top_margin_items: json.top_margin_items ?? [],
          category_performance: json.category_performance ?? [],
          matrix_points: json.matrix_points ?? [],
        });
      } catch (e: any) {
        if (!cancelled) {
          setError(e?.message ?? "Failed to load menu intelligence");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, []);

  if (loading) {
    return <MenuSkeleton />;
  }

  if (error) {
    return (
      <SectionCard
        title="Menu Optimization"
        subtitle="Unable to load menu intelligence right now."
      >
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-foreground">
          <div className="font-medium">Menu Intelligence API Error</div>
          <div className="mt-1 text-xs text-muted-foreground">{error}</div>
        </div>
      </SectionCard>
    );
  }

  if (!hasMenuData(data)) {
    return (
      <SectionCard
        title="Menu Optimization"
        subtitle="Connect your POS to start seeing menu engineering and item profitability insights."
      >
        <div className="py-10 text-center">
          <div className="mx-auto max-w-md text-sm text-muted-foreground">
            {data?.notes ??
              "Once item-level sales and margin data is available, Valora will show menu engineering, top revenue items, top margin items, category performance, and optimization opportunities here."}
          </div>
        </div>
      </SectionCard>
    );
  }

  const menu = data!;
  const hasMatrixChart = menu.matrix_points.length > 0;
  const hasSummary = menu.matrix_summary.length > 0;
  const hasTopItems = menu.top_items.length > 0;
  const hasTopMarginItems = menu.top_margin_items.length > 0;
  const hasCategoryPerformance = menu.category_performance.length > 0;

  return (
    <div className="space-y-4">
      {hasSummary ? (
        <SectionCard
          title="Menu Engineering Matrix"
          subtitle="Menu item mix by popularity and profitability."
        >
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {menu.matrix_summary.map((row) => (
              <div
                key={row.engineering_bucket}
                className="rounded-xl border border-border bg-card p-4"
              >
                <div className="text-xs text-muted-foreground">
                  {row.engineering_bucket.toUpperCase()}
                </div>

                <div className="mt-1 text-lg font-semibold">
                  {row.item_count} items
                </div>

                <div className="mt-1 text-xs text-muted-foreground">
                  Revenue ${row.revenue}
                </div>

                <div className="text-xs text-muted-foreground">
                  Profit ${row.gross_profit}
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      ) : null}

      {hasMatrixChart ? (
        <MenuEngineeringChart points={menu.matrix_points} />
      ) : (
        <SectionCard
          title="Menu Engineering Chart"
          subtitle="No chart data available yet."
        >
          <div className="py-8 text-sm text-muted-foreground">
            Menu engineering visualization will appear once item popularity and
            profitability data is available.
          </div>
        </SectionCard>
      )}

      {hasTopItems ? (
        <SectionCard title="Top Revenue Items">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left">Item</th>
                <th>Qty</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {menu.top_items.slice(0, 6).map((item, i) => (
                <tr key={i} className="border-b border-border">
                  <td>{item.item_name}</td>
                  <td className="text-center">{item.quantity_sold}</td>
                  <td className="text-center">${item.revenue}</td>
                  <td className="text-center">${item.gross_profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}

      {hasTopMarginItems ? (
        <SectionCard title="Top Margin Items">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left">Item</th>
                <th>Margin</th>
                <th>Revenue</th>
              </tr>
            </thead>
            <tbody>
              {menu.top_margin_items.slice(0, 6).map((item, i) => (
                <tr key={i} className="border-b border-border">
                  <td>{item.item_name}</td>
                  <td className="text-center">${item.margin_per_unit}</td>
                  <td className="text-center">${item.revenue}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}

      {hasCategoryPerformance ? (
        <SectionCard title="Category Performance">
          <table className="w-full text-sm">
            <thead className="text-xs text-muted-foreground">
              <tr>
                <th className="text-left">Category</th>
                <th>Qty Sold</th>
                <th>Revenue</th>
                <th>Profit</th>
              </tr>
            </thead>
            <tbody>
              {menu.category_performance.map((c, i) => (
                <tr key={i} className="border-b border-border">
                  <td>{c.category}</td>
                  <td className="text-center">{c.quantity_sold}</td>
                  <td className="text-center">${c.revenue}</td>
                  <td className="text-center">${c.gross_profit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </SectionCard>
      ) : null}

      <SectionCard title="Menu Optimization Recommendations">
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="max-w-md text-sm text-muted-foreground">
            Valora AI will analyze item popularity and profitability to
            recommend which menu items to promote, reprice, redesign, or
            remove.
          </div>
          <div className="mt-3 text-xs text-muted-foreground/70">
            Recommendations will appear once sufficient sales data is available.
          </div>
        </div>
      </SectionCard>
    </div>
  );
}