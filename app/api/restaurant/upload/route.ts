// app/api/restaurant/upload/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Dataset = "labor" | "sales" | "inventory";

function isDataset(x: string): x is Dataset {
  return x === "labor" || x === "sales" || x === "inventory";
}

// ---------- GET: list last uploads ----------
export async function GET() {
  try {
    // IMPORTANT: keep this query with NO $1 placeholders
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

// ---------- POST: accept multipart file upload ----------
export async function POST(req: Request) {
  try {
    const form = await req.formData();

    const file = form.get("file");
    const datasetRaw = String(form.get("dataset") ?? "").trim().toLowerCase();
    const locationRaw = String(form.get("location_id") ?? "").trim();

    if (!isDataset(datasetRaw)) {
      return NextResponse.json(
        { ok: false, error: `Invalid dataset: "${datasetRaw}". Use labor|sales|inventory.` },
        { status: 400 }
      );
    }
    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "Missing field: file" }, { status: 400 });
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      return NextResponse.json({ ok: false, error: "Only .csv files are supported" }, { status: 400 });
    }

    const locationId = locationRaw && locationRaw !== "all" ? locationRaw : null;

    const buf = Buffer.from(await file.arrayBuffer());
    const text = buf.toString("utf8");

    // Simple CSV parse (MVP)
    const lines = text.replace(/\r\n/g, "\n").split("\n").filter((x) => x.trim().length);
    const headerLine = lines[0] ?? "";
    const columns = headerLine.split(",").map((c) => c.trim()).filter(Boolean);
    const rowCount = Math.max(0, lines.length - 1);

    /**
     * Your table clearly has csv_text NOT NULL (from error).
     *
     * If your table ALSO has raw_csv (bytea), keep it in the insert.
     * If your table does NOT have raw_csv, remove raw_csv from the insert.
     */

    // ✅ Option A (recommended): table has BOTH csv_text + raw_csv
    const sql = `
      insert into staging.restaurant_csv_uploads
        (filename, size_bytes, row_count, columns, location_id, dataset, csv_text, raw_csv)
      values
        ($1::text, $2::bigint, $3::int, $4::jsonb, $5::uuid, $6::text, $7::text, $8::bytea)
      returning upload_id, created_at;
    `;

    const params = [
      file.name,
      buf.length,
      rowCount,
      JSON.stringify(columns),
      locationId,        // uuid or null
      datasetRaw,        // labor/sales/inventory
      text,              // ✅ csv_text NOT NULL
      buf,               // raw_csv (bytea)
    ];

    const r = await pool.query(sql, params);
    const row = r.rows?.[0] ?? null;

    return NextResponse.json(
      {
        ok: true,
        upload_id: row?.upload_id ?? null,
        created_at: row?.created_at ?? null,
        filename: file.name,
        size_bytes: buf.length,
        row_count: rowCount,
        columns,
        location_id: locationId,
        dataset: datasetRaw,
      },
      { headers: { "Cache-Control": "no-store" } }
    );
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}