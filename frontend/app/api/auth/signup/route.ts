import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import {
  normalizeEmail,
  hashPassword,
  createSession,
  attachSessionCookie,
} from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(v: any): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length ? t : null;
}

function buildFullName(first: string | null, last: string | null): string | null {
  const fn = (first ?? "").trim();
  const ln = (last ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full.length ? full : null;
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);

  const first_name = cleanText(body?.first_name);
  const last_name = cleanText(body?.last_name);
  const contact = cleanText(body?.contact);

  const email = normalizeEmail(String(body?.email ?? ""));
  const password = String(body?.password ?? "");

  if (!email) {
    return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
  }

  if (!password || password.length < 8) {
    return NextResponse.json(
      { ok: false, error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const full_name = buildFullName(first_name, last_name);
  const password_hash = await hashPassword(password);

  try {
    const exists = await pool.query(
      `select 1 from auth.app_user where email = $1::text limit 1`,
      [email]
    );

    if ((exists.rowCount ?? 0) > 0) {
      return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 409 });
    }

    const u = await pool.query(
      `
      insert into auth.app_user
        (email, password_hash, full_name, first_name, last_name, contact, onboarding_status)
      values
        ($1, $2, $3, $4, $5, $6, 'started')
      returning user_id
      `,
      [email, password_hash, full_name, first_name, last_name, contact]
    );

    const user_id = String(u.rows?.[0]?.user_id ?? "");
    if (!user_id) {
      return NextResponse.json({ ok: false, error: "Failed to create user" }, { status: 500 });
    }

    const { session_id, expires_at } = await createSession(user_id);

    const res = NextResponse.json(
      { ok: true, redirect: "/post-login" },
      { headers: { "Cache-Control": "no-store" } }
    );

    attachSessionCookie(res, session_id, expires_at);
    return res;
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "Signup failed" },
      { status: 500 }
    );
  }
}