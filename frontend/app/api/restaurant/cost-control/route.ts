//frontend/app/api/restaurant/cost-control/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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

function windowDays(windowCode: "7d" | "30d" | "90d" | "ytd", asOfDay: Date): number {
  if (windowCode === "7d") return 7;
  if (windowCode === "30d") return 30;
  if (windowCode === "90d") return 90;
  const start = new Date(Date.UTC(asOfDay.getUTCFullYear(), 0, 1));
  return Math.floor((asOfDay.getTime() - start.getTime()) / 86400000) + 1;
}

function sevFoodCost(v: number | null): Severity {
  if (v === null) return "good";
  if (v >= 34) return "risk";
  if (v >= 30) return "warn";
  return "good";
}

function sevLabor(v: number | null): Severity {
  if (v === null) return "good";
  if (v >= 32) return "risk";
  if (v >= 28) return "warn";
  return "good";
}

function sevPrime(v: number | null): Severity {
  if (v === null) return "good";
  if (v >= 65) return "risk";
  if (v >= 60) return "warn";
  return "good";
}

function sevWaste(v: number | null): Severity {
  if (v === null) return "good";
  if (v >= 4) return "risk";
  if (v >= 2.5) return "warn";
  return "good";
}

function toDateOnly(v: unknown): string {
  const d = new Date(v as any);
  if (Number.isNaN(d.getTime())) {
    throw new Error(`Invalid asOfTs value: ${String(v)}`);
  }
  return d.toISOString().slice(0, 10);
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
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
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          window: "30d",
          location: { id: "all", name: "All Locations" },
          kpis: [],
          series: {},
          alerts: [],
          actions: [],
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

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

    const sql = `
      WITH params AS (
        SELECT
          $1::date AS as_of_day,
          $2::int AS n_days,
          $3::bigint AS p_location
      ),
      curr AS (
        SELECT f.*
        FROM restaurant.f_location_daily_features f
        CROSS JOIN params p
        WHERE f.tenant_id = $4::uuid
          AND f.day BETWEEN (p.as_of_day - (p.n_days - 1)) AND p.as_of_day
          AND (p.p_location IS NULL OR f.location_id = p.p_location)
      ),
      prev AS (
        SELECT f.*
        FROM restaurant.f_location_daily_features f
        CROSS JOIN params p
        WHERE f.tenant_id = $4::uuid
          AND f.day BETWEEN (p.as_of_day - ((p.n_days * 2) - 1)) AND (p.as_of_day - p.n_days)
          AND (p.p_location IS NULL OR f.location_id = p.p_location)
      )
      SELECT
        'curr' AS bucket,
        day,
        tenant_id,
        location_id,
        location_name,
        revenue,
        cogs,
        labor,
        orders,
        customers,
        food_cost_pct,
        labor_cost_pct,
        prime_cost,
        prime_cost_pct,
        waste_pct,
        waste_amount,
        stockout_count,
        discount_pct,
        void_pct,
        refund_pct
      FROM curr

      UNION ALL

      SELECT
        'prev' AS bucket,
        day,
        tenant_id,
        location_id,
        location_name,
        revenue,
        cogs,
        labor,
        orders,
        customers,
        food_cost_pct,
        labor_cost_pct,
        prime_cost,
        prime_cost_pct,
        waste_pct,
        waste_amount,
        stockout_count,
        discount_pct,
        void_pct,
        refund_pct
      FROM prev

      ORDER BY bucket, day;
    `;

    const asOfDateStr = toDateOnly(asOfTs);
    const asOfDay = new Date(`${asOfDateStr}T00:00:00.000Z`);
    const days = windowDays(windowCode, asOfDay);

    const res = await pool.query(sql, [asOfDateStr, days, locationId, tenantId]);

    const rows = res.rows ?? [];
    const currRows = rows.filter((r) => r.bucket === "curr");
    const prevRows = rows.filter((r) => r.bucket === "prev");

    const locName =
      locationId === null
        ? "All Locations"
        : currRows[0]?.location_name ?? `Location ${locationId}`;

    const currFood = avg(currRows.map((r) => pctMaybe(toNum(r.food_cost_pct))).filter((x): x is number => x !== null));
    const prevFood = avg(prevRows.map((r) => pctMaybe(toNum(r.food_cost_pct))).filter((x): x is number => x !== null));

    const currLabor = avg(currRows.map((r) => pctMaybe(toNum(r.labor_cost_pct))).filter((x): x is number => x !== null));
    const prevLabor = avg(prevRows.map((r) => pctMaybe(toNum(r.labor_cost_pct))).filter((x): x is number => x !== null));

    const currPrime = avg(currRows.map((r) => pctMaybe(toNum(r.prime_cost_pct))).filter((x): x is number => x !== null));
    const prevPrime = avg(prevRows.map((r) => pctMaybe(toNum(r.prime_cost_pct))).filter((x): x is number => x !== null));

    const currWaste = avg(currRows.map((r) => pctMaybe(toNum(r.waste_pct))).filter((x): x is number => x !== null));
    const prevWaste = avg(prevRows.map((r) => pctMaybe(toNum(r.waste_pct))).filter((x): x is number => x !== null));

    const currDiscount = avg(currRows.map((r) => pctMaybe(toNum(r.discount_pct))).filter((x): x is number => x !== null));
    const prevDiscount = avg(prevRows.map((r) => pctMaybe(toNum(r.discount_pct))).filter((x): x is number => x !== null));

    const currVoid = avg(currRows.map((r) => pctMaybe(toNum(r.void_pct))).filter((x): x is number => x !== null));
    const prevVoid = avg(prevRows.map((r) => pctMaybe(toNum(r.void_pct))).filter((x): x is number => x !== null));

    const currRefund = avg(currRows.map((r) => pctMaybe(toNum(r.refund_pct))).filter((x): x is number => x !== null));
    const prevRefund = avg(prevRows.map((r) => pctMaybe(toNum(r.refund_pct))).filter((x): x is number => x !== null));

    const wasteAmount = currRows.reduce((s, r) => s + (toNum(r.waste_amount) ?? 0), 0);
    const stockouts = currRows.reduce((s, r) => s + (Number(r.stockout_count) || 0), 0);

    const day = currRows.map((r) => String(r.day));
    const FOOD_COST_PCT = currRows.map((r) => pctMaybe(toNum(r.food_cost_pct)));
    const LABOR_COST_PCT = currRows.map((r) => pctMaybe(toNum(r.labor_cost_pct)));
    const PRIME_COST_PCT = currRows.map((r) => pctMaybe(toNum(r.prime_cost_pct)));
    const WASTE_PCT = currRows.map((r) => pctMaybe(toNum(r.waste_pct)));
    const DISCOUNT_PCT = currRows.map((r) => pctMaybe(toNum(r.discount_pct)));

    const kpis: Kpi[] = [
      {
        code: "CC_FOOD_COST_PCT",
        label: "Food Cost %",
        value: currFood,
        unit: "pct",
        delta: deltaPoints(currFood, prevFood),
        severity: sevFoodCost(currFood),
        hint: "Average food cost % for selected window.",
      },
      {
        code: "CC_LABOR_COST_PCT",
        label: "Labor Cost %",
        value: currLabor,
        unit: "pct",
        delta: deltaPoints(currLabor, prevLabor),
        severity: sevLabor(currLabor),
        hint: "Average labor cost % for selected window.",
      },
      {
        code: "CC_PRIME_COST_PCT",
        label: "Prime Cost %",
        value: currPrime,
        unit: "pct",
        delta: deltaPoints(currPrime, prevPrime),
        severity: sevPrime(currPrime),
        hint: "Food cost % + labor cost %.",
      },
      {
        code: "CC_WASTE_PCT",
        label: "Waste %",
        value: currWaste,
        unit: "pct",
        delta: deltaPoints(currWaste, prevWaste),
        severity: sevWaste(currWaste),
        hint: "Average waste % for selected window.",
      },
      {
        code: "CC_STOCKOUTS",
        label: "Stockouts",
        value: stockouts,
        unit: "count",
        delta: null,
        severity: stockouts >= 20 ? "risk" : stockouts >= 8 ? "warn" : "good",
        hint: "Total stockout count for selected window.",
      },
      {
        code: "CC_WASTE_AMOUNT",
        label: "Waste Amount",
        value: wasteAmount,
        unit: "usd",
        delta: null,
        severity: wasteAmount >= 5000 ? "risk" : wasteAmount >= 2000 ? "warn" : "good",
        hint: "Total waste amount for selected window.",
      },
      {
        code: "CC_DISCOUNT_PCT",
        label: "Discount %",
        value: currDiscount,
        unit: "pct",
        delta: deltaPoints(currDiscount, prevDiscount),
        severity:
          currDiscount !== null && currDiscount >= 6
            ? "risk"
            : currDiscount !== null && currDiscount >= 3
            ? "warn"
            : "good",
        hint: "Average discount % for selected window.",
      },
      {
        code: "CC_VOID_PCT",
        label: "Void %",
        value: currVoid,
        unit: "pct",
        delta: deltaPoints(currVoid, prevVoid),
        severity:
          currVoid !== null && currVoid >= 1.5
            ? "risk"
            : currVoid !== null && currVoid >= 0.75
            ? "warn"
            : "good",
        hint: "Average void % for selected window.",
      },
      {
        code: "CC_REFUND_PCT",
        label: "Refund %",
        value: currRefund,
        unit: "pct",
        delta: deltaPoints(currRefund, prevRefund),
        severity:
          currRefund !== null && currRefund >= 1.5
            ? "risk"
            : currRefund !== null && currRefund >= 0.75
            ? "warn"
            : "good",
        hint: "Average refund % for selected window.",
      },
    ];

    const alerts: Alert[] = [];
    const actions: Action[] = [];

    if (currPrime !== null && currPrime >= 60) {
      alerts.push({
        id: "alert_prime_cost",
        severity: currPrime >= 65 ? "risk" : "warn",
        title: "Prime cost above target",
        detail: `Prime cost is ${currPrime.toFixed(1)}% for the selected window.`,
      });
      actions.push({
        id: "act_prime_cost",
        priority: 1,
        title: "Reduce prime cost",
        rationale: "Review food and labor together; trim overtime, re-check prep yields, and tighten purchasing.",
        owner: "Operations",
      });
    }

    if (currFood !== null && currFood >= 30) {
      alerts.push({
        id: "alert_food_cost",
        severity: currFood >= 34 ? "risk" : "warn",
        title: "Food cost pressure detected",
        detail: `Food cost is ${currFood.toFixed(1)}%, above normal operating range.`,
      });
      actions.push({
        id: "act_food_cost",
        priority: 2,
        title: "Tighten food cost controls",
        rationale: "Review top COGS items, portioning, vendor pricing, and menu mix.",
        owner: "Kitchen / Purchasing",
      });
    }

    if (currWaste !== null && currWaste >= 2.5) {
      alerts.push({
        id: "alert_waste",
        severity: currWaste >= 4 ? "risk" : "warn",
        title: "Waste is elevated",
        detail: `Waste is averaging ${currWaste.toFixed(2)}% of sales.`,
      });
      actions.push({
        id: "act_waste",
        priority: 3,
        title: "Reduce waste",
        rationale: "Audit prep waste, spoilage, and dead stock; adjust pars and prep cadence.",
        owner: "Kitchen",
      });
    }

    if (currDiscount !== null && currDiscount >= 3) {
      alerts.push({
        id: "alert_discount",
        severity: currDiscount >= 6 ? "risk" : "warn",
        title: "Discount leakage detected",
        detail: `Discount % is averaging ${currDiscount.toFixed(2)}%.`,
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
          FOOD_COST_PCT,
          LABOR_COST_PCT,
          PRIME_COST_PCT,
          WASTE_PCT,
          DISCOUNT_PCT,
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
    console.error("GET /api/restaurant/cost-control failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e), kpis: [], series: {}, alerts: [], actions: [] },
      { status: 500 }
    );
  }
}