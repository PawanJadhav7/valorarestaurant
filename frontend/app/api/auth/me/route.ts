import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, user: null }, { status: 401 });
    const display_name =
      user.full_name ||
      [user.first_name, user.last_name].filter(Boolean).join(" ").trim() ||
      user.email;
    return NextResponse.json({
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
        tenant_id: user.tenant_id ?? null,
        tenant_name: user.client_name ?? null,
        has_tenant: user.has_tenant ?? false,
      },
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, user: null, error: e?.message }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const user = await getSessionUser();
    if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const full_name = body.full_name?.trim() ?? null;
    const contact = body.contact?.trim() ?? null;

    if (!full_name && !contact) {
      return NextResponse.json({ ok: false, error: "Nothing to update" }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        `UPDATE auth.app_user
         SET full_name = COALESCE($1::text, full_name),
             contact   = COALESCE($2::text, contact)
         WHERE user_id = $3::uuid`,
        [full_name || null, contact || null, user.user_id]
      );
      return NextResponse.json({ ok: true, message: "Profile updated successfully." });
    } finally {
      client.release();
    }
  } catch (e: any) {
    console.error("PATCH /api/auth/me error:", e);
    return NextResponse.json({ ok: false, error: e?.message }, { status: 500 });
  }
}
