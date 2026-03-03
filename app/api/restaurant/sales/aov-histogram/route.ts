//app/api/restaurant/sales/aov-histogram/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseWindow(sp: URLSearchParams): string {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  return ["7d", "30d", "90d", "ytd"].includes(w) ? w : "30d";
}
function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  const t = raw.trim();
  return t.length ? t : null;
}
function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}
function toNum(v: any): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    const bucketSize = toNum(url.searchParams.get("bucket_size") ?? 10);
    const maxValue = toNum(url.searchParams.get("max_value") ?? 200);

    const params = asOf
      ? [asOf, windowCode, locationId, bucketSize, maxValue]
      : [windowCode, locationId, bucketSize, maxValue];

    const sql = asOf
      ? `select * from analytics.get_sales_aov_histogram_daily($1::timestamptz,$2::text,$3::int,$4::numeric,$5::numeric);`
      : `select * from analytics.get_sales_aov_histogram_daily(now(),$1::text,$2::int,$3::numeric,$4::numeric);`;

    const res = await pool.query(sql, params);

    return NextResponse.json({
      ok: true,
      buckets: (res.rows ?? []).map((r: any) => ({
        bucket_from: Number(r.bucket_from),
        bucket_to: Number(r.bucket_to),
        orders: Number(r.orders),
        share_pct: Number(r.share_pct),
      })),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}