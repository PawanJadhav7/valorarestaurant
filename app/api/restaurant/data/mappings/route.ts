import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type MetricMap = { metric: string; col: string };

function asText(v: any) {
  const s = String(v ?? "").trim();
  return s.length ? s : null;
}

function validatePayload(p: any) {
  const errors: string[] = [];
  const upload_id = asText(p?.upload_id);
  const dataset = asText(p?.dataset);
  const date_col = asText(p?.date_col);
  const location_col = asText(p?.location_col);
  const location_mode = asText(p?.location_mode) ?? "code";
  const metrics = Array.isArray(p?.metrics) ? (p.metrics as MetricMap[]) : [];

  if (!upload_id) errors.push("upload_id required");
  if (!dataset || !["sales","labor","inventory"].includes(dataset)) errors.push("dataset must be sales|labor|inventory");
  if (!date_col) errors.push("date_col required");
  if (!["code","id","name"].includes(location_mode)) errors.push("location_mode must be code|id|name");

  // metrics: allow empty in draft, but must be array
  for (const m of metrics) {
    if (!asText(m?.metric) || !asText(m?.col)) errors.push("metrics entries require metric + col");
  }

  return { ok: errors.length === 0, errors, upload_id, dataset, date_col, location_col, location_mode, metrics };
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const uploadId = url.searchParams.get("upload_id");

    const r = await pool.query(
      `
      select mapping_id, upload_id, dataset, date_col, location_col, location_mode,
             metrics, status, validation_errors, created_at, updated_at
      from staging.restaurant_csv_mappings
      where ($1::uuid is null or upload_id = $1::uuid)
      order by created_at desc
      limit 100
      `,
      [uploadId ? uploadId : null]
    );

    return NextResponse.json({ ok: true, mappings: r.rows ?? [] }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e), mappings: [] }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { ok, errors, upload_id, dataset, date_col, location_col, location_mode, metrics } = validatePayload(body);

    // allow save as draft even with missing metrics:
    // only enforce date_col+dataset+upload_id
    const softErrors = [];
    if (!upload_id) softErrors.push("upload_id required");
    if (!dataset || !["sales","labor","inventory"].includes(dataset)) softErrors.push("dataset invalid");
    if (!date_col) softErrors.push("date_col required");
    if (softErrors.length) return NextResponse.json({ ok: false, error: softErrors.join(", ") }, { status: 400 });

    const mapping_id = asText(body?.mapping_id);

    if (mapping_id) {
      const r = await pool.query(
        `
        update staging.restaurant_csv_mappings
        set dataset = $2::text,
            date_col = $3::text,
            location_col = $4::text,
            location_mode = $5::text,
            metrics = $6::jsonb,
            status = 'draft',
            validation_errors = '[]'::jsonb,
            updated_at = now()
        where mapping_id = $1::uuid
        returning *
        `,
        [mapping_id, dataset, date_col, location_col, location_mode, JSON.stringify(metrics)]
      );
      return NextResponse.json({ ok: true, mapping: r.rows?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
    }

    const r = await pool.query(
      `
      insert into staging.restaurant_csv_mappings (upload_id, dataset, date_col, location_col, location_mode, metrics)
      values ($1::uuid,$2::text,$3::text,$4::text,$5::text,$6::jsonb)
      returning *
      `,
      [upload_id, dataset, date_col, location_col, location_mode, JSON.stringify(metrics)]
    );

    return NextResponse.json({ ok: true, mapping: r.rows?.[0] ?? null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}