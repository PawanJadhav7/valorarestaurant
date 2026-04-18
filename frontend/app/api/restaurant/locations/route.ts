//frontend/app/api/restaurant/locations/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const client = await pool.connect();

  async function bail(status: number, payload: any) {
    try { await client.query("rollback"); } catch {}
    return NextResponse.json(payload, { status });
  }

  try {
    await client.query("begin");

    // 1) Resolve ALL tenants for this user
    const tenantRes = await client.query(
      `SELECT COALESCE(uc.tenant_id, tu.tenant_id)::text as tenant_id
       FROM app.tenant_user tu
       LEFT JOIN app.user_context uc ON uc.user_id = tu.user_id
       WHERE tu.user_id = $1::uuid
       ORDER BY CASE WHEN uc.tenant_id IS NOT NULL THEN 0 ELSE 1 END, tu.created_at ASC
       LIMIT 1`,
      [user.user_id]
    );
    const activeTenantId = tenantRes.rows[0]?.tenant_id ?? null;
    if (!activeTenantId) {
      return await bail(403, { ok: false, error: "User not linked to a tenant yet" });
    }
    const allTenantRes = await client.query(
      `SELECT tenant_id FROM app.tenant_user WHERE user_id = $1::uuid`,
      [user.user_id]
    );
    const tenantIds: string[] = allTenantRes.rows.map((r: any) => r.tenant_id);
    const tenantId = activeTenantId;
    await client.query(`SELECT set_config('app.tenant_id', $1, true)`, [tenantIds.join(',')]);

    // 2) Effective allowed locations across ALL tenants
    const r = await client.query(
      `
      WITH tenant_allowed AS (
        SELECT tl.location_id
        FROM app.tenant_location tl
        WHERE tl.tenant_id = ANY($1::uuid[])
          AND tl.is_active = true
      ),
      user_allowed AS (
        SELECT ul.location_id
        FROM app.user_location ul
        WHERE ul.tenant_id = $3::uuid
          AND ul.user_id = $2::uuid
          AND ul.is_active = true
      ),
      effective AS (
        SELECT location_id FROM user_allowed
        UNION ALL
        SELECT ta.location_id
        FROM tenant_allowed ta
        WHERE NOT EXISTS (SELECT 1 FROM user_allowed)
      )
      SELECT DISTINCT
        dl.location_id,
        dl.location_code,
        dl.location_name,
        dl.city,
        dl.region,
        dl.country_code,
        dl.currency_code,
        dl.latitude,
        dl.longitude,
        dl.address_line,
        dl.business_name
      FROM effective e
      JOIN restaurant.dim_location dl ON dl.location_id = e.location_id
      WHERE dl.is_active = true
        AND dl.tenant_id = ANY($1::uuid[])
      ORDER BY dl.location_name ASC
      `,
      [tenantIds, user.user_id, tenantId]
    );

    await client.query("commit");

    return NextResponse.json(
      { ok: true, locations: r.rows ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    try { await client.query("rollback"); } catch {}
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}

export async function PATCH(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const { location_id, business_name, address_line } = body;

  if (!location_id) {
    return NextResponse.json({ ok: false, error: "location_id required" }, { status: 400 });
  }

  const client = await pool.connect();
  try {
    const tenantRes = await client.query(
      `SELECT tenant_id FROM app.tenant_user
       WHERE user_id = $1::uuid ORDER BY created_at ASC`,
      [user.user_id]
    );
    const tenantIds: string[] = tenantRes.rows.map((r: any) => r.tenant_id);
    if (!tenantIds.length) return NextResponse.json({ ok: false, error: "No tenant" }, { status: 403 });

    await client.query(
      `UPDATE restaurant.dim_location
       SET business_name = COALESCE($1::text, business_name),
           address_line  = COALESCE($2::text, address_line)
       WHERE location_id = $3::bigint
         AND tenant_id = ANY($4::uuid[])`,
      [business_name || null, address_line || null, location_id, tenantIds]
    );

    return NextResponse.json({ ok: true, message: "Location updated successfully." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  } finally {
    client.release();
  }
}