import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  normalizeEmail,
  verifyPassword,
  createSession,
  attachSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");

  if (!email || !password) {
    return NextResponse.json(
      { ok: false, error: "Email and password are required" },
      { status: 400 }
    );
  }

  const r = await pool.query(
    `
    select user_id, password_hash
    from auth.app_user
    where email = $1
    limit 1
    `,
    [email]
  );

  const u = r.rows?.[0];
  if (!u) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const ok = await verifyPassword(password, String(u.password_hash));
  if (!ok) {
    return NextResponse.json({ ok: false, error: "Invalid credentials" }, { status: 401 });
  }

  const { session_id, expires_at } = await createSession(String(u.user_id));

  const res = NextResponse.json(
    { ok: true, redirect: "/onboarding" },
    { headers: { "Cache-Control": "no-store" } }
  );

  attachSessionCookie(res, session_id, expires_at);
  return res;
}