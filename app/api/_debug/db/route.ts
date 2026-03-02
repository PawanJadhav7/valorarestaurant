import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const q = `
    select
      current_database() as db,
      current_user as usr,
      current_setting('search_path') as search_path,
      to_regclass('restaurant.fact_inventory_item_on_hand_daily') as inv_obj,
      (select exists (
        select 1 from information_schema.schemata where schema_name='restaurant'
      )) as has_restaurant_schema;
  `;
  const { rows } = await pool.query(q);
  return NextResponse.json({ rows: rows[0] ?? null });
}