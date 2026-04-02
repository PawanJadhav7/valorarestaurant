import { NextResponse } from "next/server";
import { pool } from "@/lib/db";
import { cookies } from "next/headers";
import { clearSessionCookie } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SESSION_COOKIE = "valora_session";

export async function POST() {
  try {
    const c = await cookies();
    const sessionId = c.get(SESSION_COOKIE)?.value;

    if (sessionId) {
      await pool.query(`delete from auth.user_session where session_id = $1::uuid`, [sessionId]);
    }

    await clearSessionCookie();

    return NextResponse.json(
      { ok: true, redirect: "/signin" },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    await clearSessionCookie();

    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e), redirect: "/signin" },
      { status: 500, headers: { "Cache-Control": "no-store" } }
    );
  }
}