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
    const q = `
      select
        location_id as id,
        max(location_name) as name,
        count(*)::int as rows
      from restaurant.raw_restaurant_daily
      group by location_id
      order by name asc;
    `;

    const r = await client.query(q);

    return NextResponse.json({
      ok: true,
      locations: r.rows,
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}