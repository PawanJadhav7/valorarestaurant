// frontend/app/api/auth-check/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const a = await pool.query(`select count(*) from auth.app_user`);
    const s = await pool.query(`select count(*) from auth.user_session`);

    return NextResponse.json({
      ok: true,
      app_user_count: a.rows[0]?.count,
      user_session_count: s.rows[0]?.count,
    });
  } catch (e: any) {
    return NextResponse.json(
      {
        ok: false,
        error: e?.message ?? String(e),
        code: e?.code ?? null,
        detail: e?.detail ?? null,
      },
      { status: 500 }
    );
  }
}