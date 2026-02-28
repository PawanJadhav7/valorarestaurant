import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function toNum(v: any): number | null {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function toDate(v: any): string | null {
  if (v === null || v === undefined) return null;
  const s = String(v).trim();
  if (!s) return null;
  // allow YYYY-MM-DD or ISO
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mappingId = String(body?.mapping_id ?? "").trim();
    if (!mappingId) return NextResponse.json({ ok: false, error: "mapping_id required" }, { status: 400 });

    const m = await pool.query(
      `
      select mapping_id, upload_id, dataset, date_col, location_col, location_mode, metrics
      from staging.restaurant_csv_mappings
      where mapping_id = $1::uuid
      limit 1
      `,
      [mappingId]
    );

    const mapping = m.rows?.[0];
    if (!mapping) return NextResponse.json({ ok: false, error: "mapping not found" }, { status: 404 });
    if (mapping.dataset !== "labor") return NextResponse.json({ ok: false, error: "mapping dataset must be labor" }, { status: 400 });

    const uploadId: string = mapping.upload_id;
    const dateCol: string = mapping.date_col;
    const locationCol: string | null = mapping.location_col;
    const metrics: Array<{ metric: string; col: string }> = mapping.metrics ?? [];

    // Pull rows
    const rowsRes = await pool.query(
      `
      select row_num, row
      from staging.restaurant_csv_rows
      where upload_id = $1::uuid
      order by row_num asc
      `,
      [uploadId]
    );

    if (!rowsRes.rows?.length) {
      return NextResponse.json({ ok: false, error: "No parsed rows for upload_id. Ensure upload stores rows into staging.restaurant_csv_rows." }, { status: 400 });
    }

    // Build metric column lookup
    const metricCol = new Map<string, string>();
    for (const mm of metrics) metricCol.set(mm.metric, mm.col);

    // Expected labor metrics (MVP)
    const COL_LABOR_HOURS = metricCol.get("labor_hours") ?? null;
    const COL_LABOR_COST = metricCol.get("labor_cost_usd") ?? null;
    const COL_OT_HOURS = metricCol.get("overtime_hours") ?? null;
    const COL_OT_COST = metricCol.get("overtime_cost_usd") ?? null;
    const COL_HEADCOUNT = metricCol.get("headcount") ?? null;

    const errors: any[] = [];
    const factRows: Array<{
      labor_date: string;
      location_code: string | null;
      labor_hours: number | null;
      labor_cost_usd: number | null;
      overtime_hours: number | null;
      overtime_cost_usd: number | null;
      headcount: number | null;
    }> = [];

    for (const r of rowsRes.rows) {
      const row = r.row ?? {};
      const labor_date = toDate(row[dateCol]);
      const location_code = locationCol ? String(row[locationCol] ?? "").trim() || null : null;

      if (!labor_date) {
        errors.push({ row_num: r.row_num, error: `Invalid date in column "${dateCol}"` });
        continue;
      }

      const labor_hours = COL_LABOR_HOURS ? toNum(row[COL_LABOR_HOURS]) : null;
      const labor_cost_usd = COL_LABOR_COST ? toNum(row[COL_LABOR_COST]) : null;
      const overtime_hours = COL_OT_HOURS ? toNum(row[COL_OT_HOURS]) : null;
      const overtime_cost_usd = COL_OT_COST ? toNum(row[COL_OT_COST]) : null;
      const headcount = COL_HEADCOUNT ? toNum(row[COL_HEADCOUNT]) : null;

      factRows.push({ labor_date, location_code, labor_hours, labor_cost_usd, overtime_hours, overtime_cost_usd, headcount });
    }

    if (errors.length) {
      await pool.query(
        `update staging.restaurant_csv_mappings set status='error', validation_errors=$2::jsonb, updated_at=now() where mapping_id=$1::uuid`,
        [mappingId, JSON.stringify(errors.slice(0, 200))]
      );
      return NextResponse.json({ ok: false, error: "Validation failed", validation_errors: errors.slice(0, 50) }, { status: 400 });
    }

    // Upsert facts
    const client = await pool.connect();
    try {
      await client.query("begin");

      for (const fr of factRows) {
        await client.query(
          `
          insert into analytics.fact_labor_daily
            (labor_date, location_code, labor_hours, labor_cost_usd, overtime_hours, overtime_cost_usd, headcount, upload_id)
          values
            ($1::date, $2::text, $3::numeric, $4::numeric, $5::numeric, $6::numeric, $7::numeric, $8::uuid)
          on conflict (labor_date, coalesce(location_code,'__na__'))
          do update set
            labor_hours = excluded.labor_hours,
            labor_cost_usd = excluded.labor_cost_usd,
            overtime_hours = excluded.overtime_hours,
            overtime_cost_usd = excluded.overtime_cost_usd,
            headcount = excluded.headcount,
            upload_id = excluded.upload_id
          `,
          [
            fr.labor_date,
            fr.location_code,
            fr.labor_hours,
            fr.labor_cost_usd,
            fr.overtime_hours,
            fr.overtime_cost_usd,
            fr.headcount,
            uploadId,
          ]
        );
      }

      await client.query(
        `update staging.restaurant_csv_mappings set status='promoted', validation_errors='[]'::jsonb, updated_at=now() where mapping_id=$1::uuid`,
        [mappingId]
      );

      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json(
      { ok: true, promoted: factRows.length, upload_id: uploadId, mapping_id: mappingId },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}