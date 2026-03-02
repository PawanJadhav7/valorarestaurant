// lib/auth.ts
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import crypto from "crypto";

const SESSION_COOKIE = "valora_session";

export type SessionUser = {
  user_id: string;
  email: string;
  first_name: string | null;
  last_name: string | null;
  full_name: string | null;
  onboarding_status: string | null;
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

/** Creates a session row in auth.user_session. */
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
  const c = await cookies();
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

/** Avoid hard-crash if schema/table is missing */
async function tableExists(qualifiedName: string): Promise<boolean> {
  try {
    const { rows } = await pool.query(`select to_regclass($1) as reg`, [qualifiedName]);
    return !!rows?.[0]?.reg;
  } catch {
    return false;
  }
}

/** Guard against invalid UUID cookie value */
function looksLikeUuid(v: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
}

/**
 * Reads current session cookie, validates session, returns user record.
 * Safe if auth schema/tables are missing.
 */
export async function getSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE)?.value ?? "";
  if (!sessionId) return null;

  // prevent query crash if cookie is garbage
  if (!looksLikeUuid(sessionId)) {
    await clearSessionCookie();
    return null;
  }

  // If auth tables are missing, treat as logged out.
  const [hasUserSession, hasAppUser] = await Promise.all([
    tableExists("auth.user_session"),
    tableExists("auth.app_user"),
  ]);
  if (!hasUserSession || !hasAppUser) return null;

  // 1) Validate session
  let sess: { user_id: string; expires_at: string } | null = null;
  try {
    const s = await pool.query(
      `
      select user_id, expires_at
      from auth.user_session
      where session_id = $1::uuid
      limit 1
      `,
      [sessionId]
    );
    sess = (s.rows?.[0] as any) ?? null;
  } catch {
    return null;
  }

  if (!sess) return null;

  const expiresAt = sess.expires_at ? new Date(sess.expires_at) : null;
  if (!expiresAt || expiresAt.getTime() <= Date.now()) {
    try {
      await pool.query(`delete from auth.user_session where session_id = $1::uuid`, [sessionId]);
    } catch {}
    await clearSessionCookie();
    return null;
  }

  const userId = String(sess.user_id);

  // 2) Fetch user record
  try {
    const r = await pool.query(
      `
      select
        user_id,
        email,
        first_name,
        last_name,
        full_name,
        onboarding_status,
        client_name
      from auth.app_user
      where user_id = $1::uuid
      limit 1
      `,
      [userId]
    );

    const row = r.rows?.[0] ?? null;
    if (!row) return null;

    return {
      user_id: String(row.user_id),
      email: String(row.email),
      first_name: row.first_name ?? null,
      last_name: row.last_name ?? null,
      full_name: row.full_name ?? null,
      onboarding_status: row.onboarding_status ?? null,
      client_name: row.client_name ?? null,
    };
  } catch {
    return null;
  }
}