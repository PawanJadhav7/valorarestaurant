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

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
}

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw || raw.trim() === "" || raw.trim().toLowerCase() === "all") return null;
  const n = Number(raw.trim());
  return Number.isInteger(n) ? n : null;
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

function pctDelta(prevVal: number | null, currVal: number | null): number | null {
  if (prevVal === null || currVal === null || prevVal === 0) return null;
  return Number((((currVal - prevVal) / prevVal) * 100).toFixed(2));
}

function worstSeverityFromDih(dih: number | null): Severity {
  if (dih === null) return "good";
  if (dih >= 100) return "risk";
  if (dih >= 75) return "warn";
  return "good";
}

function worstSeverityFromCash(v: number | null): Severity {
  if (v === null) return "good";
  if (v >= 8000) return "risk";
  if (v >= 3000) return "warn";
  return "good";
}

function windowDays(windowCode: "7d" | "30d" | "90d" | "ytd", asOfDate: Date): number {
  if (windowCode === "7d") return 7;
  if (windowCode === "30d") return 30;
  if (windowCode === "90d") return 90;
  const yearStart = new Date(Date.UTC(asOfDate.getUTCFullYear(), 0, 1));
  const diffMs = asOfDate.getTime() - yearStart.getTime();
  return Math.floor(diffMs / 86400000) + 1;
}

const TARGET_DIH = 60;
const WARN_DIH = 75;
const RISK_DIH = 100;

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOfParam = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    let asOfTs: string | null = asOfParam;

    if (!asOfTs) {
      const anchorRes = await pool.query(`
        select max(day)::timestamptz as as_of_ts
        from restaurant.fact_inventory_item_on_hand_daily
      `);
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

    const asOfDate = new Date(asOfTs);
    const days = windowDays(windowCode, asOfDate);

    // NOTE:
    // fact_inventory_item_on_hand_daily has entity_id, not location_id.
    // For MVP we treat selected location_id as an entity/location proxy.

    const currInvRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_entity
      ),
      curr as (
        select *
        from restaurant.fact_inventory_item_on_hand_daily f
        cross join params p
        where f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_entity is null or f.entity_id = p.p_entity)
      )
      select
        coalesce(avg(on_hand_value), 0)::numeric as avg_inventory_value,
        count(*)::int as row_count
      from curr
      `,
      [asOfTs, days, locationId]
    );

    const prevInvRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_entity
      ),
      bounds as (
        select
          (as_of_day - (n_days - 1))::date as curr_start,
          as_of_day::date as curr_end,
          n_days,
          p_entity
        from params
      ),
      prev_range as (
        select
          (curr_start - n_days)::date as prev_start,
          (curr_start - 1)::date as prev_end,
          p_entity
        from bounds
      ),
      prev as (
        select *
        from restaurant.fact_inventory_item_on_hand_daily f
        cross join prev_range p
        where f.day between p.prev_start and p.prev_end
          and (p.p_entity is null or f.entity_id = p.p_entity)
      )
      select
        coalesce(avg(on_hand_value), 0)::numeric as avg_inventory_value,
        count(*)::int as row_count
      from prev
      `,
      [asOfTs, days, locationId]
    );

    const currOpsRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      curr as (
        select *
        from restaurant.f_location_daily_features f
        cross join params p
        where f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(avg(dio), 0)::numeric as dih_days,
        coalesce(avg(avg_inventory), 0)::numeric as avg_inventory_feature,
        coalesce(sum(cogs), 0)::numeric as total_cogs,
        coalesce(avg(cogs), 0)::numeric as avg_daily_cogs
      from curr
      `,
      [asOfTs, days, locationId]
    );

    const prevOpsRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_location
      ),
      bounds as (
        select
          (as_of_day - (n_days - 1))::date as curr_start,
          as_of_day::date as curr_end,
          n_days,
          p_location
        from params
      ),
      prev_range as (
        select
          (curr_start - n_days)::date as prev_start,
          (curr_start - 1)::date as prev_end,
          p_location
        from bounds
      ),
      prev as (
        select *
        from restaurant.f_location_daily_features f
        cross join prev_range p
        where f.day between p.prev_start and p.prev_end
          and (p.p_location is null or f.location_id = p.p_location)
      )
      select
        coalesce(avg(dio), 0)::numeric as dih_days,
        coalesce(avg(avg_inventory), 0)::numeric as avg_inventory_feature,
        coalesce(sum(cogs), 0)::numeric as total_cogs,
        coalesce(avg(cogs), 0)::numeric as avg_daily_cogs
      from prev
      `,
      [asOfTs, days, locationId]
    );

    const topItemsRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_entity
      ),
      curr as (
        select *
        from restaurant.fact_inventory_item_on_hand_daily f
        cross join params p
        where f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_entity is null or f.entity_id = p.p_entity)
      )
      select
        min(item_id)::text as menu_item_id,
        item_name,
        coalesce(nullif(split_part(item_name, ' - ', 1), ''), 'Uncategorized') as category,
        round(avg(on_hand_value)::numeric, 2) as avg_on_hand_value,
        0::numeric as avg_qty,
        0::numeric as avg_unit_cost
      from curr
      group by item_id, item_name
      order by avg_on_hand_value desc
      limit 10
      `,
      [asOfTs, days, locationId]
    );

    const catMixRes = await pool.query(
      `
      with params as (
        select
          $1::timestamptz::date as as_of_day,
          $2::int as n_days,
          $3::bigint as p_entity
      ),
      curr as (
        select *
        from restaurant.fact_inventory_item_on_hand_daily f
        cross join params p
        where f.day between (p.as_of_day - (p.n_days - 1)) and p.as_of_day
          and (p.p_entity is null or f.entity_id = p.p_entity)
      ),
      by_cat as (
        select
          coalesce(nullif(split_part(item_name, ' - ', 1), ''), 'Uncategorized') as category,
          avg(on_hand_value)::numeric as avg_on_hand_value
        from curr
        group by 1
      ),
      tot as (
        select coalesce(sum(avg_on_hand_value), 0)::numeric as total_value
        from by_cat
      )
      select
        b.category,
        round(b.avg_on_hand_value, 2) as avg_on_hand_value,
        case when t.total_value = 0 then 0
             else round((b.avg_on_hand_value / t.total_value * 100)::numeric, 2)
        end as pct_of_total
      from by_cat b
      cross join tot t
      order by b.avg_on_hand_value desc
      `,
      [asOfTs, days, locationId]
    );

    // MVP-safe placeholder: no movement table yet
    const slowMoversRows: any[] = [];

    const currInv = currInvRes.rows?.[0] ?? {};
    const prevInv = prevInvRes.rows?.[0] ?? {};
    const currOps = currOpsRes.rows?.[0] ?? {};
    const prevOps = prevOpsRes.rows?.[0] ?? {};

    const avgInventoryValue =
      toNum(currInv.avg_inventory_value) ?? toNum(currOps.avg_inventory_feature);

    const prevAvgInventoryValue =
      toNum(prevInv.avg_inventory_value) ?? toNum(prevOps.avg_inventory_feature);

    const dihDays = toNum(currOps.dih_days);
    const prevDihDays = toNum(prevOps.dih_days);

    const avgDailyCogs = toNum(currOps.avg_daily_cogs);
    const inventoryTurns =
      dihDays && dihDays > 0 ? Number((365 / dihDays).toFixed(2)) : null;

    const prevInventoryTurns =
      prevDihDays && prevDihDays > 0 ? Number((365 / prevDihDays).toFixed(2)) : null;

    const excessInventoryValue =
      avgInventoryValue !== null && avgDailyCogs !== null
        ? Number(Math.max(0, avgInventoryValue - TARGET_DIH * avgDailyCogs).toFixed(2))
        : null;

    const prevAvgDailyCogs = toNum(prevOps.avg_daily_cogs);
    const prevExcessInventoryValue =
      prevAvgInventoryValue !== null && prevAvgDailyCogs !== null
        ? Number(Math.max(0, prevAvgInventoryValue - TARGET_DIH * prevAvgDailyCogs).toFixed(2))
        : null;

    const alerts = [
      ...(dihDays !== null && dihDays >= WARN_DIH
        ? [{
            alert_id: "inv_dih",
            severity: dihDays >= RISK_DIH ? "risk" : "warn",
            title: "Inventory days on hand is elevated",
            detail: `Current DIH is ${dihDays.toFixed(1)} days versus target ${TARGET_DIH} days.`,
          }]
        : []),
      ...(excessInventoryValue !== null && excessInventoryValue >= 3000
        ? [{
            alert_id: "inv_excess_cash",
            severity: excessInventoryValue >= 8000 ? "risk" : "warn",
            title: "Cash is trapped in inventory",
            detail: `Estimated excess inventory cash is $${excessInventoryValue.toFixed(0)}.`,
          }]
        : []),
    ];

    const actions = [
      ...(dihDays !== null && dihDays >= WARN_DIH
        ? [{
            id: "act_inv_reduce_dih",
            priority: 1 as const,
            title: "Reduce inventory exposure",
            rationale: "Trim next POs and tighten pars on slow-moving stock.",
            owner: "Purchasing",
          }]
        : []),
      ...(excessInventoryValue !== null && excessInventoryValue >= 3000
        ? [{
            id: "act_inv_release_cash",
            priority: 2 as const,
            title: "Release cash from overstock",
            rationale: "Push promotions or bundles on high on-hand inventory items.",
            owner: "GM / Kitchen",
          }]
        : []),
    ].slice(0, 3);

    const sevDIH = worstSeverityFromDih(dihDays);
    const sevCash = worstSeverityFromCash(excessInventoryValue);

    const kpis: Kpi[] = [
      {
        code: "INV_AVG_VALUE",
        label: "Avg Inventory Value",
        value: avgInventoryValue,
        unit: "usd",
        delta: pctDelta(prevAvgInventoryValue, avgInventoryValue),
        severity: "good",
        hint: "Average on-hand inventory value over the selected window.",
      },
      {
        code: "INV_DIH",
        label: "Days Inventory on Hand",
        value: dihDays,
        unit: "days",
        delta: pctDelta(prevDihDays, dihDays),
        severity: sevDIH,
        hint: `DIH based on operations features (target ${TARGET_DIH}d).`,
      },
      {
        code: "INV_TURNS",
        label: "Inventory Turns",
        value: inventoryTurns,
        unit: "ratio",
        delta: pctDelta(prevInventoryTurns, inventoryTurns),
        severity: "good",
        hint: "Annualized inventory turns derived from DIH.",
      },
      {
        code: "INV_EXCESS_CASH",
        label: "Excess Inventory Cash",
        value: excessInventoryValue,
        unit: "usd",
        delta: pctDelta(prevExcessInventoryValue, excessInventoryValue),
        severity: sevCash,
        hint: `Estimated cash trapped above target DIH (${TARGET_DIH}d).`,
      },
    ];

    return NextResponse.json(
      {
        ok: true,
        as_of: asOfTs,
        refreshed_at: refreshedAt,
        window: windowCode,
        location: {
          id: locationId ?? "all",
          name: locationId ? `Location ${locationId}` : "All Locations",
        },

        kpis,

        inventory: {
          kpis: {
            avg_inventory_value: avgInventoryValue,
            dih_days: dihDays,
            inventory_turns: inventoryTurns,
            excess_inventory_value: excessInventoryValue,
          },
          alerts,
          actions,
          policy: {
            target_dih_days: TARGET_DIH,
            warn_dih_days: WARN_DIH,
            risk_dih_days: RISK_DIH,
          },
        },

        drivers: {
          top_onhand_items: topItemsRes.rows ?? [],
          category_mix: catMixRes.rows ?? [],
          slow_movers: slowMoversRows,
        },

        raw: {
          anchor_as_of_ts: asOfTs,
          inventory_kpis_row: true,
          inventory_alerts_count: alerts.length,
          inventory_actions_count: actions.length,
          top_onhand_items_count: (topItemsRes.rows ?? []).length,
          category_mix_count: (catMixRes.rows ?? []).length,
          slow_movers_count: slowMoversRows.length,
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