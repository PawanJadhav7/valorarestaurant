// frontend/app/api/dashboard/ml-insights/route.ts
import { NextRequest, NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

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
    const limit      = Math.min(parseInt(searchParams.get("limit") ?? "10"), 50);

    if (!day) {
      return NextResponse.json(
        { error: "Missing required query param: day" },
        { status: 400 }
      );
    }

    // Resolve tenant
    const tenantRes = await pool.query(
      `SELECT tenant_id FROM app.v_user_current_tenant
       WHERE user_id = $1::uuid LIMIT 1`,
      [user.user_id]
    );
    const tenantId = tenantRes.rows[0]?.tenant_id ?? null;
    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not resolved" }, { status: 403 });
    }

    // ── Fetch risks from ml.location_risk_daily ──────────────
    const risksRes = await pool.query(
      `
      SELECT
        r.day,
        r.tenant_id,
        r.location_id,
        dl.location_name,
        r.risk_type,
        r.severity_score,
        r.severity_band,
        r.impact_estimate
      FROM ml.location_risk_daily r
      JOIN restaurant.dim_location dl
        ON dl.location_id = r.location_id
       AND dl.tenant_id   = r.tenant_id
      WHERE r.tenant_id = $1::uuid
        AND r.day       = $2::date
        AND ($3::bigint IS NULL OR r.location_id = $3::bigint)
      ORDER BY r.severity_score DESC, r.impact_estimate DESC NULLS LAST
      LIMIT $4
      `,
      [tenantId, day, locationId ? parseInt(locationId) : null, limit]
    );

    // ── Fetch actions from ml.recommended_action_daily ───────
    const actionsRes = await pool.query(
      `
      SELECT
        a.as_of_date,
        a.tenant_id,
        a.location_id,
        dl.location_name,
        a.action_code,
        a.priority_rank,
        a.expected_roi,
        a.confidence_score,
        a.rationale_json
      FROM ml.recommended_action_daily a
      JOIN restaurant.dim_location dl
        ON dl.location_id = a.location_id
       AND dl.tenant_id   = a.tenant_id
      WHERE a.tenant_id  = $1::uuid
        AND a.as_of_date = $2::date
        AND ($3::bigint IS NULL OR a.location_id = $3::bigint)
      ORDER BY a.priority_rank ASC, a.expected_roi DESC NULLS LAST
      LIMIT $4
      `,
      [tenantId, day, locationId ? parseInt(locationId) : null, limit]
    );

    // ── Fetch insight brief from ml.insight_brief_daily ──────
    const briefRes = await pool.query(
      `
      SELECT
        i.as_of_date,
        i.tenant_id,
        i.location_id,
        dl.location_name,
        i.headline,
        i.summary_text,
        i.risk_summary_json,
        i.recommended_actions_json,
        i.model_name,
        i.model_version
      FROM ml.insight_brief_daily i
      JOIN restaurant.dim_location dl
        ON dl.location_id = i.location_id
       AND dl.tenant_id   = i.tenant_id
      WHERE i.tenant_id  = $1::uuid
        AND i.as_of_date = $2::date
        AND ($3::bigint IS NULL OR i.location_id = $3::bigint)
      ORDER BY i.as_of_date DESC
      LIMIT $4
      `,
      [tenantId, day, locationId ? parseInt(locationId) : null, limit]
    );

    // ── Fetch opportunities ───────────────────────────────────
    const oppsRes = await pool.query(
      `
      SELECT
        p.as_of_date,
        p.tenant_id,
        p.location_id,
        dl.location_name,
        p.opportunity_type,
        p.action_code,
        p.estimated_profit_uplift,
        p.uplift_horizon_days,
        p.confidence_score,
        p.driver_metrics_json,
        p.rationale_json
      FROM ml.profit_opportunity_daily p
      JOIN restaurant.dim_location dl
        ON dl.location_id = p.location_id
       AND dl.tenant_id   = p.tenant_id
      WHERE p.tenant_id  = $1::uuid
        AND p.as_of_date = $2::date
        AND ($3::bigint IS NULL OR p.location_id = $3::bigint)
      ORDER BY p.estimated_profit_uplift DESC NULLS LAST
      LIMIT $4
      `,
      [tenantId, day, locationId ? parseInt(locationId) : null, limit]
    );

    return NextResponse.json({
      ok:           true,
      tenant_id:    tenantId,
      day,
      risks:        risksRes.rows        ?? [],
      actions:      actionsRes.rows      ?? [],
      briefs:       briefRes.rows        ?? [],
      opportunities: oppsRes.rows        ?? [],
    });

  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message ?? "Failed to fetch ML insights" },
      { status: 500 }
    );
  }
}
