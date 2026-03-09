// app/api/restaurant/locations/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const r = await pool.query(`
      SELECT location_id, location_code, name
      FROM restaurant.dim_location
      ORDER BY location_code ASC;
    `);

    return NextResponse.json(
      { ok: true, locations: r.rows ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}