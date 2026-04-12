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
    try {
      await client.query("rollback");
    } catch {}
    return NextResponse.json(payload, { status });
  }

  try {
    await client.query("begin");

    // 1) Resolve tenant for this user
    const tenantRes = await client.query(
      `
      select tenant_id
      from app.tenant_user
      where user_id = $1::uuid
      order by created_at asc
      limit 1
      `,
      [user.user_id]
    );

    const tenantId: string | null = tenantRes.rows?.[0]?.tenant_id ?? null;

    if (!tenantId) {
      return await bail(403, { ok: false, error: "User not linked to a tenant yet" });
    }

    // 2) Set tenant context for RLS
    await client.query(`select set_config('app.tenant_id', $1, true)`, [tenantId]);

    // 3) Effective allowed locations
    const r = await client.query(
      `
      with tenant_allowed as (
        select tl.location_id
        from app.tenant_location tl
        where tl.tenant_id = $1::uuid
          and tl.is_active = true
      ),
      user_allowed as (
        select ul.location_id
        from app.user_location ul
        where ul.tenant_id = $1::uuid
          and ul.user_id = $2::uuid
          and ul.is_active = true
      ),
      effective as (
        select location_id from user_allowed
        union all
        select ta.location_id
        from tenant_allowed ta
        where not exists (select 1 from user_allowed)
      )
      select distinct
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
      from effective e
      join restaurant.dim_location dl
        on dl.location_id = e.location_id
      where dl.is_active = true
        and dl.tenant_id = $1::uuid
      order by dl.location_code asc, dl.location_name asc
      `,
      [tenantId, user.user_id]
    );

    await client.query("commit");

    return NextResponse.json(
      { ok: true, locations: r.rows ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    try {
      await client.query("rollback");
    } catch {}

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
    // Verify tenant owns this location
    const tenantRes = await client.query(
      `SELECT tenant_id FROM app.tenant_user
       WHERE user_id = $1::uuid ORDER BY created_at ASC LIMIT 1`,
      [user.user_id]
    );
    const tenantId = tenantRes.rows[0]?.tenant_id;
    if (!tenantId) return NextResponse.json({ ok: false, error: "No tenant" }, { status: 403 });

    await client.query(
      `UPDATE restaurant.dim_location
       SET business_name = COALESCE($1::text, business_name),
           address_line  = COALESCE($2::text, address_line)
       WHERE location_id = $3::bigint
         AND tenant_id   = $4::uuid`,
      [business_name || null, address_line || null, location_id, tenantId]
    );

    return NextResponse.json({ ok: true, message: "Location updated successfully." });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  } finally {
    client.release();
  }
}