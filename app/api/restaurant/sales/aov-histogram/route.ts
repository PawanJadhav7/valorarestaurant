//app/api/restaurant/sales/aov-histogram/route.ts
import { NextResponse } from "next/server";
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

function parsePositiveInt(sp: URLSearchParams, key: string, fallback: number) {
  const raw = sp.get(key);
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : fallback;
}

function windowStartSql(windowCode: "7d" | "30d" | "90d" | "ytd") {
  if (windowCode === "7d") return `(current_date - interval '6 days')::date`;
  if (windowCode === "30d") return `(current_date - interval '29 days')::date`;
  if (windowCode === "90d") return `(current_date - interval '89 days')::date`;
  return `date_trunc('year', current_date)::date`;
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const windowCode = parseWindow(url.searchParams);
    const locationId = parseLocationId(url.searchParams);
    const bucketSize = parsePositiveInt(url.searchParams, "bucket_size", 10);
    const maxValue = parsePositiveInt(url.searchParams, "max_value", 200);

    const result = await withTenant(async ({ client, tenantId }) => {
      const allowedRes = await client.query(
        `
        select distinct tl.location_id::bigint as location_id
        from app.tenant_location tl
        where tl.tenant_id = $1::uuid
          and tl.is_active = true
        order by 1
        `,
        [tenantId]
      );

      const allowedIds = allowedRes.rows
        .map((r: any) => Number(r.location_id))
        .filter(Number.isFinite);

      if (allowedIds.length === 0) {
        return {
          status: 403,
          body: { ok: false, error: "No locations assigned to this tenant yet" },
        };
      }

      if (locationId !== null && !allowedIds.includes(locationId)) {
        return {
          status: 403,
          body: { ok: false, error: "Forbidden location" },
        };
      }

      const startSql = windowStartSql(windowCode);

      const histRes = await client.query(
        `
        with daily_aov as (
          select
            day,
            case
              when coalesce(sum(orders), 0) = 0 then null
              else round((sum(revenue) / sum(orders))::numeric, 2)
            end as aov
          from restaurant.f_location_daily_features
          where tenant_id = $1::uuid
            and day >= ${startSql}
            and location_id = any($2::bigint[])
            and ($3::bigint is null or location_id = $3::bigint)
          group by day
        ),
        bucketed as (
          select
            floor(least(aov, $5::numeric - 0.000001) / $4::numeric) * $4::numeric as bucket_from,
            floor(least(aov, $5::numeric - 0.000001) / $4::numeric) * $4::numeric + $4::numeric as bucket_to
          from daily_aov
          where aov is not null
            and aov >= 0
            and aov < $5::numeric
        ),
        counts as (
          select
            bucket_from,
            bucket_to,
            count(*)::int as orders
          from bucketed
          group by bucket_from, bucket_to
        ),
        totals as (
          select coalesce(sum(orders), 0)::numeric as total_orders
          from counts
        )
        select
          c.bucket_from::numeric(18,2) as bucket_from,
          c.bucket_to::numeric(18,2) as bucket_to,
          c.orders,
          case
            when t.total_orders = 0 then 0
            else round((c.orders / t.total_orders * 100)::numeric, 2)
          end as share_pct
        from counts c
        cross join totals t
        order by c.bucket_from
        `,
        [tenantId, allowedIds, locationId, bucketSize, maxValue]
      );

      return {
        status: 200,
        body: {
          ok: true,
          window: windowCode,
          location: { id: locationId ?? "all" },
          bucket_size: bucketSize,
          max_value: maxValue,
          buckets: histRes.rows ?? [],
        },
      };
    });

    return NextResponse.json(result.body, { status: result.status });
  } catch (e: any) {
    return NextResponse.json(
      { ok: false, error: e?.message ?? "AOV histogram route error" },
      { status: 500 }
    );
  }
}