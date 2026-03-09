import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uploadId = url.searchParams.get("upload_id");
    if (!uploadId) return NextResponse.json({ ok: false, error: "upload_id required" }, { status: 400 });

    const r = await pool.query(
      `
      select row
      from staging.restaurant_csv_rows
      where upload_id = $1::uuid
      order by row_num asc
      limit 1
      `,
      [uploadId]
    );

    const row = r.rows?.[0]?.row ?? null;
    const cols = row ? Object.keys(row) : [];

    return NextResponse.json({ ok: true, upload_id: uploadId, columns: cols }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}