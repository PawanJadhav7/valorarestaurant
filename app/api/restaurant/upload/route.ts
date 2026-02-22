import { NextResponse } from "next/server";
import pg from "pg";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const { Pool } = pg;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

function toNum(v: any) {
  if (v === null || v === undefined || v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export async function POST(req: Request) {
  if (!process.env.DATABASE_URL) {
    return NextResponse.json({ ok: false, error: "Missing DATABASE_URL" }, { status: 500 });
  }

  const form = await req.formData();
  const file = form.get("file");

  if (!file || !(file instanceof File)) {
    return NextResponse.json({ ok: false, error: "Missing file field (use -F file=@...)" }, { status: 400 });
  }

  const text = await file.text();
  const lines = text.split(/\r?\n/).filter(Boolean);

  if (lines.length < 2) {
    return NextResponse.json({ ok: false, error: "CSV has no data rows" }, { status: 400 });
  }

  const headers = lines[0].split(",").map((s) => s.trim());
  const idx = (name: string) => headers.indexOf(name);

  const required = ["location_id", "location_name", "day"];
  for (const r of required) {
    if (idx(r) === -1) {
      return NextResponse.json({ ok: false, error: `Missing required column: ${r}` }, { status: 400 });
    }
  }

  let inserted = 0;
  let updated = 0;

  const client = await pool.connect();
  try {
    await client.query("BEGIN");

    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((s) => s.trim());
      const location_id = cols[idx("location_id")];
      const location_name = cols[idx("location_name")];
      const day = cols[idx("day")];

      const revenue = toNum(cols[idx("revenue")]);
      const cogs = toNum(cols[idx("cogs")]);
      const labor = toNum(cols[idx("labor")]);
      const fixed_costs = toNum(cols[idx("fixed_costs")]);
      const marketing_spend = toNum(cols[idx("marketing_spend")]);
      const interest_expense = toNum(cols[idx("interest_expense")]);
      const orders = toNum(cols[idx("orders")]);
      const customers = toNum(cols[idx("customers")]);
      const new_customers = toNum(cols[idx("new_customers")]);
      const avg_inventory = toNum(cols[idx("avg_inventory")]);
      const ar_balance = toNum(cols[idx("ar_balance")]);
      const ap_balance = toNum(cols[idx("ap_balance")]);
      const ebit = toNum(cols[idx("ebit")]);

      // IMPORTANT: This assumes you created a UNIQUE constraint on (location_id, day)
      const q = `
        insert into restaurant.raw_restaurant_daily
          (location_id, location_name, day,
           revenue, cogs, labor, fixed_costs, marketing_spend, interest_expense,
           orders, customers, new_customers, avg_inventory, ar_balance, ap_balance, ebit,
           source_file)
        values
          ($1,$2,$3,
           $4,$5,$6,$7,$8,$9,
           $10,$11,$12,$13,$14,$15,$16,
           $17)
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

      const r = await client.query(q, [
        location_id,
        location_name,
        day,
        revenue,
        cogs,
        labor,
        fixed_costs,
        marketing_spend,
        interest_expense,
        orders,
        customers,
        new_customers,
        avg_inventory,
        ar_balance,
        ap_balance,
        ebit,
        file.name,
      ]);

      if (r.rows?.[0]?.inserted) inserted++;
      else updated++;
    }

    await client.query("COMMIT");
  } catch (e: any) {
    await client.query("ROLLBACK");
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 500 });
  } finally {
    client.release();
  }

  return NextResponse.json({
    ok: true,
    file: file.name,
    inserted,
    updated,
    total: inserted + updated,
  });
}