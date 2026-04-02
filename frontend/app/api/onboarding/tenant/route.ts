//frontend/app/api/onboarding/tenant/route.ts
import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const client = await pool.connect();

  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json().catch(() => null);

    const tenant_name = String(body?.tenant_name ?? "").trim();
    const locations = Array.isArray(body?.locations) ? body.locations : [];

    if (!tenant_name) {
      return NextResponse.json(
        { ok: false, error: "Tenant name required" },
        { status: 400 }
      );
    }

    if (!locations.length) {
      return NextResponse.json(
        { ok: false, error: "At least one location required" },
        { status: 400 }
      );
    }

    for (const loc of locations) {
      if (!String(loc?.location_name ?? "").trim()) {
        return NextResponse.json(
          { ok: false, error: "Location name required" },
          { status: 400 }
        );
      }
    }

    const existing = await client.query(
      `
      select tenant_id
      from app.tenant_user
      where user_id = $1::uuid
      limit 1
      `,
      [user.user_id]
    );

    if ((existing.rowCount ?? 0) > 0 && existing.rows[0]?.tenant_id) {
      return NextResponse.json({
        ok: true,
        tenant_id: existing.rows[0].tenant_id,
        redirect: "/subscription",
      });
    }

    await client.query("BEGIN");

    const tenantRes = await client.query(
      `
      insert into app.tenant (tenant_name, created_at)
      values ($1, now())
      returning tenant_id
      `,
      [tenant_name]
    );

    const tenant_id = tenantRes.rows[0].tenant_id;

    await client.query(
      `
      insert into app.tenant_user (tenant_id, user_id, role, created_at)
      values ($1::uuid, $2::uuid, 'owner', now())
      `,
      [tenant_id, user.user_id]
    );

    const createdLocationIds: number[] = [];

    for (const loc of locations) {
      const baseCode =
        String(loc.location_name ?? "")
          .toUpperCase()
          .replace(/[^A-Z0-9]+/g, "_")
          .replace(/^_+|_+$/g, "")
          .slice(0, 40) || "LOCATION";

      const uniqueCode = `${baseCode}_${String(tenant_id).slice(0, 8).toUpperCase()}`;

      const locRes = await client.query(
        `
        insert into restaurant.dim_location (
          tenant_id,
          entity_id,
          location_code,
          location_name,
          region,
          country_code,
          currency_code,
          is_active,
          created_at,
          primary_pos_provider,
          external_location_id
        )
        values (
          $1::uuid,
          1,
          $2,
          $3,
          $4,
          $5,
          $6,
          true,
          now(),
          $7,
          null
        )
        returning location_id
        `,
        [
          tenant_id,
          uniqueCode,
          String(loc.location_name ?? "").trim(),
          String(loc.region ?? "").trim() || null,
          String(loc.country_code ?? "US").trim().toUpperCase() || "US",
          String(loc.currency_code ?? "USD").trim().toUpperCase() || "USD",
          "csv",
        ]
      );

      const locationId = Number(locRes.rows?.[0]?.location_id);
      if (!Number.isFinite(locationId)) {
        throw new Error(`Failed to create location: ${loc.location_name}`);
      }

      createdLocationIds.push(locationId);
    }

    if (createdLocationIds.length === 0) {
      throw new Error("No locations were created");
    }

    await client.query(
      `
      insert into app.tenant_location (tenant_id, location_id, is_active)
      select $1::uuid, x, true
      from unnest($2::bigint[]) as x
      on conflict (tenant_id, location_id) do nothing
      `,
      [tenant_id, createdLocationIds]
    );

    await client.query(
      `
      update auth.app_user
      set onboarding_status = 'tenant_done'
      where user_id = $1::uuid
      `,
      [user.user_id]
    );

    await client.query("COMMIT");

    return NextResponse.json({
      ok: true,
      tenant_id,
      redirect: "/subscription",
    });
  } catch (e: any) {
    try {
      await client.query("ROLLBACK");
    } catch {}
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Tenant creation failed" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}