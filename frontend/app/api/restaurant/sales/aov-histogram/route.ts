import { NextRequest, NextResponse } from "next/server";
import { withTenant } from "@/lib/tenant-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function parseWindow(sp: URLSearchParams): "7d" | "30d" | "90d" | "ytd" {
  const w = (sp.get("window") ?? "30d").toLowerCase();
  if (w === "7d" || w === "30d" || w === "90d" || w === "ytd") return w;
  return "30d";
}

function parseLocationId(sp: URLSearchParams): number | null {
  const raw = sp.get("location_id");
  if (!raw) return null;
  const n = Number(raw);
  return Number.isInteger(n) ? n : null;
}

function parseAsOf(sp: URLSearchParams): string | null {
  const raw = sp.get("as_of");
  if (!raw) return null;
  return raw.slice(0, 10);
}

function parsePositiveNumber(
  value: string | null,
  fallback: number,
  min: number,
  max: number
) {
  const n = Number(value);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(min, Math.min(n, max));
}

function windowBoundsSql(
  windowCode: "7d" | "30d" | "90d" | "ytd",
  anchorSql: string
) {
  const anchorDate = `(${anchorSql})::date`;

  switch (windowCode) {
    case "7d":
      return {
        startSql: `(${anchorDate} - 6)`,
        endSql: anchorDate,
      };
    case "30d":
      return {
        startSql: `(${anchorDate} - 29)`,
        endSql: anchorDate,
      };
    case "90d":
      return {
        startSql: `(${anchorDate} - 89)`,
        endSql: anchorDate,
      };
    case "ytd":
    default:
      return {
        startSql: `make_date(extract(year from ${anchorDate})::int, 1, 1)`,
        endSql: anchorDate,
      };
  }
}

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const asOf = parseAsOf(url.searchParams);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);

    const bucketSize = parsePositiveNumber(
      url.searchParams.get("bucket_size"),
      10,
      1,
      1000
    );

    const maxValue = parsePositiveNumber(
      url.searchParams.get("max_value"),
      200,
      10,
      10000
    );

    const result = await withTenant(async ({ client, tenantId }) => {
      const allowedRes = await client.query(
        `
        select
          tl.location_id::bigint as location_id,
          dl.location_name
        from app.tenant_location tl
        left join restaurant.dim_location dl
          on dl.location_id = tl.location_id
        where tl.tenant_id = $1::uuid
          and tl.is_active = true
        order by tl.location_id
        `,
        [tenantId]
      );

      const allowedIds = allowedRes.rows
        .map((r: any) => Number(r.location_id))
        .filter(Number.isFinite);

      if (allowedIds.length === 0) {
        return {
          status: 403,
          body: {
            ok: false,
            error: "No locations assigned to this tenant yet",
          },
        };
      }

      if (locationId !== null && !allowedIds.includes(locationId)) {
        return {
          status: 403,
          body: { ok: false, error: "Forbidden location" },
        };
      }

      const anchorRes = await client.query(
        `
        select coalesce(
          $4::date,
          max(o.order_date)
        ) as anchor_day
        from restaurant.fact_order o
        where o.tenant_id = $1::uuid
          and o.location_id = any($2::bigint[])
          and ($3::bigint is null or o.location_id = $3::bigint)
          and o.order_status = 'completed'
        `,
        [tenantId, allowedIds, locationId, asOf]
      );

      const anchorDay = anchorRes.rows?.[0]?.anchor_day ?? null;

      if (!anchorDay) {
        return {
          status: 200,
          body: {
            ok: true,
            window: windowCode,
            location: { id: locationId ?? "all" },
            bucket_size: bucketSize,
            max_value: maxValue,
            anchor_day: null,
            buckets: [],
          },
        };
      }

      const { startSql, endSql } = windowBoundsSql(windowCode, "$6");

      const histRes = await client.query(
        `
        with orders_base as (
          select
            o.order_id,
            o.order_date,
            o.net_sales
          from restaurant.fact_order o
          where o.tenant_id = $1::uuid
            and o.location_id = any($2::bigint[])
            and ($3::bigint is null or o.location_id = $3::bigint)
            and o.order_status = 'completed'
            and o.order_date >= ${startSql}
            and o.order_date <= ${endSql}
        ),
        bucketed as (
          select
            floor(greatest(o.net_sales, 0) / $4::numeric) * $4::numeric as bucket_from,
            floor(greatest(o.net_sales, 0) / $4::numeric) * $4::numeric + $4::numeric as bucket_to,
            count(*)::int as orders
          from orders_base o
          where o.net_sales is not null
            and o.net_sales >= 0
            and o.net_sales <= $5::numeric
          group by 1, 2
        ),
        tot as (
          select coalesce(sum(orders), 0) as total_orders
          from bucketed
        )
        select
          bucket_from,
          bucket_to,
          orders,
          case
            when tot.total_orders = 0 then 0
            else round((bucketed.orders::numeric / tot.total_orders::numeric) * 100, 2)
          end as share_pct
        from bucketed
        cross join tot
        order by bucket_from
        `,
        [tenantId, allowedIds, locationId, bucketSize, maxValue, anchorDay]
      );

      return {
        status: 200,
        body: {
          ok: true,
          window: windowCode,
          location: {
            id: locationId ?? "all",
          },
          bucket_size: bucketSize,
          max_value: maxValue,
          anchor_day: anchorDay,
          buckets: histRes.rows ?? [],
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "aov histogram route error" },
      { status: 500 }
    );
  }
}