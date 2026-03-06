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
        dl.region,
        dl.country_code,
        dl.currency_code
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