// app/api/restaurant/sales/aov-histogram/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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

function toNum(v: string | null): number | null {
  if (v === null || v === undefined) return null;
  const x = Number(v);
  return Number.isFinite(x) ? x : null;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const rawLoc = url.searchParams.get("location_id");
    const locationId =
    rawLoc && rawLoc !== "all" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(rawLoc)
    ? rawLoc
    : null;

    const bucketSize = toNum(url.searchParams.get("bucket_size")) ?? 10;
    const maxValue = toNum(url.searchParams.get("max_value")) ?? 200;

    const params = asOf
      ? [asOf, windowCode, locationId, bucketSize, maxValue]
      : [windowCode, locationId, bucketSize, maxValue];

    const sql = asOf
      ? `SELECT * FROM analytics.get_sales_aov_histogram($1::timestamptz,$2::text,$3::uuid,$4::numeric,$5::numeric);`
      : `SELECT * FROM analytics.get_sales_aov_histogram(now(),$1::text,$2::uuid,$3::numeric,$4::numeric);`;

    const res = await pool.query(sql, params);

    return NextResponse.json(
      {
        ok: true,
        as_of: asOf ?? null,
        window: windowCode,
        location_id: locationId ?? null,
        bucket_size: bucketSize,
        max_value: maxValue,
        buckets: res.rows ?? [],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}