// app/restaurant/menu-intelligence/menu-client.tsx
"use client";

import * as React from "react";
import { SectionCard } from "@/components/valora/SectionCard";
// Ensure the correct path to the MenuEngineeringChart component
import { MenuEngineeringChart, type MatrixPoint } from "@/components/restaurant/ MenuEngineeringChart";



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
  matrix_summary: MatrixRow[];
  top_items: ItemRow[];
  top_margin_items: ItemRow[];
  category_performance: CategoryRow[];
  matrix_points: MatrixPoint[];
};

export function MenuIntelligenceClient() {
  const [data, setData] = React.useState<MenuResponse | null>(null);

  React.useEffect(() => {
    fetch("/api/restaurant/menu-intelligence")
      .then((r) => r.json())
      .then(setData);
  }, []);

  if (!data) return <div>Loading…</div>;

  return (
    <div className="space-y-4">

      {/* Menu Engineering Matrix */}
      <SectionCard title="Menu Engineering Matrix">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">

          {data.matrix_summary.map((row) => (
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

              <div className="text-xs text-muted-foreground mt-1">
                Revenue ${row.revenue}
              </div>

              <div className="text-xs text-muted-foreground">
                Profit ${row.gross_profit}
              </div>
            </div>
          ))}

        </div>
      </SectionCard>

       <MenuEngineeringChart points={data.matrix_points ?? []} />

      {/* Top Revenue Items */}
      <SectionCard title="Top Revenue Items">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th className="text-left">Item</th>
              <th>Qty</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>

          <tbody>
            {data.top_items.slice(0,6).map((item,i)=>(
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

      {/* Top Margin Items */}
      <SectionCard title="Top Margin Items">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th className="text-left">Item</th>
              <th>Margin</th>
              <th>Revenue</th>
            </tr>
          </thead>

          <tbody>
            {data.top_margin_items.slice(0,6).map((item,i)=>(
              <tr key={i} className="border-b border-border">
                <td>{item.item_name}</td>
                <td className="text-center">${item.margin_per_unit}</td>
                <td className="text-center">${item.revenue}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </SectionCard>

      {/* Category Performance */}
      <SectionCard title="Category Performance">
        <table className="w-full text-sm">
          <thead className="text-muted-foreground text-xs">
            <tr>
              <th className="text-left">Category</th>
              <th>Qty Sold</th>
              <th>Revenue</th>
              <th>Profit</th>
            </tr>
          </thead>

          <tbody>
            {data.category_performance.map((c,i)=>(
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

    </div>
  );
}