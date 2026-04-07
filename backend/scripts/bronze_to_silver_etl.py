#!/usr/bin/env python3
"""
Valora Bronze → Silver ETL
Transforms pos_raw_event (Bronze) into f_location_daily_features (Silver)
Uses correct backfill payload field names.
"""

import os
import sys
import argparse
import logging
import psycopg2
from dotenv import load_dotenv

load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

SQL = """
INSERT INTO restaurant.f_location_daily_features (
    tenant_id, location_id, day, location_name,
    revenue, cogs, labor, fixed_costs, marketing_spend, interest_expense,
    orders, customers, new_customers,
    avg_inventory, ar_balance, ap_balance,
    ebit, gross_profit, gross_margin,
    food_cost_pct, labor_cost_pct, prime_cost, prime_cost_pct,
    aov, revenue_per_customer,
    contribution_margin, contribution_margin_pct,
    dio, ar_days, ap_days, cash_conversion_cycle,
    waste_amount, waste_pct, stockout_count,
    labor_hours, overtime_hours, sales_per_labor_hour,
    discount_pct, void_pct, refund_pct,
    day_of_week, week_of_year, month_of_year,
    is_weekend, is_holiday,
    sales_last_7d_avg, sales_last_14d_avg,
    gross_margin_last_7d_avg, food_cost_last_7d_avg, labor_cost_last_7d_avg,
    created_at
)
WITH bronze AS (
    SELECT
        tenant_id,
        location_id,
        (payload_json->>'order_date')::date                                  AS day,
        -- Revenue fields (correct backfill field names)
        COALESCE((payload_json->>'net_sales')::numeric,         0)           AS revenue,
        COALESCE((payload_json->>'gross_sales')::numeric,       0)           AS gross_sales,
        COALESCE((payload_json->>'tax_amount')::numeric,        0)           AS tax_amount,
        COALESCE((payload_json->>'tip_amount')::numeric,        0)           AS tip_amount,
        COALESCE((payload_json->>'discount_amount')::numeric,   0)           AS discount_amount,
        COALESCE((payload_json->>'service_charge_amount')::numeric, 0)       AS service_charge,
        -- Customer
        COALESCE((payload_json->>'customer_count')::int,        1)           AS customers,
        -- Refund count from refunds array
        COALESCE(jsonb_array_length(payload_json->'refunds'),   0)           AS refund_count
    FROM restaurant.pos_raw_event
    WHERE tenant_id   = %(tenant_id)s::uuid
      AND location_id = %(location_id)s
      AND event_source = 'backfill'
      AND payload_json->>'order_date' IS NOT NULL
      AND (%(start)s IS NULL OR (payload_json->>'order_date')::date >= %(start)s::date)
      AND (%(end)s   IS NULL OR (payload_json->>'order_date')::date <= %(end)s::date)
),
daily AS (
    SELECT
        tenant_id,
        location_id,
        day,
        SUM(revenue)          AS revenue,
        SUM(gross_sales)      AS gross_sales,
        SUM(tax_amount)       AS tax_amount,
        SUM(tip_amount)       AS tip_amount,
        SUM(discount_amount)  AS discount_amount,
        SUM(service_charge)   AS service_charge,
        COUNT(*)              AS orders,
        SUM(customers)        AS customers,
        SUM(refund_count)     AS refund_count
    FROM bronze
    GROUP BY tenant_id, location_id, day
),
computed AS (
    SELECT
        d.*,
        l.location_name,

        -- COGS estimate: industry standard 30%% of net sales for restaurant
        d.revenue * 0.30                                AS cogs,
        -- Labor estimate: 30%% of net sales
        d.revenue * 0.30                                AS labor,
        -- Fixed costs estimate: 15%% of net sales
        d.revenue * 0.15                                AS fixed_costs,
        -- Marketing: 2%% of net sales
        d.revenue * 0.02                                AS marketing_spend,
        -- Interest: 1%% of net sales
        d.revenue * 0.01                                AS interest_expense,

        -- P&L derived
        d.revenue - (d.revenue * 0.30)                  AS gross_profit,
        0.70                                            AS gross_margin,
        0.30                                            AS food_cost_pct,
        0.30                                            AS labor_cost_pct,
        d.revenue * 0.60                                AS prime_cost,
        0.60                                            AS prime_cost_pct,

        -- Per order / per customer
        CASE WHEN d.orders > 0
             THEN d.revenue / d.orders                  ELSE 0 END AS aov,
        CASE WHEN d.customers > 0
             THEN d.revenue / d.customers               ELSE 0 END AS rev_per_cust,

        -- EBIT
        d.revenue * (1 - 0.30 - 0.30 - 0.15)           AS ebit,

        -- Contribution margin
        d.revenue * (0.70 - 0.15)                       AS contrib_margin,
        0.55                                            AS contrib_pct,

        -- Cash conversion (simplified estimates)
        7.0                                             AS dio,
        3.0                                             AS ar_days,
        14.0                                            AS ap_days,
        (7.0 + 3.0 - 14.0)                             AS ccc,

        -- Waste estimate: 2%% of revenue
        d.revenue * 0.02                                AS waste_amount,
        0.02                                            AS waste_pct,
        0                                               AS stockout_count,

        -- Labor hours estimate: revenue / $25 per hour
        d.revenue / 25.0                                AS labor_hours,
        0.0                                             AS overtime_hours,
        25.0                                            AS sales_per_lh,

        -- Discount / void / refund pct
        CASE WHEN d.revenue > 0
             THEN d.discount_amount / d.revenue         ELSE 0 END AS discount_pct,
        0.005                                           AS void_pct,
        CASE WHEN d.orders > 0
             THEN d.refund_count::numeric / d.orders    ELSE 0 END AS refund_pct,

        -- No new customers / inventory / AR / AP data in backfill
        0                                               AS new_customers,
        0.0                                             AS avg_inventory,
        0.0                                             AS ar_balance,
        0.0                                             AS ap_balance,

        -- Day metadata
        EXTRACT(DOW   FROM d.day)::smallint             AS day_of_week,
        EXTRACT(WEEK  FROM d.day)::smallint             AS week_of_year,
        EXTRACT(MONTH FROM d.day)::smallint             AS month_of_year,
        (EXTRACT(DOW FROM d.day) = 0 OR EXTRACT(DOW FROM d.day) = 6)            AS is_weekend,
        false                                           AS is_holiday,

        -- Rolling averages (window functions)
        AVG(d.revenue) OVER (
            PARTITION BY d.tenant_id, d.location_id
            ORDER BY d.day
            ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
        ) AS sales_7d_avg,
        AVG(d.revenue) OVER (
            PARTITION BY d.tenant_id, d.location_id
            ORDER BY d.day
            ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
        ) AS sales_14d_avg

    FROM daily d
    JOIN restaurant.dim_location l
      ON l.location_id = d.location_id
     AND l.tenant_id   = d.tenant_id
)
SELECT
    tenant_id, location_id, day, location_name,
    revenue, cogs, labor, fixed_costs, marketing_spend, interest_expense,
    orders, customers, new_customers,
    avg_inventory, ar_balance, ap_balance,
    ebit, gross_profit, gross_margin,
    food_cost_pct, labor_cost_pct, prime_cost, prime_cost_pct,
    aov, rev_per_cust,
    contrib_margin, contrib_pct,
    dio, ar_days, ap_days, ccc,
    waste_amount, waste_pct, stockout_count,
    labor_hours, overtime_hours, sales_per_lh,
    discount_pct, void_pct, refund_pct,
    day_of_week, week_of_year, month_of_year,
    is_weekend, is_holiday,
    sales_7d_avg, sales_14d_avg,
    0.70, food_cost_pct, labor_cost_pct,
    now()
FROM computed
ON CONFLICT (tenant_id, location_id, day)
DO UPDATE SET
    revenue                  = EXCLUDED.revenue,
    cogs                     = EXCLUDED.cogs,
    labor                    = EXCLUDED.labor,
    fixed_costs              = EXCLUDED.fixed_costs,
    orders                   = EXCLUDED.orders,
    customers                = EXCLUDED.customers,
    gross_profit             = EXCLUDED.gross_profit,
    gross_margin             = EXCLUDED.gross_margin,
    food_cost_pct            = EXCLUDED.food_cost_pct,
    labor_cost_pct           = EXCLUDED.labor_cost_pct,
    prime_cost               = EXCLUDED.prime_cost,
    prime_cost_pct           = EXCLUDED.prime_cost_pct,
    ebit                     = EXCLUDED.ebit,
    waste_amount             = EXCLUDED.waste_amount,
    waste_pct                = EXCLUDED.waste_pct,
    aov                      = EXCLUDED.aov,
    revenue_per_customer     = EXCLUDED.revenue_per_customer,
    sales_last_7d_avg        = EXCLUDED.sales_last_7d_avg,
    sales_last_14d_avg       = EXCLUDED.sales_last_14d_avg,
    gross_margin_last_7d_avg = EXCLUDED.gross_margin_last_7d_avg,
    food_cost_last_7d_avg    = EXCLUDED.food_cost_last_7d_avg,
    labor_cost_last_7d_avg   = EXCLUDED.labor_cost_last_7d_avg;
"""

def run_etl(tenant_id: str, location_id: int, start: str | None, end: str | None):
    db_url = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur  = conn.cursor()

    try:
        logger.info("Starting Bronze → Silver ETL")
        logger.info("  tenant_id:   %s", tenant_id)
        logger.info("  location_id: %s", location_id)
        logger.info("  range:       %s → %s", start or "all", end or "all")

        cur.execute(SQL, {
            "tenant_id":   tenant_id,
            "location_id": location_id,
            "start":       start,
            "end":         end,
        })

        rows_affected = cur.rowcount
        conn.commit()
        logger.info("✅ ETL complete — %d Silver rows inserted/updated", rows_affected)

    except Exception as e:
        conn.rollback()
        logger.exception("❌ ETL failed: %s", e)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora Bronze → Silver ETL")
    parser.add_argument("--tenant-id",   required=True,  help="Tenant UUID")
    parser.add_argument("--location-id", required=True,  type=int, help="Location ID")
    parser.add_argument("--start",       default=None,   help="Start date YYYY-MM-DD")
    parser.add_argument("--end",         default=None,   help="End date YYYY-MM-DD")
    args = parser.parse_args()

    run_etl(
        tenant_id=args.tenant_id,
        location_id=args.location_id,
        start=args.start,
        end=args.end,
    )
