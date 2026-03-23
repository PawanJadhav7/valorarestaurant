import { NextRequest, NextResponse } from "next/server";
import { Pool } from "pg";
import { getSessionUser } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const API_BASE =
  process.env.NEXT_PUBLIC_VALORA_API_BASE_URL ||
  "https://valorarestaurant.onrender.com";

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

export async function GET() {
  try {
    const user = await getSessionUser();

    if (!user?.user_id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const tenantId = await getCurrentTenantIdForUser(user.user_id);

    if (!tenantId) {
      return NextResponse.json({ error: "Tenant not found" }, { status: 403 });
    }

    const url = `${API_BASE}/api/ai/latest-date?tenant_id=${tenantId}`;

    const res = await fetch(url, { cache: "no-store" });
    const text = await res.text();

    return new NextResponse(text, {
      status: res.status,
      headers: { "content-type": "application/json" },
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message ?? "Failed to fetch latest date" },
      { status: 500 }
    );
  }
}