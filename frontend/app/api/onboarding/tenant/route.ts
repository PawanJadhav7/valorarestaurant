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

    if (!tenant_name) {
      return NextResponse.json(
        { ok: false, error: "Business name is required" },
        { status: 400 }
      );
    }

    // ── Idempotency: if tenant already exists redirect forward ──
    const existing = await client.query(
      `
      SELECT tu.tenant_id
      FROM app.tenant_user tu
      WHERE tu.user_id = $1::uuid
      LIMIT 1
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

    // 1. Create tenant
    const tenantRes = await client.query(
      `
      INSERT INTO app.tenant (tenant_name, created_at)
      VALUES ($1, now())
      RETURNING tenant_id
      `,
      [tenant_name]
    );

    const tenant_id = tenantRes.rows[0].tenant_id;

    // 2. Link user as owner
    await client.query(
      `
      INSERT INTO app.tenant_user (tenant_id, user_id, role, created_at)
      VALUES ($1::uuid, $2::uuid, 'owner', now())
      `,
      [tenant_id, user.user_id]
    );

    // 3. Mark onboarding status as tenant_done
    //    Locations will be created during POS onboarding step
    await client.query(
      `
      UPDATE auth.app_user
      SET onboarding_status = 'tenant_done'
      WHERE user_id = $1::uuid
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
