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
  first_name: string | null;
  last_name: string | null;
  contact: string | null;
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

export async function createSession(userId: string) {
  const session_id = crypto.randomUUID();
  const expires_at = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);

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

export async function getSessionUser(): Promise<SessionUser | null> {
  const c = await cookies();
  const sessionId = c.get(SESSION_COOKIE)?.value ?? "";
  if (!sessionId) return null;

  // 1) Validate session (session_id -> user_id, expires_at)
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

  // 2) Fetch user record
  const r = await pool.query(
    `
    select
      user_id,
      email,
      full_name,
      first_name,
      last_name,
      contact,
      onboarding_status
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
    full_name: row.full_name ?? null,
    first_name: row.first_name ?? null,
    last_name: row.last_name ?? null,
    contact: row.contact ?? null,
    onboarding_status: row.onboarding_status ?? null,
    client_name: null, // ✅ keep safe until tenant linking is finalized
  };
}