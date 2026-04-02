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
  try {
    const body = await req.json();
    const email = normalizeEmail(body.email ?? "");
    const password = String(body.password ?? "");
    const next = String(body.next ?? "/post-login");

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required." },
        { status: 400 }
      );
    }

    const userRes = await pool.query(
      `
      select user_id, email, password_hash
      from auth.app_user
      where lower(email) = $1
      limit 1
      `,
      [email]
    );

    const user = userRes.rows?.[0];
    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const valid = await verifyPassword(password, user.password_hash);
    if (!valid) {
      return NextResponse.json(
        { ok: false, error: "Invalid email or password." },
        { status: 401 }
      );
    }

    const session = await createSession(user.user_id);

    const res = NextResponse.json(
      {
        ok: true,
        redirect: next || "/post-login",
      },
      { status: 200 }
    );

    return attachSessionCookie(res, session.session_id, session.expires_at);
  } catch (err: any) {
    console.error("signin route error", err);

    return NextResponse.json(
      {
        ok: false,
        error: err?.message ?? "signin failed",
        code: err?.code ?? null,
        detail: err?.detail ?? null,
      },
      { status: 500 }
    );
  }
}