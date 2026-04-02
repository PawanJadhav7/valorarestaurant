import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import type { NextResponse } from "next/server";

const SESSION_COOKIE = "valora_session";

export type SessionUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  first_name: string | null;
  last_name: string | null;
  contact: string | null;
  onboarding_status: string | null;
  client_name: string | null;
  tenant_id: string | null;
  has_tenant: boolean;
};

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase();
}

export async function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash);
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function createSession(userId: string) {
  const session_id = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

  await pool.query(
    `
    insert into app.user_session (session_id, user_id, expires_at)
    values ($1::uuid, $2::uuid, $3::timestamptz)
    `,
    [session_id, userId, expires_at.toISOString()]
  );

  return { session_id, expires_at: expires_at.toISOString() };
}

export function attachSessionCookie(
  res: NextResponse,
  sessionId: string,
  expiresAtIso: string
) {
  const expires = new Date(expiresAtIso);

  res.cookies.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });

  return res;
}

export function clearSessionCookieOnResponse(res: NextResponse) {
  res.cookies.set(SESSION_COOKIE, "", {
    path: "/",
    expires: new Date(0),
  });
  return res;
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(SESSION_COOKIE, "", {
    path: "/",
    expires: new Date(0),
  });
}

export async function getSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE)?.value ?? "";

  if (!sessionId) return null;

  const sessionRes = await pool.query(
    `
    select user_id, expires_at
    from app.user_session
    where session_id = $1::uuid
    limit 1
    `,
    [sessionId]
  );

  const sess = sessionRes.rows?.[0] ?? null;
  if (!sess) return null;

  const expiresAt = sess.expires_at ? new Date(sess.expires_at) : null;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    try {
      await pool.query(
        `delete from app.user_session where session_id = $1::uuid`,
        [sessionId]
      );
    } catch {}
    await clearSessionCookie();
    return null;
  }

  const userId = String(sess.user_id);

  const userRes = await pool.query(
    `
    select
      u.user_id,
      u.email,
      u.full_name,
      u.first_name,
      u.last_name,
      u.contact,
      u.onboarding_status,
      tu.tenant_id,
      t.tenant_name as client_name
    from app.app_user u
    left join lateral (
      select tenant_id
      from app.tenant_user
      where user_id = u.user_id
      order by created_at desc
      limit 1
    ) tu on true
    left join app.tenant t
      on t.tenant_id = tu.tenant_id
    where u.user_id = $1::uuid
    limit 1
    `,
    [userId]
  );

  const row = userRes.rows?.[0] ?? null;
  if (!row) {
    try {
      await pool.query(
        `delete from app.user_session where session_id = $1::uuid`,
        [sessionId]
      );
    } catch {}
    await clearSessionCookie();
    return null;
  }

  const tenantId = row.tenant_id ? String(row.tenant_id) : null;

  return {
    user_id: String(row.user_id),
    email: String(row.email),
    full_name: row.full_name ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    contact: row.contact ?? null,
    onboarding_status: row.onboarding_status ?? null,
    client_name: row.client_name ?? null,
    tenant_id: tenantId,
    has_tenant: Boolean(tenantId),
  };
}