// app/api/restaurant/labor/drivers/route.ts
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

type LaborResp = {
  ok: boolean;
  as_of: string | null;
  refreshed_at?: string;
  window?: string;
  location?: { id: string; name: string };
  kpis: ApiKpi[];
  series?: Record<string, number[]>;
  error?: string;
};

export type OpsDriver = {
  id: string;
  domain: "labor" | "inventory";
  severity: Severity;
  title: string;
  why: string;
  recommendation: string;
  kpi_code?: string;
  metric?: { value?: number | null; delta?: number | null; unit?: string };
  score?: number; // internal ranking
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
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

// pct can be 0..1 or 0..100; normalize to 0..100
function pct100(v: number | null): number | null {
  if (v === null) return null;
  return v > 1 ? v : v * 100;
}

function sevByThreshold(valuePct: number | null, warnAt: number, riskAt: number, higherIsWorse = true): Severity {
  if (valuePct === null) return "good";
  const v = valuePct;

  if (higherIsWorse) {
    if (v >= riskAt) return "risk";
    if (v >= warnAt) return "warn";
    return "good";
  } else {
    // lower is worse
    if (v <= riskAt) return "risk";
    if (v <= warnAt) return "warn";
    return "good";
  }
}

function scoreFrom(sev: Severity, deltaAbs?: number | null) {
  const base = sev === "risk" ? 100 : sev === "warn" ? 60 : 20;
  const bump = deltaAbs ? Math.min(30, Math.abs(deltaAbs) * 2) : 0;
  return base + bump;
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
    const laborRes = await fetch(`${origin}/api/restaurant/labor?${sp.toString()}`, { cache: "no-store" });
    const laborJson = (await safeJson(laborRes, "Labor API")) as LaborResp;

    const kpis = laborJson?.kpis ?? [];
    const by = new Map<string, ApiKpi>(kpis.map((k) => [k.code, k]));

    const drivers: OpsDriver[] = [];

    // --- LABOR_PCT ---
    {
      const k = by.get("LABOR_PCT");
      const v = pct100(toNum(k?.value));
      const d = toNum(k?.delta);
      const sev = sevByThreshold(v, 29, 32, true);
      if (v !== null || d !== null) {
        drivers.push({
          id: "drv_labor_pct",
          domain: "labor",
          severity: sev,
          title: "Labor % vs sales",
          why:
            v === null
              ? "Labor % is unavailable for this window."
              : `Labor is ${v.toFixed(1)}% of sales. When this rises, profit gets compressed quickly.`,
          recommendation:
            sev === "risk"
              ? "Cut low-traffic coverage blocks today (next 24–48h). Align staffing to hourly demand; reduce overlap."
              : sev === "warn"
              ? "Review schedule adherence + slow-hour staffing. Shift hours into peaks; watch breaks."
              : "Maintain schedule discipline; keep staffing aligned to forecast.",
          kpi_code: "LABOR_PCT",
          metric: { value: v, delta: d, unit: "pct" },
          score: scoreFrom(sev, d),
        });
      }
    }

    // --- OVERTIME_PCT ---
    {
      const k = by.get("OVERTIME_PCT");
      const v = pct100(toNum(k?.value));
      const d = toNum(k?.delta);
      const sev = sevByThreshold(v, 5, 8, true);
      if (v !== null || d !== null) {
        drivers.push({
          id: "drv_overtime",
          domain: "labor",
          severity: sev,
          title: "Overtime pressure",
          why: v === null ? "Overtime % is unavailable for this window." : `Overtime is ${v.toFixed(1)}%.`,
          recommendation:
            sev === "risk"
              ? "Stop overtime approvals temporarily; rebalance shifts across part-timers and reduce open/close overlap."
              : sev === "warn"
              ? "Check coverage gaps and shift swaps; tighten approvals and reallocate hours."
              : "Keep overtime controlled; monitor daily exceptions.",
          kpi_code: "OVERTIME_PCT",
          metric: { value: v, delta: d, unit: "pct" },
          score: scoreFrom(sev, d),
        });
      }
    }

    // --- SPLH (sales per labor hour) lower is worse ---
    {
      const k = by.get("SPLH");
      const v = toNum(k?.value);
      const d = toNum(k?.delta);
      // thresholds are heuristic; tune later once you have baselines
      const sev = v === null ? "good" : v <= 45 ? "risk" : v <= 55 ? "warn" : "good";
      if (v !== null || d !== null) {
        drivers.push({
          id: "drv_splh",
          domain: "labor",
          severity: sev,
          title: "Productivity (Sales / Labor Hour)",
          why: v === null ? "SPLH is unavailable for this window." : `SPLH is ${v.toFixed(1)}.`,
          recommendation:
            sev === "risk"
              ? "Reduce labor hours during slow periods, cross-train roles, and tighten station coverage."
              : sev === "warn"
              ? "Trim low-impact hours and re-balance staffing into peak demand."
              : "Keep productivity stable; preserve peak staffing quality.",
          kpi_code: "SPLH",
          metric: { value: v, delta: d, unit: "usd" },
          score: scoreFrom(sev, d),
        });
      }
    }

    // --- AVG_LABOR_RATE (hourly wage) ---
    {
      const k = by.get("AVG_LABOR_RATE");
      const v = toNum(k?.value);
      const d = toNum(k?.delta);
      const sev = v === null ? "good" : v >= 28 ? "warn" : "good"; // tune later
      if (v !== null || d !== null) {
        drivers.push({
          id: "drv_rate",
          domain: "labor",
          severity: sev,
          title: "Average labor rate",
          why: v === null ? "Avg labor rate is unavailable." : `Avg labor rate is ${v.toFixed(2)}.`,
          recommendation:
            sev === "warn"
              ? "Check staffing mix (more senior coverage than required). Shift some hours to lower-cost roles where safe."
              : "Maintain staffing mix; watch wage drift.",
          kpi_code: "AVG_LABOR_RATE",
          metric: { value: v, delta: d, unit: "usd" },
          score: scoreFrom(sev, d),
        });
      }
    }

    // --- LABOR_HOURS ---
    {
      const k = by.get("LABOR_HOURS");
      const v = toNum(k?.value);
      const d = toNum(k?.delta);
      const sev = v === null ? "good" : d !== null && d >= 10 ? "warn" : "good"; // heuristic
      if (v !== null || d !== null) {
        drivers.push({
          id: "drv_hours",
          domain: "labor",
          severity: sev,
          title: "Labor hours volume",
          why: v === null ? "Labor hours is unavailable." : `Labor hours: ${v.toFixed(1)}.`,
          recommendation:
            sev === "warn"
              ? "Confirm demand justification: were there events, staffing gaps, or schedule drift?"
              : "Keep hours aligned to sales volume.",
          kpi_code: "LABOR_HOURS",
          metric: { value: v, delta: d, unit: "hours" },
          score: scoreFrom(sev, d),
        });
      }
    }

    // Rank + trim to top items
    drivers.sort((a, b) => (b.score ?? 0) - (a.score ?? 0));
    const top = drivers.slice(0, 8);

    return NextResponse.json(
      {
        ok: true,
        as_of: laborJson?.as_of ?? asOf ?? null,
        window: windowCode,
        location_id: locationId ?? null,
        drivers: top,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, drivers: [], error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}