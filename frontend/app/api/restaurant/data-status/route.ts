//frontend/app/api/restaurant/data-status/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const client = await pool.connect();
  try {
    const now = new Date();

    const latest = await client.query(`
      select
        max(day) as latest_day,
        max(created_at) as last_ingested_at,
        count(*)::bigint as total_rows,
        count(distinct location_id)::bigint as locations
      from restaurant.raw_restaurant_daily;
    `);

    const rows24h = await client.query(`
      select count(*)::bigint as rows_24h
      from restaurant.raw_restaurant_daily
      where created_at >= now() - interval '24 hours';
    `);

    const base = latest.rows[0] ?? {};
    const r24 = rows24h.rows[0] ?? {};

    return NextResponse.json({
      ok: true,
      now: now.toISOString(),
      latest_day: base.latest_day,
      last_ingested_at: base.last_ingested_at,
      total_rows: String(base.total_rows ?? 0),
      locations: String(base.locations ?? 0),
      rows_24h: String(r24.rows_24h ?? 0),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}