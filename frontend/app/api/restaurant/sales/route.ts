import { NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Severity = "good" | "warn" | "risk";
type Unit = "usd" | "pct" | "days" | "ratio" | "count";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

type InsightSeverity = "good" | "warn" | "risk";

type InsightItem = {
  code: string;
  title: string;
  message: string;
  severity: InsightSeverity;
};

type AlertItem = {
  code: string;
  title: string;
  message: string;
  severity: "warn" | "risk";
};

type RecommendationItem = {
  code: string;
  title: string;
  action: string;
  rationale: string;
  priority: "high" | "medium" | "low";
};

type SalesInsights = {
  kpi_insights: InsightItem[];
  chart_insights: InsightItem[];
  alerts: AlertItem[];
  recommendations: RecommendationItem[];
};

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
}

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function toNum(v: unknown): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function formatDay(v: unknown): string {
  if (!v) return "";
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}

function severityFromMargin(marginPct: number | null): Severity {
  if (marginPct === null) return "good";
  if (marginPct < 50) return "risk";
  if (marginPct < 60) return "warn";
  return "good";
}

function severityFromDiscount(ratePct: number | null): Severity {
  if (ratePct === null) return "good";
  if (ratePct > 12) return "risk";
  if (ratePct > 8) return "warn";
  return "good";
}

function severityFromDelta(deltaPct: number | null): Severity {
  if (deltaPct === null) return "good";
  if (deltaPct < -5) return "risk";
  if (deltaPct < 0) return "warn";
  return "good";
}

function windowStartFromAnchorSql(
  windowCode: "7d" | "30d" | "90d" | "ytd",
  anchorRef: string
) {
  if (windowCode === "7d") return `(${anchorRef}::date - interval '6 days')::date`;
  if (windowCode === "30d") return `(${anchorRef}::date - interval '29 days')::date`;
  if (windowCode === "90d") return `(${anchorRef}::date - interval '89 days')::date`;
  return `date_trunc('year', ${anchorRef}::date)::date`;
}

function pctChange(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function lastNum(values: Array<number | null | undefined>): number | null {
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
      return Number(v);
    }
  }
  return null;
}

function prevNum(values: Array<number | null | undefined>): number | null {
  let seen = 0;
  for (let i = values.length - 1; i >= 0; i--) {
    const v = values[i];
    if (v !== null && v !== undefined && Number.isFinite(Number(v))) {
      seen += 1;
      if (seen === 2) return Number(v);
    }
  }
  return null;
}

function sumNums(values: Array<number | null | undefined>): number {
  return values.reduce<number>((acc, v) => {
    const num = Number(v);
    return acc + (Number.isFinite(num) ? num : 0);
  }, 0);
}

function buildSalesInsights(args: {
  series: {
    revenue: number[];
    orders: number[];
    aov: (number | null)[];
    gross_margin_pct: (number | null)[];
    discount_rate_pct: (number | null)[];
    dine_in?: number[];
    delivery?: number[];
    takeaway?: number[];
  };
  topItems: Array<{
    item_name: string;
    revenue: string;
    gross_margin_pct?: string;
    action_flag?: string;
  }>;
}): SalesInsights {
  const { series, topItems } = args;

  const revenueLast = lastNum(series.revenue);
  const revenuePrev = prevNum(series.revenue);
  const ordersLast = lastNum(series.orders);
  const ordersPrev = prevNum(series.orders);
  const aovLast = lastNum(series.aov);
  const aovPrev = prevNum(series.aov);
  const marginLast = lastNum(series.gross_margin_pct);
  const discountLast = lastNum(series.discount_rate_pct);

  const revenueDelta = pctChange(revenueLast, revenuePrev);
  const ordersDelta = pctChange(ordersLast, ordersPrev);
  const aovDelta = pctChange(aovLast, aovPrev);

  const dineInTotal = Number(sumNums(series.dine_in ?? []));
  const deliveryTotal = Number(sumNums(series.delivery ?? []));
  const takeawayTotal = Number(sumNums(series.takeaway ?? []));
  const totalChannelRevenue = dineInTotal + deliveryTotal + takeawayTotal;

  const dineInShare =
    totalChannelRevenue > 0 ? (dineInTotal / totalChannelRevenue) * 100 : 0;

  const deliveryShare =
    totalChannelRevenue > 0 ? (deliveryTotal / totalChannelRevenue) * 100 : 0;

  const lowMarginDriver = topItems.find(
    (x) => x.action_flag === "high_revenue_low_margin"
  );

  const upsideItem = topItems.find(
    (x) => x.action_flag === "high_margin_low_revenue"
  );

  const insights: SalesInsights = {
    kpi_insights: [],
    chart_insights: [],
    alerts: [],
    recommendations: [],
  };

  if ((revenueDelta ?? 0) > 0 && Math.abs(ordersDelta ?? 0) < 2) {
    insights.kpi_insights.push({
      code: "rev_price_driven",
      title: "Revenue driven by pricing or mix",
      message:
        "Revenue increased without comparable order growth, suggesting pricing power or stronger basket composition.",
      severity: "good",
    });
  }

  if ((ordersDelta ?? 0) > 0 && (aovDelta ?? 0) < 0) {
    insights.kpi_insights.push({
      code: "traffic_up_aov_down",
      title: "Traffic up, basket value down",
      message:
        "Order volume increased while average order value weakened, indicating an upsell or mix-quality opportunity.",
      severity: "warn",
    });
  }

  if ((revenueDelta ?? 0) < 0 && (ordersDelta ?? 0) < 0) {
    insights.kpi_insights.push({
      code: "demand_slowdown",
      title: "Demand slowdown detected",
      message:
        "Both revenue and order volume declined versus the prior point, indicating softer demand momentum.",
      severity: "risk",
    });
  }

  if ((discountLast ?? 0) > 10 && (marginLast ?? 999) < 60) {
    insights.chart_insights.push({
      code: "discount_pressure",
      title: "Discount pressure on margin",
      message:
        "Discounting is elevated while margin remains soft, suggesting promotions may be diluting profitability.",
      severity: "risk",
    });

    insights.alerts.push({
      code: "margin_leakage",
      title: "Margin leakage detected",
      message: "High discounts and weak gross margin are occurring together.",
      severity: "risk",
    });

    insights.recommendations.push({
      code: "reduce_discount_depth",
      title: "Tighten discount strategy",
      action:
        "Review broad discounting and shift to targeted promotions or limited-time offers.",
      rationale:
        "Reducing unnecessary discount depth should improve profitability quickly.",
      priority: "high",
    });
  }

  if (deliveryShare > 45) {
    insights.chart_insights.push({
      code: "delivery_heavy_mix",
      title: "Delivery-heavy sales mix",
      message:
        "A large share of revenue is coming from delivery channels, which may compress contribution margin.",
      severity: "warn",
    });
  }

  if (dineInShare < 35 && totalChannelRevenue > 0) {
    insights.chart_insights.push({
      code: "low_dine_in_share",
      title: "Low dine-in contribution",
      message:
        "Dine-in share is relatively weak, which may indicate softer in-store traffic or over-reliance on off-premise demand.",
      severity: "warn",
    });
  }

  if (lowMarginDriver) {
    insights.alerts.push({
      code: "top_item_margin_risk",
      title: "Top item margin risk",
      message: `${lowMarginDriver.item_name} is a strong revenue driver but is underperforming on margin.`,
      severity: "risk",
    });

    insights.recommendations.push({
      code: "fix_top_item_pricing",
      title: "Review pricing or portioning",
      action: `Revisit pricing, portioning, or ingredient cost for ${lowMarginDriver.item_name}.`,
      rationale:
        "A high-revenue item with weak margin creates a disproportionate profit leak.",
      priority: "high",
    });
  }

  if (upsideItem) {
    insights.recommendations.push({
      code: "promote_high_margin_item",
      title: "Promote a high-margin item",
      action: `Feature ${upsideItem.item_name} in bundles, placement tests, or upsell prompts.`,
      rationale:
        "The item has healthy margin performance but low contribution, making it a strong upside opportunity.",
      priority: "medium",
    });
  }

  if ((aovLast ?? 999) < 25) {
    insights.recommendations.push({
      code: "raise_basket_size",
      title: "Lift basket size",
      action:
        "Introduce add-ons, bundles, or suggestive selling to improve average order value.",
      rationale:
        "Low ticket size limits revenue even when traffic is stable.",
      priority: "medium",
    });
  }

  return insights;
}

type AllowedLocationRow = {
  location_id: number | string;
  location_name?: string | null;
  location_code?: string | null;
  name?: string | null;
};

function prettifyLocationLabel(raw: string | null | undefined): string {
  if (!raw) return "Unknown Location";

  return raw
    .replace(/_[A-F0-9]{8,}$/i, "")
    .replace(/_LOCATION$/i, "")
    .replace(/_/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function resolveLocationContext(
  locationId: number | null,
  allowedRows: AllowedLocationRow[]
) {
  if (locationId === null) {
    return {
      id: "all",
      name: "All Locations",
    };
  }

  const match = allowedRows.find(
    (r) => Number(r.location_id) === Number(locationId)
  );

  const rawName =
    match?.location_name?.trim() ||
    match?.name?.trim() ||
    match?.location_code?.trim() ||
    String(locationId);

  return {
    id: locationId,
    name: prettifyLocationLabel(rawName),
  };
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    const result = await withTenant(async ({ client, tenantId }) => {
      const allowedRes = await client.query(
        `
          select distinct
            tl.location_id::bigint as location_id,
            dl.location_name,
            dl.location_code
          from app.tenant_location tl
          left join restaurant.dim_location dl
            on dl.location_id = tl.location_id
          where tl.tenant_id = ANY($1::uuid[])
            and tl.is_active = true
          order by tl.location_id
        `,
        [tenantId]
      );

      const selectedLocationName =
        locationId === null
          ? "All Locations"
          : (
            allowedRes.rows.find((r: any) => Number(r.location_id) === locationId)
              ?.location_name ?? String(locationId)
          );

      const allowedIds = allowedRes.rows
        .map((r: any) => Number(r.location_id))
        .filter(Number.isFinite);

      if (allowedIds.length === 0) {
        return {
          status: 403,
          body: { ok: false, error: "No locations assigned to this tenant yet" },
        };
      }

      if (locationId !== null && !allowedIds.includes(locationId)) {
        return {
          status: 403,
          body: { ok: false, error: "Forbidden location" },
        };
      }
      const locationContext = resolveLocationContext(locationId, allowedRes.rows);

      const anchorRes = await client.query(
        `
        select coalesce(max(day), current_date)::date as anchor_day
        from analytics.v_gold_daily
        where tenant_id = $1::uuid
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
        `,
        [tenantId, allowedIds, locationId]
      );

      const anchorDay = formatDay(anchorRes.rows?.[0]?.anchor_day);
      const startSql = windowStartFromAnchorSql(windowCode, `$4`);

      const seriesRes = await client.query(
        `
        select
          day,
          coalesce(sum(revenue), 0)::numeric as revenue,
          coalesce(sum(orders), 0)::numeric as orders,
          case
            when coalesce(sum(orders), 0) = 0 then 0
            else round((sum(revenue) / sum(orders))::numeric, 2)
          end as aov,
          case
            when coalesce(sum(revenue), 0) = 0 then 0
            else round((sum(gross_profit) / sum(revenue) * 100)::numeric, 2)
          end as gross_margin_pct
        from analytics.v_gold_daily
        where tenant_id = $1::uuid
          and day >= ${startSql}
          and day <= $4::date
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
        group by day
        order by day
        `,
        [tenantId, allowedIds, locationId, anchorDay]
      );

      const seriesRows = seriesRes.rows ?? [];
      const hasData = seriesRows.length > 0;

      let revenue: number | null = null;
      let orders: number | null = null;
      let aov: number | null = null;
      let grossMarginPct: number | null = null;
      let discountRatePct: number | null = null;

      if (hasData) {
        const aggRes = await client.query(
          `
          select
            sum(revenue)::numeric as revenue,
            sum(orders)::numeric as orders,
            case
              when sum(orders) = 0 then 0
              else round(sum(revenue) / sum(orders), 2)
            end as aov,
            case
              when sum(revenue) = 0 then 0
              else round(sum(gross_profit) / sum(revenue) * 100, 2)
            end as gross_margin_pct
          from analytics.v_gold_daily
          where tenant_id = $1::uuid
            and day >= ${startSql}
            and day <= $4::date
            and location_id = any($2::bigint[])
            and ($3::bigint is null or location_id = $3::bigint)
          `,
          [tenantId, allowedIds, locationId, anchorDay]
        );

        const curr = aggRes.rows?.[0] ?? {};

        revenue = toNum(curr.revenue);
        orders = toNum(curr.orders);
        aov = toNum(curr.aov);
        grossMarginPct = toNum(curr.gross_margin_pct);

        const discountRes = await client.query(
          `
          select
            case
              when sum(gross_sales) = 0 then 0
              else round(sum(discount_amount) / sum(gross_sales) * 100, 2)
            end as discount_rate_pct
          from restaurant.fact_order
          where tenant_id = $1::uuid
            and order_date >= ${startSql}
            and order_date <= $4::date
            and location_id = any($2::bigint[])
            and ($3::bigint is null or location_id = $3::bigint)
            and order_status = 'completed'
          `,
          [tenantId, allowedIds, locationId, anchorDay]
        );

        discountRatePct = toNum(discountRes.rows?.[0]?.discount_rate_pct);
      }

      const channelSeriesRes = await client.query(
        `
        select
          order_date::date as day,
          lower(coalesce(order_channel, 'unknown')) as order_channel,
          coalesce(sum(net_sales), 0)::numeric as revenue
        from restaurant.fact_order
        where tenant_id = $1::uuid
          and order_date >= ${startSql}
          and order_date <= $4::date
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
          and order_status = 'completed'
        group by 1, 2
        order by 1, 2
        `,
        [tenantId, allowedIds, locationId, anchorDay]
      );

      const channelRows = channelSeriesRes.rows ?? [];
      const channelMap = new Map<
        string,
        { dine_in: number; delivery: number; takeaway: number }
      >();

      for (const row of channelRows) {
        const day = formatDay(row.day);
        const channel = String(row.order_channel ?? "").toLowerCase();
        const rev = Number(row.revenue ?? 0);

        const curr = channelMap.get(day) ?? {
          dine_in: 0,
          delivery: 0,
          takeaway: 0,
        };

        if (channel.includes("dine")) {
          curr.dine_in += rev;
        } else if (channel.includes("deliver")) {
          curr.delivery += rev;
        } else if (
          channel.includes("take") ||
          channel.includes("pickup") ||
          channel.includes("pick_up") ||
          channel.includes("pick-up")
        ) {
          curr.takeaway += rev;
        } else {
          curr.takeaway += rev;
        }

        channelMap.set(day, curr);
      }

      const topItemsResult = await client.query(
        `
        with item_perf as (
          select
            oi.menu_item_id,
            coalesce(mi.item_name, concat('Item ', oi.menu_item_id::text)) as item_name,
            sum(coalesce(oi.quantity, 0))::numeric as qty_sold,
            sum(coalesce(oi.line_revenue, 0))::numeric as revenue,
            sum(coalesce(oi.line_cogs, 0))::numeric as cogs,
            sum(coalesce(oi.line_revenue, 0) - coalesce(oi.line_cogs, 0))::numeric as gross_profit,
            case
              when sum(coalesce(oi.line_revenue, 0)) > 0 then
                round(
                  (
                    sum(coalesce(oi.line_revenue, 0) - coalesce(oi.line_cogs, 0))
                    / sum(coalesce(oi.line_revenue, 0))
                  ) * 100
                , 2)
              else null
            end as gross_margin_pct
          from restaurant.fact_order_item oi
          join restaurant.fact_order o
            on o.order_id = oi.order_id
          left join restaurant.dim_menu_item mi
            on mi.menu_item_id = oi.menu_item_id
           and mi.tenant_id = o.tenant_id
           and (mi.location_id = o.location_id or mi.location_id is null)
          where o.tenant_id = $1::uuid
            and o.order_date >= ${startSql}
            and o.order_date <= $4::date
            and o.location_id = any($2::bigint[])
            and ($3::bigint is null or o.location_id = $3::bigint)
            and o.order_status = 'completed'
          group by
            oi.menu_item_id,
            coalesce(mi.item_name, concat('Item ', oi.menu_item_id::text))
        )
        select
          menu_item_id,
          item_name,
          round(qty_sold, 0) as qty_sold,
          round(revenue, 2) as revenue,
          round(cogs, 2) as cogs,
          round(gross_profit, 2) as gross_profit,
          gross_margin_pct,
          case
            when revenue >= 1000 and gross_margin_pct < 60 then 'high_revenue_low_margin'
            when gross_margin_pct >= 75 and revenue < 500 then 'high_margin_low_revenue'
            else null
          end as action_flag
        from item_perf
        order by revenue desc, qty_sold desc, item_name asc
        limit 10
        `,
        [tenantId, allowedIds, locationId, anchorDay]
      );

      const topItems = (topItemsResult.rows ?? []).map((r: any) => ({
        menu_item_id: Number(r.menu_item_id),
        item_name: String(r.item_name),
        qty_sold: Number(r.qty_sold ?? 0),
        revenue: Number(r.revenue ?? 0).toFixed(2),
        cogs: Number(r.cogs ?? 0).toFixed(2),
        gross_profit: Number(r.gross_profit ?? 0).toFixed(2),
        gross_margin_pct:
          r.gross_margin_pct == null
            ? undefined
            : Number(r.gross_margin_pct).toFixed(2),
        action_flag: r.action_flag ?? undefined,
      }));

      const series = {
        day: seriesRows.map((r: any) => formatDay(r.day)),
        revenue: seriesRows.map((r: any) => Number(r.revenue ?? 0)),
        orders: seriesRows.map((r: any) => Number(r.orders ?? 0)),
        aov: seriesRows.map((r: any) => toNum(r.aov)),
        gross_margin_pct: seriesRows.map((r: any) => toNum(r.gross_margin_pct)),
        discount_rate_pct: seriesRows.map(() => null as number | null),
        dine_in: seriesRows.map(
          (r: any) => channelMap.get(formatDay(r.day))?.dine_in ?? 0
        ),
        delivery: seriesRows.map(
          (r: any) => channelMap.get(formatDay(r.day))?.delivery ?? 0
        ),
        takeaway: seriesRows.map(
          (r: any) => channelMap.get(formatDay(r.day))?.takeaway ?? 0
        ),
      };

      const discountSeriesRes = await client.query(
        `
        select
          order_date::date as day,
          case
            when sum(gross_sales) = 0 then 0
            else round(sum(discount_amount) / sum(gross_sales) * 100, 2)
          end as discount_rate_pct
        from restaurant.fact_order
        where tenant_id = $1::uuid
          and order_date >= ${startSql}
          and order_date <= $4::date
          and location_id = any($2::bigint[])
          and ($3::bigint is null or location_id = $3::bigint)
          and order_status = 'completed'
        group by 1
        order by 1
        `,
        [tenantId, allowedIds, locationId, anchorDay]
      );

      const discountMap = new Map<string, number>();
      for (const row of discountSeriesRes.rows ?? []) {
        discountMap.set(formatDay(row.day), Number(row.discount_rate_pct ?? 0));
      }

      series.discount_rate_pct = series.day.map(
        (d: string) => discountMap.get(d) ?? null
      );

      const revenueDelta = pctChange(lastNum(series.revenue), prevNum(series.revenue));
      const ordersDelta = pctChange(lastNum(series.orders), prevNum(series.orders));
      const aovDelta = pctChange(lastNum(series.aov), prevNum(series.aov));

      const insights = buildSalesInsights({
        series,
        topItems,
      });

      const kpis: Kpi[] = [
        {
          code: "SALES_REVENUE",
          label: `Revenue (${windowCode.toUpperCase()})`,
          value: revenue,
          delta: revenueDelta,
          unit: "usd",
          severity: hasData ? severityFromDelta(revenueDelta) : undefined,
          hint: hasData
            ? "Total sales for selected window."
            : "No data available yet for this tenant.",
        },
        {
          code: "SALES_ORDERS",
          label: `Orders (${windowCode.toUpperCase()})`,
          value: orders,
          delta: ordersDelta,
          unit: "count",
          severity: hasData ? severityFromDelta(ordersDelta) : undefined,
          hint: hasData
            ? "Orders for selected window."
            : "No data available yet.",
        },
        {
          code: "SALES_AOV",
          label: "Average Order Value",
          value: aov,
          delta: aovDelta,
          unit: "usd",
          severity: hasData ? severityFromDelta(aovDelta) : undefined,
          hint: hasData ? "Average order value." : "No data available yet.",
        },
        {
          code: "SALES_GROSS_MARGIN",
          label: "Gross Margin",
          value: grossMarginPct,
          unit: "pct",
          severity: hasData ? severityFromMargin(grossMarginPct) : undefined,
          hint: hasData ? "Gross margin %." : "No data available yet.",
        },
        {
          code: "SALES_DISCOUNT_RATE",
          label: "Discount Rate",
          value: discountRatePct,
          unit: "pct",
          severity: hasData ? severityFromDiscount(discountRatePct) : undefined,
          hint: hasData ? "Discount rate %." : "No data available yet.",
        },
      ];

      return {
        status: 200,
        body: {
          ok: true,
          as_of: refreshedAt,
          refreshed_at: refreshedAt,
          window: windowCode,
          location: locationContext,
          kpis,
          series,
          top_items: topItems,
          insights,
          raw: {
            has_data: hasData,
            anchor_day: anchorDay,
            series_rows: seriesRows.length,
            top_items_rows: topItems.length,
            sample_top_items: topItems.slice(0, 3),
          },
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "sales route error" },
      { status: 500 }
    );
  }
}