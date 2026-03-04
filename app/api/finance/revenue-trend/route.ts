//app/api/finance/revenuetrend/route.ts
import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";

export const runtime = "nodejs";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function intParam(v: string | null, fallback: number) {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.trunc(n) : fallback;
}

/**
 * GET /api/finance/revenue-trend?entityId=1&limit=24
 * Returns: { data: { day, entity_id, net_sales, net_sales_ma3 }[] }
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);

    const entityId = intParam(searchParams.get("entityId"), 1);
    const limit = intParam(searchParams.get("limit"), 24);

    const SQL = `
      SELECT
        day::date                         AS day,
        entity_id::bigint                 AS entity_id,
        net_sales::numeric(18,2)          AS net_sales,
        net_sales_ma3::numeric(18,2)      AS net_sales_ma3
      FROM mart.v_revenue_trend
      WHERE entity_id = $1
      ORDER BY day DESC
      LIMIT $2
    `;

    const { rows } = await pool.query(SQL, [entityId, limit]);

    // Send ascending for charts
    const data = rows
      .map((r) => ({
        day: String(r.day).slice(0, 10),
        entity_id: String(r.entity_id),
        net_sales: Number(r.net_sales ?? 0),
        net_sales_ma3: Number(r.net_sales_ma3 ?? 0),
      }))
      .reverse();

    return NextResponse.json(
      { probe: { entityId, limit }, data },
      { status: 200 }
    );
  } catch (err: any) {
    return NextResponse.json(
      {
        error: "Failed to load revenue trend",
        message: err?.message ?? String(err),
      },
      { status: 500 }
    );
  }
}