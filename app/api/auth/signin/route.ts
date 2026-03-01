import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { normalizeEmail, verifyPassword, createSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    const r = await pool.query(
      `select user_id, password_hash, onboarding_status from auth.app_user where email = $1::text limit 1`,
      [email]
    );
    const row = r.rows?.[0];
    if (!row) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

    const ok = await verifyPassword(password, row.password_hash);
    if (!ok) return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });

    const session = await createSession(row.user_id);
    await setSessionCookie(session.session_id, session.expires_at);

    const redirect = row.onboarding_status === "complete" ? "/restaurant" : "/onboarding";
    return NextResponse.json({ ok: true, redirect }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}