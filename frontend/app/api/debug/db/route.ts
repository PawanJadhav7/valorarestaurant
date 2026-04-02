//frontend/app/api/debug/db/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  
  const r = await pool.query(`
    select
      current_database() as db,
      current_schema() as schema,
      current_setting('search_path') as search_path,
      version() as version
  `);

  const fn = await pool.query(`
    select exists (
      select 1
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
      where n.nspname='analytics'
        and p.proname='get_executive_kpis_by_location'
    ) as has_fn
  `);

  return NextResponse.json(
    { ok: true, db: r.rows[0], has_fn: fn.rows[0]?.has_fn ?? false },
    { headers: { "Cache-Control": "no-store" } }
  );
}