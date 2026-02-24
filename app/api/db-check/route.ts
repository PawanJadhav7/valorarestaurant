import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

function safeDbUrlHost(urlStr?: string) {
  if (!urlStr) return null;
  try {
    // URL() requires a protocol; postgres URLs are fine as "postgresql://..."
    const u = new URL(urlStr);
    return u.host; // hostname:port
  } catch {
    return null;
  }
}

export async function GET() {
  try {
    const r = await pool.query(`
      SELECT
        current_database() AS db,
        current_user AS usr,
        inet_server_addr() AS server_addr,
        inet_server_port() AS server_port,
        inet_client_addr() AS client_addr,
        current_setting('server_version') AS server_version,
        EXISTS (
          SELECT 1 FROM information_schema.schemata WHERE schema_name='analytics'
        ) AS has_analytics,
        (
          SELECT COUNT(*)
          FROM information_schema.routines
          WHERE routine_schema='analytics'
        ) AS analytics_routines
    `);

    const dbUrl = process.env.DATABASE_URL;

    return NextResponse.json(
      {
        env_has_DATABASE_URL: Boolean(dbUrl),
        database_url_host: safeDbUrlHost(dbUrl),          // ✅ THIS is the key
        database_url_prefix: dbUrl?.slice(0, 70) ?? null, // longer prefix helps debug
        db_identity: r.rows[0],
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json(
      {
        env_has_DATABASE_URL: Boolean(process.env.DATABASE_URL),
        database_url_host: safeDbUrlHost(process.env.DATABASE_URL),
        error: e?.message ?? String(e),
      },
      { status: 500 }
    );
  }
}