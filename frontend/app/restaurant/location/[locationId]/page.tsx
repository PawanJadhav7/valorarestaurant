//app/restaurant/location/[locationId]/page.tsx
import Link from "next/link";
import { notFound } from "next/navigation";

const TENANT_ID = "dcdbe149-deeb-4e7a-be21-28d122a89221";
const DAY = "2026-03-06";
const API_BASE =
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL || "http://127.0.0.1:8000";

function formatCurrency(value: unknown) {
  return `$${Number(value ?? 0).toLocaleString()}`;
}

function formatPercent(value: unknown) {
  return `${(Number(value ?? 0) * 100).toFixed(1)}%`;
}

async function getLocationControlTower(locationId: string) {
  const res = await fetch(
    `${API_BASE}/api/dashboard/control-tower?tenant_id=${TENANT_ID}&day=${DAY}&limit=200`,
    { cache: "no-store" }
  );

  if (!res.ok) {
    throw new Error(`API ${res.status}: ${await res.text()}`);
  }

  const json = await res.json();
  const items = json?.items ?? [];
  return items.find((row: any) => String(row.location_id) === String(locationId)) ?? null;
}

export default async function RestaurantLocationDetailPage({
  params,
}: {
  params: Promise<{ locationId: string }>;
}) {
  const { locationId } = await params;
  const row = await getLocationControlTower(locationId);

  if (!row) notFound();

  return (
    <div className="space-y-6 p-6">
      <div className="space-y-2">
        <Link href="/restaurant" className="text-sm text-muted-foreground hover:underline">
          ← Back to Restaurant Overview
        </Link>

        <h1 className="text-2xl font-bold">{row.location_name}</h1>
        <p className="text-sm text-muted-foreground">
          {row.region ?? "Unknown region"} · {row.country_code ?? "-"}
        </p>
      </div>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Revenue</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(row.revenue)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Gross Margin</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatPercent(row.gross_margin)}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Top Risk</div>
          <div className="mt-2 text-2xl font-semibold">
            {row.top_risk_type}
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-4">
          <div className="text-sm text-muted-foreground">Profit Opportunity</div>
          <div className="mt-2 text-2xl font-semibold">
            {formatCurrency(row.estimated_profit_uplift)}
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-card p-5 space-y-3">
        <h2 className="text-xl font-semibold">AI Insight</h2>
        <div className="text-base font-medium">{row.headline}</div>
        <div className="text-sm text-muted-foreground">{row.summary_text}</div>
      </section>

      <section className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Action Recommendation</h2>
          <div className="text-sm text-muted-foreground">Top Action</div>
          <div className="font-medium">{row.top_action_code}</div>

          <div className="text-sm text-muted-foreground">Expected ROI</div>
          <div>{formatCurrency(row.top_action_expected_roi)}</div>

          <div className="text-sm text-muted-foreground">Confidence</div>
          <div>{Number(row.top_action_confidence_score ?? 0).toFixed(2)}</div>
        </div>

        <div className="rounded-2xl border border-border bg-card p-5 space-y-3">
          <h2 className="text-lg font-semibold">Operational Signals</h2>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Stockouts</span>
            <span>{row.stockout_count ?? 0}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Avg Inventory</span>
            <span>{formatCurrency(row.avg_inventory)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Waste Amount</span>
            <span>{formatCurrency(row.waste_amount)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">Waste %</span>
            <span>{formatPercent(row.waste_pct)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}