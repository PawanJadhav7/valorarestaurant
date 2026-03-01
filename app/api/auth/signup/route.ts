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

    // Ensure email not already used
    const exists = await pool.query(`select 1 from auth.app_user where email = $1::text limit 1`, [email]);
    if (exists.rowCount)
      return NextResponse.json({ ok: false, error: "Email already in use" }, { status: 409 });

    const password_hash = await hashPassword(password);

    // tenant name: prefer full name; else email prefix
    const tenantName = (full_name ?? email.split("@")[0] ?? "Client").slice(0, 64);

    const client = await pool.connect();
    try {
      await client.query("begin");

      // 1) Create tenant
      const t = await client.query(
        `insert into public.tenant (name) values ($1::text) returning tenant_id, name`,
        [tenantName]
      );
      const tenant_id = String(t.rows?.[0]?.tenant_id);

      // 2) Create auth user (auth schema is source-of-truth for credentials)
      const u = await client.query(
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

      // 3) Mirror/link in public.app_user so we can join tenant + UI metadata
      // NOTE: assumes public.app_user exists with user_id, tenant_id, email, full_name (common in your DB)
      await client.query(
        `
        insert into public.app_user (user_id, tenant_id, email, full_name)
        values ($1::uuid, $2::uuid, $3::text, $4::text)
        on conflict (user_id) do update
          set tenant_id = excluded.tenant_id,
              email = excluded.email,
              full_name = excluded.full_name
        `,
        [user_id, tenant_id, email, full_name]
      );

      await client.query("commit");

      // 4) Session + cookie
      const session = await createSession(user_id);
      await setSessionCookie(session.session_id, session.expires_at);

      return NextResponse.json({ ok: true, redirect: "/onboarding" }, { headers: { "Cache-Control": "no-store" } });
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}