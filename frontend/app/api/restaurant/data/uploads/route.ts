import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = `
      select
        upload_id,
        created_at,
        filename,
        size_bytes,
        row_count,
        columns,
        location_id,
        dataset
      from staging.restaurant_csv_uploads
      order by created_at desc
      limit 25;
    `;

    const r = await pool.query(sql);

    return NextResponse.json(
      { ok: true, uploads: r.rows ?? [] },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, uploads: [], error: e?.message ?? String(e) },
      { status: 500 }
    );
  }
}