// app/api/restaurant/upload/route.ts
import { NextResponse } from "next/server";
import { pool } from "@/lib/db";

const REQUIRED = ["location_id", "day"] as const;

// Minimal CSV parser (MVP): handles quotes, commas, CRLF.
// Good enough for “daily aggregates” CSV.
function parseCsv(text: string) {
  const rows: string[][] = [];
  let cur = "";
  let row: string[] = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (ch === '"' && inQuotes && next === '"') {
      cur += '"';
      i++;
      continue;
    }
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (!inQuotes && ch === ",") {
      row.push(cur);
      cur = "";
      continue;
    }
    if (!inQuotes && (ch === "\n" || ch === "\r")) {
      if (ch === "\r" && next === "\n") i++;
      row.push(cur);
      cur = "";
      // ignore empty trailing lines
      if (row.some((c) => c.trim() !== "")) rows.push(row);
      row = [];
      continue;
    }
    cur += ch;
  }
  // last cell
  row.push(cur);
  if (row.some((c) => c.trim() !== "")) rows.push(row);

  return rows;
}

function toNum(v: string) {
  const s = (v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(/[$,]/g, ""));
  return Number.isFinite(n) ? n : null;
}

function toInt(v: string) {
  const n = toNum(v);
  return n === null ? null : Math.trunc(n);
}

function normHeader(h: string) {
  return (h ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "_");
}

export async function POST(req: Request) {
  try {
    const form = await req.formData();
    const file = form.get("file");

    if (!(file instanceof File)) {
      return NextResponse.json({ ok: false, error: "file is required (multipart form-data field: file)" }, { status: 400 });
    }

    const text = await file.text();
    const grid = parseCsv(text);
    if (grid.length < 2) {
      return NextResponse.json({ ok: false, error: "CSV must include header + at least 1 row" }, { status: 400 });
    }

    const header = grid[0].map(normHeader);
    const missing = REQUIRED.filter((c) => !header.includes(c));
    if (missing.length) {
      return NextResponse.json(
        { ok: false, error: `Missing required columns: ${missing.join(", ")}`, header },
        { status: 400 }
      );
    }

    const idx = Object.fromEntries(header.map((h, i) => [h, i])) as Record<string, number>;
    const rows = grid.slice(1);

    let inserted = 0;
    let updated = 0;
    const errors: Array<{ row: number; reason: string }> = [];

    const client = await pool.connect();
    try {
      await client.query("begin");

      for (let r = 0; r < rows.length; r++) {
        const line = rows[r];
        const rowNum = r + 2; // 1-based with header

        const location_id = (line[idx["location_id"]] ?? "").trim();
        const dayRaw = (line[idx["day"]] ?? "").trim();

        if (!location_id) {
          errors.push({ row: rowNum, reason: "location_id empty" });
          continue;
        }
        if (!dayRaw) {
          errors.push({ row: rowNum, reason: "day empty" });
          continue;
        }

        // Accept YYYY-MM-DD or MM/DD/YYYY (basic)
        let day = dayRaw;
        if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(dayRaw)) {
          const [mm, dd, yyyy] = dayRaw.split("/");
          day = `${yyyy}-${mm.padStart(2, "0")}-${dd.padStart(2, "0")}`;
        }

        const location_name = (line[idx["location_name"]] ?? "").trim() || null;

        const payload = {
          revenue: toNum(line[idx["revenue"]] ?? ""),
          cogs: toNum(line[idx["cogs"]] ?? ""),
          labor: toNum(line[idx["labor"]] ?? ""),
          fixed_costs: toNum(line[idx["fixed_costs"]] ?? ""),
          marketing_spend: toNum(line[idx["marketing_spend"]] ?? ""),
          interest_expense: toNum(line[idx["interest_expense"]] ?? ""),
          orders: toInt(line[idx["orders"]] ?? ""),
          customers: toInt(line[idx["customers"]] ?? ""),
          new_customers: toInt(line[idx["new_customers"]] ?? ""),
          avg_inventory: toNum(line[idx["avg_inventory"]] ?? ""),
          ar_balance: toNum(line[idx["ar_balance"]] ?? ""),
          ap_balance: toNum(line[idx["ap_balance"]] ?? ""),
          ebit: toNum(line[idx["ebit"]] ?? ""),
        };

        // Upsert (location_id, day)
        const q = `
          insert into restaurant.raw_restaurant_daily (
            location_id, location_name, day,
            revenue, cogs, labor, fixed_costs, marketing_spend, interest_expense,
            orders, customers, new_customers,
            avg_inventory, ar_balance, ap_balance, ebit,
            source_file
          )
          values (
            $1, $2, $3::date,
            $4, $5, $6, $7, $8, $9,
            $10, $11, $12,
            $13, $14, $15, $16,
            $17
          )
          on conflict (location_id, day)
          do update set
            location_name = excluded.location_name,
            revenue = excluded.revenue,
            cogs = excluded.cogs,
            labor = excluded.labor,
            fixed_costs = excluded.fixed_costs,
            marketing_spend = excluded.marketing_spend,
            interest_expense = excluded.interest_expense,
            orders = excluded.orders,
            customers = excluded.customers,
            new_customers = excluded.new_customers,
            avg_inventory = excluded.avg_inventory,
            ar_balance = excluded.ar_balance,
            ap_balance = excluded.ap_balance,
            ebit = excluded.ebit,
            source_file = excluded.source_file
          returning (xmax = 0) as inserted;
        `;

        const res = await client.query(q, [
          location_id,
          location_name,
          day,
          payload.revenue,
          payload.cogs,
          payload.labor,
          payload.fixed_costs,
          payload.marketing_spend,
          payload.interest_expense,
          payload.orders,
          payload.customers,
          payload.new_customers,
          payload.avg_inventory,
          payload.ar_balance,
          payload.ap_balance,
          payload.ebit,
          file.name,
        ]);

        const wasInserted = !!res.rows?.[0]?.inserted;
        if (wasInserted) inserted++;
        else updated++;
      }

      await client.query("commit");
    } catch (e) {
      await client.query("rollback");
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({
      ok: true,
      file: { name: file.name, size: file.size },
      inserted,
      updated,
      rejected: errors.length,
      errors: errors.slice(0, 25),
    });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  }
}