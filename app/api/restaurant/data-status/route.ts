import { NextResponse } from "next/server";
import pg from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

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

    const lastFile = await client.query(`
        with last as (
            select source_file
            from restaurant.raw_restaurant_daily
            where source_file is not null
            order by created_at desc
            limit 1
        )
        select
            max(last.source_file) as last_source_file,
            count(r.*)::bigint as rows_in_last_file,
            count(distinct r.location_id)::bigint as locations_in_last_file,
            min(r.day) as min_day_in_last_file,
            max(r.day) as max_day_in_last_file
        from last
        left join restaurant.raw_restaurant_daily r
            on r. source_file = last.source_file;
        `);

    const rows24h = await client.query(`
      select count(*)::bigint as rows_24h
      from restaurant.raw_restaurant_daily
      where created_at >= now() - interval '24 hours';
    `);

    const base = latest.rows[0] ?? {};
    const f = lastFile.rows[0] ?? {};
    const r24 = rows24h.rows[0] ?? {};

    return NextResponse.json({
      ok: true,
      now: now.toISOString(),
      latest_day: base.latest_day,
      last_ingested_at: base.last_ingested_at,
      total_rows: String(base.total_rows ?? 0),
      locations: String(base.locations ?? 0),
      rows_24h: String(r24.rows_24h ?? 0),
      last_source_file: f.last_source_file ?? null,
      rows_in_last_file: String(f.rows_in_last_file ?? 0),
      locations_in_last_file: String(f.locations_in_last_file ?? 0),
      min_day_in_last_file: f.min_day_in_last_file ?? null,
      max_day_in_last_file: f.max_day_in_last_file ?? null,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}