import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user) {
      return NextResponse.json(
        { ok: false, user: null },
        {
          status: 401,
          headers: { "Cache-Control": "no-store" },
        }
      );
    }

    const display_name =
      user.full_name ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      user.email;

    // Fetch active tenant/workspace
    const tenantRes = await pool.query(
      `
      select
        tu.tenant_id,
        t.tenant_name
      from app.tenant_user tu
      join app.tenant t
        on t.tenant_id = tu.tenant_id
      where tu.user_id = $1
      order by tu.created_at desc
      limit 1
      `,
      [user.user_id]
    );

    const tenantRow = tenantRes.rows?.[0] ?? null;

    return NextResponse.json(
      {
        ok: true,
        user: {
          user_id: user.user_id,
          email: user.email,
          full_name: user.full_name,
          first_name: user.first_name,
          last_name: user.last_name,
          contact: user.contact,
          onboarding_status: user.onboarding_status,
          display_name,
          tenant_id: tenantRow?.tenant_id ?? null,
          tenant_name: tenantRow?.tenant_name ?? null,
        },
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        user: null,
        error: e?.message ?? "Internal server error",
      },
      {
        status: 500,
        headers: { "Cache-Control": "no-store" },
      }
    );
  }
}