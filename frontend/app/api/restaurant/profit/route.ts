//frontend/app/api/restaurant/profit/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
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

type Alert = {
  id: string;
  severity: Severity;
  title: string;
  detail: string;
};

type Action = {
  id: string;
  priority: 1 | 2 | 3;
  title: string;
  rationale: string;
  owner?: string;
};

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  return (["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d") as
    | "7d"
    | "30d"
    | "90d"
    | "ytd";
}

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "all") return null;
  const n = Number(raw.trim());
  return Number.isInteger(n) ? n : null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function avg(nums: number[]) {
  if (!nums.length) return null;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function pctMaybe(v: number | null): number | null {
  if (v === null) return null;
  return v <= 1 ? v * 100 : v;
}

function deltaPoints(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null) return null;
  return curr - prev;
}

function deltaPct(curr: number | null, prev: number | null): number | null {
  if (curr === null || prev === null || prev === 0) return null;
  return ((curr - prev) / prev) * 100;
}

function windowDays(windowCode: "7d" | "30d" | "90d" | "ytd", asOfDay: Date): number {
  if (windowCode === "7d") return 7;
  if (windowCode === "30d") return 30;
  if (windowCode === "90d") return 90;
  const start = new Date(Date.UTC(asOfDay.getUTCFullYear(), 0, 1));
  return Math.floor((asOfDay.getTime() - start.getTime()) / 86400000) + 1;
}

function toDateOnly(v: unknown): string {
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid asOfTs value: ${String(v)}`);
  }
  return d.toISOString().slice(0, 10);
}

function sevEbitdaMargin(v: number | null): Severity {
  if (v === null) return "good";
  if (v < 8) return "risk";
  if (v < 15) return "warn";
  return "good";
}

function sevContributionMargin(v: number | null): Severity {
  if (v === null) return "good";
  if (v < 20) return "risk";
  if (v < 28) return "warn";
  return "good";
}

function sevBreakEven(v: number | null): Severity {
  if (v === null) return "good";
  if (v > 1.05) return "risk";
  if (v > 0.95) return "warn";
  return "good";
}

export async function GET(req: Request) {
  const user = await getSessionUser();

  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const tenantRes = await pool.query(
    `
    select tenant_id
    from app.tenant_user
    where user_id = $1::uuid
    order by created_at asc
    limit 1
    `,
    [user.user_id]
  );

  const tenantId = tenantRes.rows?.[0]?.tenant_id;

  if (!tenantId) {
    return NextResponse.json({
      ok: true,
      kpis: [],
      series: {},
      alerts: [],
      actions: [],
    });
  }
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOfParam = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    let asOfTs: string | null = asOfParam;

    if (!asOfTs) {
      const anchorSql = locationId
        ? `
          SELECT MAX(day)::timestamptz AS as_of_ts
          FROM restaurant.f_location_daily_features
          WHERE tenant_id = $1::uuid
            AND location_id = $2::bigint
        `
        : `
          SELECT MAX(day)::timestamptz AS as_of_ts
          FROM restaurant.f_location_daily_features
          WHERE tenant_id = $1::uuid
        `;

      const anchorRes = await pool.query(
        anchorSql,
        locationId ? [tenantId, locationId] : [tenantId]
      );

      asOfTs = anchorRes.rows?.[0]?.as_of_ts ?? null;
    }

    if (!asOfTs) {
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          window: windowCode,
          location: {
            id: locationId ?? "all",
            name: locationId ? `Location ${locationId}` : "All Locations",
          },
          kpis: [],
          series: {},
          alerts: [],
          actions: [],
          raw: { anchor_missing: true },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    const asOfDateStr = toDateOnly(asOfTs);
    const asOfDay = new Date(`${asOfDateStr}T00:00:00.000Z`);
    const days = windowDays(windowCode, asOfDay);

    const sql = `
      WITH params AS (
        SELECT
          $1::date AS as_of_day,
          $2::int AS n_days,
          $3::bigint AS p_location
      ),
      curr_raw AS (
        SELECT f.*
        FROM restaurant.f_location_daily_features f
        CROSS JOIN params p
        WHERE f.day BETWEEN (p.as_of_day - (p.n_days - 1)) AND p.as_of_day
          AND f.tenant_id = $4::uuid
          AND (p.p_location IS NULL OR f.location_id = p.p_location)
      ),
      prev_raw AS (
        SELECT f.*
        FROM restaurant.f_location_daily_features f
        CROSS JOIN params p
        WHERE f.day BETWEEN (p.as_of_day - ((p.n_days * 2) - 1)) AND (p.as_of_day - p.n_days)
          AND f.tenant_id = $4::uuid
          AND (p.p_location IS NULL OR f.location_id = p.p_location)
      ),
      curr AS (
        SELECT
          'curr' AS bucket,
          day,
          MIN(tenant_id::text)::uuid AS tenant_id,
          CASE WHEN COUNT(DISTINCT location_id) = 1 THEN MAX(location_id) ELSE NULL::bigint END AS location_id,
          CASE WHEN COUNT(DISTINCT location_name) = 1 THEN MIN(location_name) ELSE 'All Locations' END AS location_name,
          SUM(revenue) AS revenue,
          SUM(cogs) AS cogs,
          SUM(labor) AS labor,
          SUM(fixed_costs) AS fixed_costs,
          SUM(marketing_spend) AS marketing_spend,
          SUM(interest_expense) AS interest_expense,
          SUM(ebit) AS ebit,
          SUM(gross_profit) AS gross_profit,
          CASE WHEN SUM(revenue) = 0 THEN NULL ELSE (SUM(gross_profit) / SUM(revenue)) * 100 END AS gross_margin,
          SUM(contribution_margin) AS contribution_margin,
          CASE WHEN SUM(revenue) = 0 THEN NULL ELSE (SUM(contribution_margin) / SUM(revenue)) * 100 END AS contribution_margin_pct,
          SUM(prime_cost) AS prime_cost,
          CASE WHEN SUM(revenue) = 0 THEN NULL ELSE (SUM(prime_cost) / SUM(revenue)) * 100 END AS prime_cost_pct,
          SUM(orders) AS orders,
          SUM(customers) AS customers
        FROM curr_raw
        GROUP BY day
      ),
      prev AS (
        SELECT
          'prev' AS bucket,
          day,
          MIN(tenant_id::text)::uuid AS tenant_id,
          CASE WHEN COUNT(DISTINCT location_id) = 1 THEN MAX(location_id) ELSE NULL::bigint END AS location_id,
          CASE WHEN COUNT(DISTINCT location_name) = 1 THEN MIN(location_name) ELSE 'All Locations' END AS location_name,
          SUM(revenue) AS revenue,
          SUM(cogs) AS cogs,
          SUM(labor) AS labor,
          SUM(fixed_costs) AS fixed_costs,
          SUM(marketing_spend) AS marketing_spend,
          SUM(interest_expense) AS interest_expense,
          SUM(ebit) AS ebit,
          SUM(gross_profit) AS gross_profit,
          CASE WHEN SUM(revenue) = 0 THEN NULL ELSE (SUM(gross_profit) / SUM(revenue)) * 100 END AS gross_margin,
          SUM(contribution_margin) AS contribution_margin,
          CASE WHEN SUM(revenue) = 0 THEN NULL ELSE (SUM(contribution_margin) / SUM(revenue)) * 100 END AS contribution_margin_pct,
          SUM(prime_cost) AS prime_cost,
          CASE WHEN SUM(revenue) = 0 THEN NULL ELSE (SUM(prime_cost) / SUM(revenue)) * 100 END AS prime_cost_pct,
          SUM(orders) AS orders,
          SUM(customers) AS customers
        FROM prev_raw
        GROUP BY day
      )
      SELECT * FROM curr
      UNION ALL
      SELECT * FROM prev
      ORDER BY bucket, day;
    `;

    const res = await pool.query(sql, [asOfDateStr, days, locationId, tenantId]);
    const rows = res.rows ?? [];

    const currRows = rows.filter((r) => r.bucket === "curr");
    const prevRows = rows.filter((r) => r.bucket === "prev");

    const locName =
      locationId === null
        ? "All Locations"
        : (currRows[0]?.location_name as string | undefined) ?? `Location ${locationId}`;

    const sumCurrRevenue = currRows.reduce((s, r) => s + (toNum(r.revenue) ?? 0), 0);
    const sumPrevRevenue = prevRows.reduce((s, r) => s + (toNum(r.revenue) ?? 0), 0);

    const sumCurrEbit = currRows.reduce((s, r) => s + (toNum(r.ebit) ?? 0), 0);
    const sumPrevEbit = prevRows.reduce((s, r) => s + (toNum(r.ebit) ?? 0), 0);

    const sumCurrContribution = currRows.reduce((s, r) => s + (toNum(r.contribution_margin) ?? 0), 0);
    const sumPrevContribution = prevRows.reduce((s, r) => s + (toNum(r.contribution_margin) ?? 0), 0);

    const sumCurrPrime = currRows.reduce((s, r) => s + (toNum(r.prime_cost) ?? 0), 0);
    const sumPrevPrime = prevRows.reduce((s, r) => s + (toNum(r.prime_cost) ?? 0), 0);

    const sumCurrFixed = currRows.reduce((s, r) => s + (toNum(r.fixed_costs) ?? 0), 0);
    const sumCurrMarketing = currRows.reduce((s, r) => s + (toNum(r.marketing_spend) ?? 0), 0);
    const sumCurrInterest = currRows.reduce((s, r) => s + (toNum(r.interest_expense) ?? 0), 0);

    const currEbitdaMargin = sumCurrRevenue > 0 ? (sumCurrEbit / sumCurrRevenue) * 100 : null;
    const prevEbitdaMargin = sumPrevRevenue > 0 ? (sumPrevEbit / sumPrevRevenue) * 100 : null;

    const currContributionPct =
      sumCurrRevenue > 0
        ? (sumCurrContribution / sumCurrRevenue) * 100
        : avg(currRows.map((r) => pctMaybe(toNum(r.contribution_margin_pct))).filter((x): x is number => x !== null));

    const prevContributionPct =
      sumPrevRevenue > 0
        ? (sumPrevContribution / sumPrevRevenue) * 100
        : avg(prevRows.map((r) => pctMaybe(toNum(r.contribution_margin_pct))).filter((x): x is number => x !== null));

    const currPrimePct =
      sumCurrRevenue > 0
        ? (sumCurrPrime / sumCurrRevenue) * 100
        : avg(currRows.map((r) => pctMaybe(toNum(r.prime_cost_pct))).filter((x): x is number => x !== null));

    const prevPrimePct =
      sumPrevRevenue > 0
        ? (sumPrevPrime / sumPrevRevenue) * 100
        : avg(prevRows.map((r) => pctMaybe(toNum(r.prime_cost_pct))).filter((x): x is number => x !== null));

    const breakEvenRevenue =
      currContributionPct !== null && currContributionPct > 0
        ? (sumCurrFixed + sumCurrMarketing + sumCurrInterest) / (currContributionPct / 100)
        : null;

    const breakEvenRatio =
      breakEvenRevenue !== null && sumCurrRevenue > 0 ? breakEvenRevenue / sumCurrRevenue : null;

    const sumCurrOrders = currRows.reduce((s, r) => s + (Number(r.orders) || 0), 0);
    const sumCurrCustomers = currRows.reduce((s, r) => s + (Number(r.customers) || 0), 0);

    const avgOrderValue = sumCurrOrders > 0 ? sumCurrRevenue / sumCurrOrders : null;
    const revenuePerCustomer = sumCurrCustomers > 0 ? sumCurrRevenue / sumCurrCustomers : null;

    const day = currRows.map((r) => {
    const raw = r.day;
    const d = new Date(raw as any);
    return Number.isNaN(d.getTime()) ? String(raw) : d.toISOString().slice(0, 10);
    });
    const REVENUE = currRows.map((r) => toNum(r.revenue));
    const EBITDA = currRows.map((r) => toNum(r.ebit));
    const EBITDA_MARGIN = currRows.map((r) => {
      const rev = toNum(r.revenue);
      const e = toNum(r.ebit);
      return rev && rev !== 0 && e !== null ? (e / rev) * 100 : null;
    });
    const CONTRIBUTION_MARGIN_PCT = currRows.map((r) => pctMaybe(toNum(r.contribution_margin_pct)));
    const PRIME_COST_PCT = currRows.map((r) => pctMaybe(toNum(r.prime_cost_pct)));

    const kpis: Kpi[] = [
      {
        code: "PF_REVENUE",
        label: "Revenue",
        value: sumCurrRevenue,
        unit: "usd",
        delta: deltaPct(sumCurrRevenue, sumPrevRevenue),
        severity: "good",
        hint: "Total revenue in selected window.",
      },
      {
        code: "PF_EBITDA",
        label: "EBITDA",
        value: sumCurrEbit,
        unit: "usd",
        delta: deltaPct(sumCurrEbit, sumPrevEbit),
        severity: sumCurrEbit < 0 ? "risk" : "good",
        hint: "EBITDA proxy from daily feature table.",
      },
      {
        code: "PF_EBITDA_MARGIN",
        label: "EBITDA Margin",
        value: currEbitdaMargin,
        unit: "pct",
        delta: deltaPoints(currEbitdaMargin, prevEbitdaMargin),
        severity: sevEbitdaMargin(currEbitdaMargin),
        hint: "EBITDA / Revenue.",
      },
      {
        code: "PF_CONTRIBUTION_MARGIN",
        label: "Contribution Margin",
        value: sumCurrContribution,
        unit: "usd",
        delta: deltaPct(sumCurrContribution, sumPrevContribution),
        severity: "good",
        hint: "Revenue less variable operating cost contribution.",
      },
      {
        code: "PF_CONTRIBUTION_MARGIN_PCT",
        label: "Contribution Margin %",
        value: currContributionPct,
        unit: "pct",
        delta: deltaPoints(currContributionPct, prevContributionPct),
        severity: sevContributionMargin(currContributionPct),
        hint: "Contribution margin as % of revenue.",
      },
      {
        code: "PF_BREAK_EVEN_REVENUE",
        label: "Break-even Revenue",
        value: breakEvenRevenue,
        unit: "usd",
        delta: null,
        severity: breakEvenRatio !== null && breakEvenRatio > 1.05 ? "risk" : breakEvenRatio !== null && breakEvenRatio > 0.95 ? "warn" : "good",
        hint: "Estimated revenue required to cover fixed/period costs.",
      },
      {
        code: "PF_BREAK_EVEN_RATIO",
        label: "Break-even Ratio",
        value: breakEvenRatio !== null ? breakEvenRatio * 100 : null,
        unit: "pct",
        delta: null,
        severity: sevBreakEven(breakEvenRatio),
        hint: "Break-even revenue / actual revenue.",
      },
      {
        code: "PF_AOV",
        label: "Avg Order Value",
        value: avgOrderValue,
        unit: "usd",
        delta: null,
        severity: "good",
        hint: "Revenue / orders in selected window.",
      },
      {
        code: "PF_REVENUE_PER_CUSTOMER",
        label: "Revenue / Customer",
        value: revenuePerCustomer,
        unit: "usd",
        delta: null,
        severity: "good",
        hint: "Revenue / customers in selected window.",
      },
      {
        code: "PF_PRIME_COST_PCT",
        label: "Prime Cost %",
        value: currPrimePct,
        unit: "pct",
        delta: deltaPoints(currPrimePct, prevPrimePct),
        severity: currPrimePct !== null && currPrimePct >= 65 ? "risk" : currPrimePct !== null && currPrimePct >= 60 ? "warn" : "good",
        hint: "Food + labor cost as % of revenue.",
      },
    ];

    const alerts: Alert[] = [];
    const actions: Action[] = [];

    if (currEbitdaMargin !== null && currEbitdaMargin < 15) {
      alerts.push({
        id: "alert_ebitda_margin",
        severity: currEbitdaMargin < 8 ? "risk" : "warn",
        title: "EBITDA margin below target",
        detail: `EBITDA margin is ${currEbitdaMargin.toFixed(1)}% for the selected window.`,
      });
      actions.push({
        id: "act_ebitda_margin",
        priority: 1,
        title: "Improve operating margin",
        rationale: "Tighten controllable cost, improve menu mix, and reduce leakage to lift EBITDA margin.",
        owner: "Finance / Operations",
      });
    }

    if (breakEvenRatio !== null && breakEvenRatio > 0.95) {
      alerts.push({
        id: "alert_break_even",
        severity: breakEvenRatio > 1.05 ? "risk" : "warn",
        title: "Revenue near break-even threshold",
        detail: `Break-even revenue is ${(breakEvenRatio * 100).toFixed(1)}% of actual revenue.`,
      });
      actions.push({
        id: "act_break_even",
        priority: 2,
        title: "Increase buffer above break-even",
        rationale: "Focus on high-margin items, improve throughput, and review fixed-cost drag.",
        owner: "GM / Finance",
      });
    }

    if (currContributionPct !== null && currContributionPct < 28) {
      alerts.push({
        id: "alert_contribution",
        severity: currContributionPct < 20 ? "risk" : "warn",
        title: "Contribution margin is soft",
        detail: `Contribution margin is ${currContributionPct.toFixed(1)}% in the selected window.`,
      });
      actions.push({
        id: "act_contribution",
        priority: 3,
        title: "Improve contribution margin",
        rationale: "Push higher-margin items, review discounting, and optimize product mix by location.",
        owner: "Marketing / Menu",
      });
    }

    return NextResponse.json(
      {
        ok: true,
        as_of: asOfTs,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: {
          id: locationId ?? "all",
          name: locName,
        },
        kpis,
        series: {
          day,
          REVENUE,
          EBITDA,
          EBITDA_MARGIN,
          CONTRIBUTION_MARGIN_PCT,
          PRIME_COST_PCT,
        },
        alerts: alerts.slice(0, 8),
        actions: actions.slice(0, 3),
        raw: {
          rows_curr: currRows.length,
          rows_prev: prevRows.length,
          days,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/profit failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e), kpis: [], series: {}, alerts: [], actions: [] },
      { status: 500 }
    );
  }
}