// app/api/restaurant/inventory/drivers/route.ts
import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Severity = "good" | "warn" | "risk";

type ApiKpi = {
  code: string;
  label: string;
  value: number | null;
  unit: "usd" | "pct" | "days" | "ratio" | "count" | "hours";
  delta?: number | null;
  severity?: Severity;
  hint?: string;
};

type InvTopOnhandItem = {
  menu_item_id: string;
  item_name: string;
  category: string;
  avg_qty: string | number;
  avg_unit_cost: string | number;
  avg_on_hand_value: string | number;
};

type InvCategoryMixRow = {
  category: string;
  avg_on_hand_value: string | number;
  pct_of_total: string | number;
};

type InvSlowMover = {
  menu_item_id: string;
  item_name: string;
  category: string;
  avg_qty: string | number;
  avg_unit_cost: string | number;
  avg_on_hand_value: string | number;
  sold_qty: string | number;
  sold_revenue: string | number;
  sell_through_pct: string | number;
  slow_score: string | number;
};

type InvDriversPayload = {
  top_onhand_items?: InvTopOnhandItem[];
  category_mix?: InvCategoryMixRow[];
  slow_movers?: InvSlowMover[];
};

type InvResp = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  window?: string;
  location?: { id: string; name: string };
  kpis: ApiKpi[];
  drivers?: InvDriversPayload;
  error?: string;
};

export type OpsDriver = {
  id: string;
  domain: "inventory";
  severity: Severity;
  title: string;
  why: string;
  recommendation: string;
  kpi_code?: string;
  metric?: { value?: number | null; delta?: number | null; unit?: string };
  score?: number;
  meta?: Record<string, any>;
};

export type OpsAction = {
  action_id: string;
  priority: number;
  owner: string;
  title: string;
  rationale: string;
  expected_impact?: string;
  severity?: Severity;
  meta?: Record<string, any>;
};

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  return (["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d") as any;
}

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

async function safeJson(res: Response, label: string) {
  const text = await res.text();
  try {
    return JSON.parse(text);
  } catch {
    throw new Error(`${label} returned non-JSON (${res.status}). BodyPreview=${text.slice(0, 180)}`);
  }
}

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function scoreFrom(sev: Severity, bump?: number | null) {
  const base = sev === "risk" ? 100 : sev === "warn" ? 60 : 20;
  const extra = bump ? Math.min(30, Math.abs(bump)) : 0;
  return base + extra;
}

// --- Driver severity heuristics (tune later) ---
function sevOnhandValue(v: number | null): Severity {
  if (v === null) return "good";
  if (v >= 250) return "risk";
  if (v >= 150) return "warn";
  return "good";
}

function sevPctOfTotal(pct: number | null): Severity {
  if (pct === null) return "good";
  if (pct >= 30) return "risk";
  if (pct >= 20) return "warn";
  return "good";
}

function sevSlowScore(score: number | null): Severity {
  if (score === null) return "good";
  if (score >= 0.12) return "risk";
  if (score >= 0.08) return "warn";
  return "good";
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const origin = url.origin;

  const windowCode = parseWindow(url.searchParams);
  const asOf = parseAsOf(url.searchParams);
  const locationId = url.searchParams.get("location_id");

  const sp = new URLSearchParams();
  sp.set("window", windowCode);
  if (asOf) sp.set("as_of", asOf);
  if (locationId && locationId !== "all") sp.set("location_id", locationId);

  try {
    // Pull from your NEW inventory API which already contains intelligence payloads
    const invRes = await fetch(`${origin}/api/restaurant/inventory?${sp.toString()}`, { cache: "no-store" });
    const invJson = (await safeJson(invRes, "Inventory API")) as InvResp;

    if (!invJson?.ok) {
      throw new Error(invJson?.error ?? "Inventory API returned ok=false");
    }

    const kpis = invJson?.kpis ?? [];
    const by = new Map<string, ApiKpi>(kpis.map((k) => [k.code, k]));

    const topItems: InvTopOnhandItem[] = invJson?.drivers?.top_onhand_items ?? [];
    const catMix: InvCategoryMixRow[] = invJson?.drivers?.category_mix ?? [];
    const slowMovers: InvSlowMover[] = invJson?.drivers?.slow_movers ?? [];

    const drivers: OpsDriver[] = [];

    // 1) KPI-driven driver: DIH
    {
      const k = by.get("INV_DIH");
      const v = toNum(k?.value);
      const sev: Severity = v === null ? "good" : v >= 100 ? "risk" : v >= 75 ? "warn" : "good";

      drivers.push({
        id: "drv_inv_dih",
        domain: "inventory",
        severity: sev,
        title: "Inventory days on hand (DIH)",
        why: v === null ? "DIH is unavailable." : `DIH is ${v.toFixed(1)} days (target 60d).`,
        recommendation:
          sev === "risk"
            ? "Freeze/reduce POs on slow movers, tighten pars, and shorten ordering cadence."
            : sev === "warn"
            ? "Trim next POs; validate pars vs demand and lead time."
            : "Maintain cadence; keep DIH stable.",
        kpi_code: "INV_DIH",
        metric: { value: v, unit: "days" },
        score: scoreFrom(sev, v),
      });
    }

    // 2) KPI-driven driver: Excess cash
    {
      const k = by.get("INV_EXCESS_CASH");
      const v = toNum(k?.value);
      const sev: Severity = v === null ? "good" : v >= 8000 ? "risk" : v >= 3000 ? "warn" : "good";

      drivers.push({
        id: "drv_inv_cash",
        domain: "inventory",
        severity: sev,
        title: "Cash trapped in inventory",
        why: v === null ? "Excess cash metric is unavailable." : `Estimated excess cash is $${v.toFixed(0)}.`,
        recommendation:
          sev === "risk"
            ? "Prioritize sell-through: promos, bundles, and vendor MOQ reductions."
            : sev === "warn"
            ? "Review purchases vs demand; reduce exposure on slow categories."
            : "Keep inventory cash tight.",
        kpi_code: "INV_EXCESS_CASH",
        metric: { value: v, unit: "usd" },
        score: scoreFrom(sev, v),
      });
    }

    // 3) Drivers from Top On-hand items (value concentration)
    if (topItems.length) {
      const top = topItems.slice(0, 3).map((r) => {
        const v = toNum((r as any).avg_on_hand_value);
        const sev = sevOnhandValue(v);
        return {
          id: `drv_onhand_${r.menu_item_id.slice(0, 8)}`,
          domain: "inventory" as const,
          severity: sev,
          title: `High on-hand value: ${r.item_name}`,
          why: v === null ? "On-hand value unavailable." : `Avg on-hand value ~$${v.toFixed(0)} (${r.category}).`,
          recommendation:
            sev === "risk"
              ? "Reduce par/reorder point; consider feature promo or bundle to burn down."
              : sev === "warn"
              ? "Monitor exposure; trim next PO and validate sales velocity."
              : "Healthy exposure.",
          score: scoreFrom(sev, v),
          meta: r,
        };
      });

      drivers.push(...top);
    }

    // 4) Category mix concentration
    if (catMix.length) {
      const biggest = [...catMix]
        .map((r) => ({ ...r, pct: toNum((r as any).pct_of_total) }))
        .sort((a, b) => (b.pct ?? 0) - (a.pct ?? 0))[0];

      if (biggest) {
        const pct = toNum((biggest as any).pct_of_total);
        const sev = sevPctOfTotal(pct);
        drivers.push({
          id: "drv_cat_concentration",
          domain: "inventory",
          severity: sev,
          title: "Category concentration risk",
          why: pct === null ? "Category mix unavailable." : `${biggest.category} is ${pct.toFixed(1)}% of on-hand value.`,
          recommendation:
            sev === "risk"
              ? "Reduce exposure in the dominant category; shift purchasing to faster-turning items."
              : sev === "warn"
              ? "Monitor category balance; trim POs in the dominant category."
              : "Mix looks balanced.",
          score: scoreFrom(sev, pct),
          meta: biggest,
        });
      }
    }

    // 5) Slow movers (liquidity trap)
    if (slowMovers.length) {
      const worst = slowMovers[0];
      const sc = toNum((worst as any).slow_score);
      const sev = sevSlowScore(sc);

      drivers.push({
        id: `drv_slow_${worst.menu_item_id.slice(0, 8)}`,
        domain: "inventory",
        severity: sev,
        title: `Slow mover: ${worst.item_name}`,
        why:
          sc === null
            ? "Slow score unavailable."
            : `Slow score ${sc.toFixed(3)}; sell-through ${toNum((worst as any).sell_through_pct)?.toFixed(1) ?? "—"}%.`,
        recommendation:
          sev === "risk"
            ? "Pause buys for 1–2 cycles, run promo/bundle, reduce par and reorder point."
            : sev === "warn"
            ? "Trim next PO and watch sell-through weekly."
            : "No action needed.",
        score: scoreFrom(sev, sc),
        meta: worst,
      });
    }

    // ---- Auto Top 3 Actions (Step 2) ----
    const actionsAuto: OpsAction[] = slowMovers.slice(0, 3).map((it, idx) => {
      const v = toNum((it as any).avg_on_hand_value);
      const sc = toNum((it as any).slow_score);
      const sev = sevSlowScore(sc);

      return {
        action_id: `inv_auto_${idx + 1}_${it.menu_item_id.slice(0, 8)}`,
        priority: idx + 1,
        owner: idx === 0 ? "Purchasing" : "GM / Kitchen",
        severity: sev,
        title: `Reduce exposure on ${it.item_name} (${it.category})`,
        rationale:
          `Slow mover signal (score ${sc?.toFixed(3) ?? "—"}). ` +
          `Avg on-hand value ~$${v?.toFixed(0) ?? "—"}; sell-through ${toNum((it as any).sell_through_pct)?.toFixed(1) ?? "—"}%.`,
        expected_impact: "Improve sell-through and reduce cash trapped in inventory over next 1–2 cycles.",
        meta: it,
      };
    });

    drivers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const topDrivers = drivers.slice(0, 8);

    return NextResponse.json(
      {
        ok: true,
        as_of: invJson?.as_of ?? asOf ?? null,
        window: windowCode,
        location_id: locationId ?? null,

        // Step 1: driver list w/ computed severities
        drivers: topDrivers,

        // Step 2: auto Top 3 actions from slow movers
        actions: actionsAuto,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, drivers: [], actions: [], error: e?.message ?? String(e) }, { status: 500 });
  }
}