// app/api/auth/signup/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { normalizeEmail, hashPassword, createSession, setSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function cleanText(v: any) {
  const t = String(v ?? "").trim();
  return t.length ? t : null;
}

function buildFullName(first: string | null, last: string | null) {
  const fn = (first ?? "").trim();
  const ln = (last ?? "").trim();
  const full = `${fn} ${ln}`.trim();
  return full.length ? full : null;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const first_name = cleanText(body.first_name);
    const last_name = cleanText(body.last_name);
    const contact = cleanText(body.contact);

    const email = normalizeEmail(String(body.email ?? ""));
    const password = String(body.password ?? "");

    if (!email) return NextResponse.json({ ok: false, error: "Email is required" }, { status: 400 });
    if (!password || password.length < 8)
      return NextResponse.json({ ok: false, error: "Password must be at least 8 characters" }, { status: 400 });

    const full_name = buildFullName(first_name, last_name);
    const password_hash = await hashPassword(password);

    // Ensure email not already used
    const exists = await pool.query(
      `select 1 from auth.app_user where email = $1::text limit 1`,
      [email]
    );
    if (exists.rowCount)
      return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 409 });

    // Create user
    const u = await pool.query(
      `
      insert into auth.app_user
        (email, password_hash, full_name, first_name, last_name, contact, onboarding_status)
      values
        ($1::text, $2::text, $3::text, $4::text, $5::text, $6::text, 'pending')
      returning user_id, onboarding_status
      `,
      [email, password_hash, full_name, first_name, last_name, contact]
    );

    const user_id = String(u.rows?.[0]?.user_id);

    // Create session + cookie
    const session = await createSession(user_id);
    await setSessionCookie(session.session_id, session.expires_at);

    return NextResponse.json(
      { ok: true, redirect: "/onboarding" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}