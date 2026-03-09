import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(v: any, max = 120): string {
  if (typeof v !== "string") return "";
  const s = v.trim();
  if (!s) return "";
  return s.length > max ? s.slice(0, max) : s;
}

type LocationInput = {
  location_name: string;
  region?: string;
  country_code?: string;
  currency_code?: string;
};

function cleanLocations(arr: any): LocationInput[] {
  if (!Array.isArray(arr)) return [];

  const cleaned = arr
    .map((x) => ({
      location_name: cleanText(x?.location_name, 140),
      region: cleanText(x?.region, 80),
      country_code: cleanText(x?.country_code, 2).toUpperCase(),
      currency_code: cleanText(x?.currency_code, 3).toUpperCase(),
    }))
    .filter((x) => x.location_name);

  const seen = new Set<string>();
  const uniq: LocationInput[] = [];

  for (const loc of cleaned) {
    const key = `${loc.location_name}|${loc.region}|${loc.country_code}|${loc.currency_code}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniq.push(loc);
  }

  return uniq;
}

export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  try {
    const existing = await pool.query(
      `
      select tu.tenant_id
      from app.tenant_user tu
      where tu.user_id = $1::uuid
      order by tu.created_at asc
      limit 1
      `,
      [user.user_id]
    );

    return NextResponse.json({
      ok: true,
      has_tenant: (existing.rowCount ?? 0) > 0,
      tenant_id: existing.rows?.[0]?.tenant_id ?? null,
    });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Failed to load tenant onboarding context" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json().catch(() => null);

  const tenant_name = cleanText(body?.tenant_name, 140);
  const locations = cleanLocations(body?.locations);

  if (!tenant_name) {
    return NextResponse.json({ ok: false, error: "tenant_name is required" }, { status: 400 });
  }

  if (locations.length === 0) {
    return NextResponse.json(
      { ok: false, error: "At least one location is required" },
      { status: 400 }
    );
  }

  for (const loc of locations) {
    if (!loc.country_code) {
      return NextResponse.json(
        { ok: false, error: `country_code is required for "${loc.location_name}"` },
        { status: 400 }
      );
    }
    if (!loc.currency_code) {
      return NextResponse.json(
        { ok: false, error: `currency_code is required for "${loc.location_name}"` },
        { status: 400 }
      );
    }
  }

  const existing = await pool.query(
    `
    select tenant_id
    from app.tenant_user
    where user_id = $1::uuid
    order by created_at asc
    limit 1
    `,
    [user.user_id]
  );

  const hasTenant = (existing.rowCount ?? 0) > 0;
  const existingTenantId = existing.rows?.[0]?.tenant_id ?? null;

  if (hasTenant && existingTenantId) {
    return NextResponse.json({
      ok: true,
      tenant_id: existingTenantId,
      redirect: "/restaurant",
    });
  }

  const client = await pool.connect();

  try {
    await client.query("begin");

    // 1) Create tenant
    const tenantRes = await client.query(
      `
      insert into app.tenant (tenant_name)
      values ($1)
      returning tenant_id
      `,
      [tenant_name]
    );

    const tenant_id = String(tenantRes.rows?.[0]?.tenant_id ?? "");
    if (!tenant_id) throw new Error("Failed to create tenant");

    // 2) Link user as owner
    await client.query(
      `
      insert into app.tenant_user (tenant_id, user_id, role)
      values ($1::uuid, $2::uuid, 'owner')
      on conflict do nothing
      `,
      [tenant_id, user.user_id]
    );

    // 3) Create tenant-owned dim_location rows
    const createdLocationIds: number[] = [];

    for (const loc of locations) {
      const baseCode = loc.location_name
        .toUpperCase()
        .replace(/[^A-Z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 40) || "LOCATION";

      const uniqueCode = `${baseCode}_${tenant_id.slice(0, 8).toUpperCase()}`;

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
          created_at
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
          now()
        )
        returning location_id
        `,
        [
          tenant_id,
          uniqueCode,
          loc.location_name,
          loc.region || null,
          loc.country_code,
          loc.currency_code,
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

    // 4) Link tenant to created locations
    await client.query(
      `
      insert into app.tenant_location (tenant_id, location_id, is_active)
      select $1::uuid, x, true
      from unnest($2::bigint[]) as x
      on conflict (tenant_id, location_id) do nothing
      `,
      [tenant_id, createdLocationIds]
    );

    // 5) Safety check
    const chk = await client.query(
      `
      select count(*)::int as c
      from app.tenant_location
      where tenant_id = $1::uuid
        and is_active = true
      `,
      [tenant_id]
    );

    if ((chk.rows?.[0]?.c ?? 0) <= 0) {
      throw new Error("No locations assigned after tenant creation");
    }

    // 6) Mark onboarding status
    await client.query(
      `
      update auth.app_user
      set onboarding_status = 'tenant_done'
      where user_id = $1::uuid
      `,
      [user.user_id]
    );

    await client.query("commit");

    return NextResponse.json({
      ok: true,
      tenant_id,
      redirect: "/restaurant",
    });
  } catch (e: any) {
    await client.query("rollback");
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Tenant onboarding failed" },
      { status: 500 }
    );
  } finally {
    client.release();
  }
}