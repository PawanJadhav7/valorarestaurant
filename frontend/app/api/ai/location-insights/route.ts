import { NextRequest, NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();
    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const day        = searchParams.get("day");
    const locationId = searchParams.get("location_id");

    const tenantRes = await pool.query(
      `SELECT tenant_id FROM app.v_user_current_tenant WHERE user_id = $1::uuid LIMIT 1`,
      [user.user_id]
    );
    const tenantId = tenantRes.rows[0]?.tenant_id ?? null;
    if (!tenantId) return NextResponse.json({ error: "Tenant not resolved" }, { status: 403 });

    // Get latest date if no day provided
    let resolvedDay = day;
    if (!resolvedDay) {
      const dateRes = await pool.query(`
        SELECT MAX(as_of_date)::text as latest
        FROM ml.insight_brief_daily
        WHERE tenant_id = $1::uuid
      `, [tenantId]);
      resolvedDay = dateRes.rows[0]?.latest ?? new Date().toISOString().split('T')[0];
    }

    // Fetch insights from briefs + actions
    const res = await pool.query(`
      SELECT
        i.location_id,
        dl.location_name,
        i.headline,
        i.summary_text,
        i.recommended_actions_json->>'recommendation' as recommendation,
        r.risk_type,
        r.impact_estimate,
        r.severity_band
      FROM ml.insight_brief_daily i
      JOIN restaurant.dim_location dl
        ON dl.location_id = i.location_id
        AND dl.tenant_id = i.tenant_id
      LEFT JOIN ml.location_risk_daily r
        ON r.tenant_id = i.tenant_id
        AND r.location_id = i.location_id
        AND r.day = i.as_of_date
      WHERE i.tenant_id = $1::uuid
        AND i.as_of_date = $2::date
        AND ($3::bigint IS NULL OR i.location_id = $3::bigint)
      ORDER BY r.impact_estimate DESC NULLS LAST
      LIMIT 20
    `, [tenantId, resolvedDay, locationId ? parseInt(locationId) : null]);

    return NextResponse.json({ ok: true, items: res.rows, insights: res.rows });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }
}
