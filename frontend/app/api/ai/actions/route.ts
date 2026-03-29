import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL ||
  "http://127.0.0.1:8000";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.PGSSLMODE === "disable"
      ? undefined
      : { rejectUnauthorized: false },
  max: 5,
});

async function getCurrentTenantIdForUser(userId: string): Promise<string | null> {
  const res = await pool.query(
    `
    select tenant_id
    from app.v_user_current_tenant
    where user_id = $1::uuid
    limit 1
    `,
    [userId]
  );

  if (res.rowCount === 0) return null;
  return res.rows[0]?.tenant_id ?? null;
}

export async function GET(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantIdForUser(user.user_id);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
    }

    const locationId = req.nextUrl.searchParams.get("location_id");
    const status = req.nextUrl.searchParams.get("status");
    const asOfDate = req.nextUrl.searchParams.get("as_of_date");
    const limit = req.nextUrl.searchParams.get("limit") || "100";

    const params = new URLSearchParams({
      tenant_id: tenantId,
      limit,
    });

    if (locationId) params.set("location_id", locationId);
    if (status) params.set("status", status);
    if (asOfDate) params.set("as_of_date", asOfDate);

    const url = `${API_BASE}/api/ai/actions?${params.toString()}`;

    const res = await fetch(url, {
      method: "GET",
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch actions" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getSessionUser();

    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantIdForUser(user.user_id);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
    }

    const body = await req.json();

    const payload = {
      ...body,
      tenant_id: tenantId,
      created_by_user_id: body?.created_by_user_id ?? user.user_id,
      updated_by_user_id: body?.updated_by_user_id ?? user.user_id,
    };

    const res = await fetch(`${API_BASE}/api/ai/actions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: {
        "content-type": "application/json",
        "cache-control": "no-store",
      },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to create action" },
      { status: 500 }
    );
  }
}