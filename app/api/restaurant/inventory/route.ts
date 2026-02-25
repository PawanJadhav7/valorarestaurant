// app/api/restaurant/inventory/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Unit = "usd" | "pct" | "days" | "ratio" | "count";
type Severity = "good" | "warn" | "risk";

type Kpi = {
  code: string;
  label: string;
  value: number | null;
  unit: Unit;
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

function parseWindow(sp: URLSearchParams): string {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  return ["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d";
}

function parseUuid(sp: URLSearchParams, key: string): string | null {
  const v = sp.get(key);
  if (!v) return null;
  const t = v.trim();
  return t.length ? t : null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function worstSeverity(alerts: any[], alertId: string): Severity {
  const a = alerts.find((x) => x.alert_id === alertId);
  if (!a) return "good";
  if (a.severity === "risk") return "risk";
  if (a.severity === "warn") return "warn";
  return "good";
}

// Inventory policy defaults (move to config later)
const TARGET_DIH = 60;
const WARN_DIH = 75;
const RISK_DIH = 100;

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOfParam = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseUuid(url.searchParams, "location_id"); // optional UUID

    // 1) Resolve a stable as_of_ts:
    //    - if user passed as_of, use it
    //    - else, use the latest snapshot_date from inventory item fact
    let asOfTs: string | null = asOfParam;

    if (!asOfTs) {
      const anchorSql = locationId
        ? `
          SELECT (MAX(snapshot_date)::timestamptz) AS as_of_ts
          FROM restaurant.fact_inventory_item_on_hand_daily
          WHERE location_id = $1::uuid
        `
        : `
          SELECT (MAX(snapshot_date)::timestamptz) AS as_of_ts
          FROM restaurant.fact_inventory_item_on_hand_daily
        `;

      const anchorRes = await pool.query(anchorSql, locationId ? [locationId] : []);
      asOfTs = anchorRes.rows?.[0]?.as_of_ts ?? null;
    }

    // If we still don’t have an anchor, return a stable empty payload (no crash)
    if (!asOfTs) {
      return NextResponse.json(
        {
          ok: true,
          as_of: null,
          refreshed_at: refreshedAt,
          window: windowCode,
          location: {
            id: locationId ?? "all",
            name: locationId ? "Location" : "All Locations",
          },
          kpis: [],
          inventory: {
            kpis: null,
            alerts: [],
            actions: [],
            policy: {
              target_dih_days: TARGET_DIH,
              warn_dih_days: WARN_DIH,
              risk_dih_days: RISK_DIH,
            },
          },
          drivers: {
            top_onhand_items: [],
            category_mix: [],
            slow_movers: [],
          },
          raw: {
            anchor_missing: true,
          },
        },
        { headers: { "Cache-Control": "no-store" } }
      );
    }

    // 2) From here on, ALWAYS use the same signature: ($1 as_of_ts, $2 window_code, $3 location_id)
    const params = [asOfTs, windowCode, locationId];

    const sqlKpis = `SELECT * FROM analytics.get_inventory_kpis($1::timestamptz, $2::text, $3::uuid, ${TARGET_DIH});`;

    const sqlAlerts = `SELECT * FROM analytics.get_inventory_alerts($1::timestamptz, $2::text, $3::uuid, ${TARGET_DIH}, ${WARN_DIH}, ${RISK_DIH});`;

    const sqlActions = `SELECT * FROM analytics.get_inventory_actions($1::timestamptz, $2::text, $3::uuid, ${TARGET_DIH}, ${WARN_DIH}, ${RISK_DIH});`;

    const sqlTopItems = `SELECT * FROM analytics.get_inventory_top_onhand_items($1::timestamptz, $2::text, $3::uuid, 10::int);`;

    const sqlCategoryMix = `SELECT * FROM analytics.get_inventory_category_mix($1::timestamptz, $2::text, $3::uuid);`;

    // OPTIONAL (don’t break API if function isn’t created yet)
    const sqlSlowMovers = `SELECT * FROM analytics.get_inventory_slow_movers($1::timestamptz, $2::text, $3::uuid, 10::int);`;

    // Run required queries
    const [kpiRes, alertsRes, actionsRes, topItemsRes, catMixRes] = await Promise.all([
      pool.query(sqlKpis, params),
      pool.query(sqlAlerts, params),
      pool.query(sqlActions, params),
      pool.query(sqlTopItems, params),
      pool.query(sqlCategoryMix, params),
    ]);

    // Run optional query safely
    let slowMoversRows: any[] = [];
    try {
      const slowMoversRes = await pool.query(sqlSlowMovers, params);
      slowMoversRows = slowMoversRes.rows ?? [];
    } catch {
      slowMoversRows = [];
    }

    const k = kpiRes.rows?.[0] ?? null;
    const alerts = alertsRes.rows ?? [];
    const actions = actionsRes.rows ?? [];
    const top_onhand_items = topItemsRes.rows ?? [];
    const category_mix = catMixRes.rows ?? [];
    const slow_movers = slowMoversRows;

    const sevDIH = worstSeverity(alerts, "inv_dih");
    const sevCash = worstSeverity(alerts, "inv_excess_cash");

    const kpis: Kpi[] = k
      ? [
          {
            code: "INV_AVG_VALUE",
            label: "Avg Inventory Value",
            value: toNum(k.avg_inventory_value),
            unit: "usd",
            severity: "good",
            hint: "Average on-hand inventory value over the window.",
          },
          {
            code: "INV_DIH",
            label: "Days Inventory on Hand",
            value: toNum(k.dih_days),
            unit: "days",
            severity: sevDIH,
            hint: `DIH based on avg inventory and daily COGS (target ${TARGET_DIH}d).`,
          },
          {
            code: "INV_TURNS",
            label: "Inventory Turns",
            value: toNum(k.inventory_turns),
            unit: "ratio",
            severity: "good",
            hint: "Annualized COGS / avg inventory.",
          },
          {
            code: "INV_EXCESS_CASH",
            label: "Excess Inventory Cash",
            value: toNum(k.excess_inventory_value),
            unit: "usd",
            severity: sevCash,
            hint: `Estimated cash trapped above target DIH (${TARGET_DIH}d).`,
          },
        ]
      : [];

    return NextResponse.json(
      {
        ok: true,
        as_of: k?.as_of_ts ?? asOfTs,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: {
          id: locationId ?? "all",
          name: locationId ? "Location" : "All Locations",
        },

        // UI contract
        kpis,

        // Intelligence payloads
        inventory: {
          kpis: k,
          alerts,
          actions,
          policy: {
            target_dih_days: TARGET_DIH,
            warn_dih_days: WARN_DIH,
            risk_dih_days: RISK_DIH,
          },
        },

        // Drivers for charts / lists
        drivers: {
          top_onhand_items,
          category_mix,
          slow_movers,
        },

        raw: {
          anchor_as_of_ts: asOfTs,
          inventory_kpis_row: Boolean(k),
          inventory_alerts_count: alerts.length,
          inventory_actions_count: actions.length,
          top_onhand_items_count: top_onhand_items.length,
          category_mix_count: category_mix.length,
          slow_movers_count: slow_movers.length,
        },
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    console.error("GET /api/restaurant/inventory failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}