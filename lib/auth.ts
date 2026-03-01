// lib/auth.ts
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "valora_session";

export type SessionUser = {
  user_id: string;
  email: string;
  full_name: string | null;
  onboarding_status: string | null;

  // ✅ add this (because your query returns it)
  tenant_id: string | null;

  // ✅ tenant/client display name
  client_name: string | null;
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

/**
 * Creates a session row in auth.user_session.
 */
export async function createSession(userId: string) {
  const session_id = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30); // 30 days

  await pool.query(
    `
    insert into auth.user_session (session_id, user_id, expires_at)
    values ($1::uuid, $2::uuid, $3::timestamptz)
    `,
    [session_id, userId, expires_at.toISOString()]
  );

  return { session_id, expires_at: expires_at.toISOString() };
}

export async function setSessionCookie(sessionId: string, expiresAtIso: string) {
  const expires = new Date(expiresAtIso);
  const c = await cookies(); // Next 16: cookies() is async
  c.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires,
  });
}

export async function clearSessionCookie() {
  const c = await cookies();
  c.set(SESSION_COOKIE, "", { path: "/", expires: new Date(0) });
}

/**
 * Reads current session cookie, validates session, returns user record.
 * Joins tenant via public.app_user -> public.tenant.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE)?.value ?? "";
  if (!sessionId) return null;

  // 1) Validate session
  const s = await pool.query(
    `
    select user_id, expires_at
    from auth.user_session
    where session_id = $1::uuid
    limit 1
    `,
    [sessionId]
  );

  const sess = s.rows?.[0] ?? null;
  if (!sess) return null;

  const expiresAt = sess.expires_at ? new Date(sess.expires_at) : null;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    // best-effort cleanup
    try {
      await pool.query(`delete from auth.user_session where session_id = $1::uuid`, [sessionId]);
    } catch {}
    await clearSessionCookie();
    return null;
  }

  const userId = String(sess.user_id);

  // 2) Fetch user + tenant name safely
  try {
    const r = await pool.query(
      `
      select
        u.user_id,
        u.email,
        u.full_name,
        u.onboarding_status,
        pu.tenant_id as tenant_id,
        t.name as client_name
      from auth.app_user u
      left join public.app_user pu
        on pu.user_id = u.user_id
      left join public.tenant t
        on t.tenant_id = pu.tenant_id
      where u.user_id = $1::uuid
      limit 1
      `,
      [userId]
    );

    const row = r.rows?.[0] ?? null;
    if (!row) return null;

    return {
      user_id: String(row.user_id),
      email: String(row.email),
      full_name: row.full_name ?? null,
      onboarding_status: row.onboarding_status ?? null,
      tenant_id: row.tenant_id ? String(row.tenant_id) : null,
      client_name: row.client_name ?? null,
    };
  } catch {
    // Fallback: auth only (no tenant join)
    const r2 = await pool.query(
      `
      select user_id, email, full_name, onboarding_status
      from auth.app_user
      where user_id = $1::uuid
      limit 1
      `,
      [userId]
    );
    const row2 = r2.rows?.[0] ?? null;
    if (!row2) return null;

    return {
      user_id: String(row2.user_id),
      email: String(row2.email),
      full_name: row2.full_name ?? null,
      onboarding_status: row2.onboarding_status ?? null,
      tenant_id: null,
      client_name: null,
    };
  }
}