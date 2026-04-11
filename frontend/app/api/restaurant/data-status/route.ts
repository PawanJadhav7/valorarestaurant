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

    const bronze = await client.query(`
      SELECT count(*)::bigint AS total_events,
             count(*) FILTER (WHERE status = 'processed')::bigint AS processed,
             count(*) FILTER (WHERE status = 'failed')::bigint AS failed
      FROM restaurant.pos_raw_event
    `);

    const ml = await client.query(`
      SELECT
        (SELECT count(*)::bigint FROM ml.location_risk_daily)      AS total_risks,
        (SELECT count(*)::bigint FROM ml.insight_brief_daily)      AS total_briefs,
        (SELECT count(*)::bigint FROM ml.recommended_action_daily) AS total_actions,
        (SELECT count(*)::bigint FROM ml.profit_opportunity_daily) AS total_opportunities
    `);

    const base = latest.rows[0] ?? {};
    const r24  = rows24h.rows[0] ?? {};
    const b    = bronze.rows[0] ?? {};
    const m    = ml.rows[0] ?? {};

    return NextResponse.json({
      ok:               true,
      now:              now.toISOString(),
      latest_day:       base.latest_day,
      last_ingested_at: base.last_ingested_at,
      total_rows:       String(base.total_rows ?? 0),
      locations:        String(base.locations ?? 0),
      rows_24h:         String(r24.rows_24h ?? 0),
      bronze: {
        total_events: String(b.total_events ?? 0),
        processed:    String(b.processed ?? 0),
        failed:       String(b.failed ?? 0),
      },
      ml: {
        total_risks:         String(m.total_risks ?? 0),
        total_briefs:        String(m.total_briefs ?? 0),
        total_actions:       String(m.total_actions ?? 0),
        total_opportunities: String(m.total_opportunities ?? 0),
      },
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    client.release();
  }
}