import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseAsOf(sp: URLSearchParams) {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}

export async function GET(req: Request) {
  const refreshedAt = new Date().toISOString();

  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const locationId = url.searchParams.get("location_id");

    // ✅ TODO: Replace with real labor analytics tables/functions
    // For now return clean empty series + summary.
    return NextResponse.json(
      {
        ok: true,
        as_of: asOf ?? null,
        refreshed_at: refreshedAt,
        location: { id: locationId ?? "all", name: locationId ? String(locationId) : "All Locations" },
        summary: {
          labor_cost_ratio_pct: null,
          overtime_hours_14d: null,
          labor_hours_30d: null,
          sales_per_labor_hour: null,
        },
        series: {
          day: [] as string[],
          labor_hours: [] as number[],
          overtime_hours: [] as number[],
          labor_cost_ratio_pct: [] as number[],
        },
        notes: "Labor endpoint (MVP scaffold).",
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (err: any) {
    console.error("GET /api/restaurant/ops/labor failed:", err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}