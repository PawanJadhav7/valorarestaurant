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

    // Get latest brief as executive summary
    const res = await pool.query(`
      SELECT
        i.headline,
        i.summary_text,
        i.as_of_date,
        dl.location_name
      FROM ml.insight_brief_daily i
      JOIN restaurant.dim_location dl
        ON dl.location_id = i.location_id
        AND dl.tenant_id = i.tenant_id
      WHERE i.tenant_id = $1::uuid
        AND ($2::bigint IS NULL OR i.location_id = $2::bigint)
        AND ($3::date IS NULL OR i.as_of_date <= $3::date)
      ORDER BY i.as_of_date DESC
      LIMIT 1
    `, [tenantId, locationId ? parseInt(locationId) : null, day || null]);

    const brief = res.rows[0];
    const summary = brief
      ? `${brief.location_name} — ${brief.headline}. ${brief.summary_text}`
      : null;

    return NextResponse.json({ ok: true, summary, executive_summary: summary });

  } catch (error: any) {
    return NextResponse.json({ error: error?.message ?? "Failed" }, { status: 500 });
  }
}
