#!/usr/bin/env python3
"""
Valora Silver → Gold ETL
Transforms f_location_daily_features (Silver)
into raw_restaurant_daily (Gold)
ready for analytics.get_executive_kpis_by_location()
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
INSERT INTO restaurant.raw_restaurant_daily (
    row_id,
    location_id,
    location_id_bigint,
    location_name,
    tenant_id,
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
    source_file,
    created_at
)
SELECT
    gen_random_uuid(),
    s.location_id::text,
    s.location_id,
    s.location_name,
    s.tenant_id,
    s.day,
    s.revenue,
    s.cogs,
    s.labor,
    s.fixed_costs,
    COALESCE(s.marketing_spend,  0),
    COALESCE(s.interest_expense, 0),
    s.orders,
    s.customers,
    COALESCE(s.new_customers, 0),
    COALESCE(s.avg_inventory, 0),
    COALESCE(s.ar_balance,    0),
    COALESCE(s.ap_balance,    0),
    -- Recompute EBIT cleanly
    COALESCE(s.revenue, 0)
        - COALESCE(s.cogs, 0)
        - COALESCE(s.labor, 0)
        - COALESCE(s.fixed_costs, 0),
    'silver_to_gold_etl',
    now()
FROM restaurant.f_location_daily_features s
WHERE s.tenant_id   = %(tenant_id)s::uuid
  AND s.location_id = %(location_id)s
  AND (%(start)s IS NULL OR s.day >= %(start)s::date)
  AND (%(end)s   IS NULL OR s.day <= %(end)s::date)
ON CONFLICT (location_id, day)
DO UPDATE SET
    revenue          = EXCLUDED.revenue,
    cogs             = EXCLUDED.cogs,
    labor            = EXCLUDED.labor,
    fixed_costs      = EXCLUDED.fixed_costs,
    marketing_spend  = EXCLUDED.marketing_spend,
    interest_expense = EXCLUDED.interest_expense,
    orders           = EXCLUDED.orders,
    customers        = EXCLUDED.customers,
    new_customers    = EXCLUDED.new_customers,
    avg_inventory    = EXCLUDED.avg_inventory,
    ar_balance       = EXCLUDED.ar_balance,
    ap_balance       = EXCLUDED.ap_balance,
    ebit             = EXCLUDED.ebit,
    source_file      = EXCLUDED.source_file;
"""

VERIFY_SQL = """
SELECT
    COUNT(*)                                    AS total_days,
    MIN(day)                                    AS min_date,
    MAX(day)                                    AS max_date,
    ROUND(SUM(revenue)::numeric, 2)             AS total_revenue,
    ROUND(AVG(revenue)::numeric, 2)             AS avg_daily_revenue,
    SUM(orders)                                 AS total_orders,
    SUM(customers)                              AS total_customers
FROM restaurant.raw_restaurant_daily
WHERE tenant_id        = %(tenant_id)s::uuid
  AND location_id_bigint = %(location_id)s;
"""

def run_etl(tenant_id: str, location_id: int, start: str | None, end: str | None):
    db_url = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")
    conn = psycopg2.connect(db_url)
    cur  = conn.cursor()

    try:
        logger.info("Starting Silver → Gold ETL")
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
        logger.info("✅ ETL complete — %d Gold rows inserted/updated", rows_affected)

        # ── Verify ────────────────────────────────────────────────
        cur.execute(VERIFY_SQL, {
            "tenant_id":   tenant_id,
            "location_id": location_id,
        })
        row = cur.fetchone()
        if row:
            logger.info("── Gold Verification ──────────────────────")
            logger.info("  Total days:    %s", row[0])
            logger.info("  Date range:    %s → %s", row[1], row[2])
            logger.info("  Total revenue: $%s", row[3])
            logger.info("  Avg daily rev: $%s", row[4])
            logger.info("  Total orders:  %s", row[5])
            logger.info("  Total customers: %s", row[6])
            logger.info("───────────────────────────────────────────")

    except Exception as e:
        conn.rollback()
        logger.exception("❌ ETL failed: %s", e)
        sys.exit(1)
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora Silver → Gold ETL")
    parser.add_argument("--tenant-id",   required=True, help="Tenant UUID")
    parser.add_argument("--location-id", required=True, type=int, help="Location ID")
    parser.add_argument("--start",       default=None,  help="Start date YYYY-MM-DD")
    parser.add_argument("--end",         default=None,  help="End date YYYY-MM-DD")
    args = parser.parse_args()

    run_etl(
        tenant_id=args.tenant_id,
        location_id=args.location_id,
        start=args.start,
        end=args.end,
    )
