"""
Valora AI — fact_order → raw_restaurant_daily ETL
Aggregates real-time POS orders into the daily summary table
that feeds all dashboard views.
"""
from __future__ import annotations
import argparse
import logging
import os
from datetime import date
import psycopg2
from dotenv import load_dotenv

load_dotenv(".env.local")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run_etl(*, tenant_id: str, location_id: int, start: str, end: str):
    db_url = os.environ["DATABASE_URL"].replace("postgresql+psycopg2", "postgresql")
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    logger.info("Starting fact_order → raw_restaurant_daily ETL")
    logger.info("  tenant_id:   %s", tenant_id)
    logger.info("  location_id: %s", location_id)
    logger.info("  range:       %s → %s", start, end)

    try:
        cur.execute("""
            INSERT INTO restaurant.raw_restaurant_daily (
                row_id,
                tenant_id,
                location_id,
                location_id_bigint,
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
                source_file,
                created_at
            )
            SELECT
                gen_random_uuid(),
                fo.tenant_id,
                fo.location_id::text,
                fo.location_id,
                COALESCE(dl.location_name, 'Unknown'),
                fo.order_date                               AS day,
                SUM(fo.net_sales)                           AS revenue,
                SUM(fo.net_sales) * 0.30                    AS cogs,
                SUM(fo.net_sales) * 0.30                    AS labor,
                SUM(fo.net_sales) * 0.15                    AS fixed_costs,
                SUM(fo.net_sales) * 0.02                    AS marketing_spend,
                SUM(fo.net_sales) * 0.01                    AS interest_expense,
                COUNT(*)                                    AS orders,
                SUM(fo.customer_count)                      AS customers,
                0                                           AS new_customers,
                0                                           AS avg_inventory,
                0                                           AS ar_balance,
                0                                           AS ap_balance,
                SUM(fo.net_sales) * 0.42                    AS ebit,
                'fact_order_etl'                            AS source_file,
                NOW()
            FROM restaurant.fact_order fo
            LEFT JOIN restaurant.dim_location dl
                ON dl.tenant_id = fo.tenant_id
                AND dl.location_id = fo.location_id
            WHERE fo.tenant_id = %(tenant_id)s::uuid
              AND fo.location_id = %(location_id)s
              AND fo.order_date >= %(start)s::date
              AND fo.order_date <= %(end)s::date
            GROUP BY fo.tenant_id, fo.location_id, fo.order_date, dl.location_name
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
                ebit             = EXCLUDED.ebit,
                source_file      = EXCLUDED.source_file,
                created_at       = NOW()
        """, {"tenant_id": tenant_id, "location_id": location_id,
              "start": start, "end": end})

        rows = cur.rowcount
        logger.info("raw_restaurant_daily: %s rows upserted", rows)
        conn.commit()

        # Verify
        cur.execute("""
            SELECT MIN(day), MAX(day), COUNT(*)
            FROM restaurant.raw_restaurant_daily
            WHERE tenant_id = %(tenant_id)s::uuid
            AND location_id_bigint = %(location_id)s
        """, {"tenant_id": tenant_id, "location_id": location_id})
        r = cur.fetchone()
        logger.info("Verification: %s → %s | %s days total", r[0], r[1], r[2])

    except Exception as e:
        conn.rollback()
        logger.error("ETL failed: %s", str(e))
        raise
    finally:
        cur.close()
        conn.close()


def run_features_etl(*, tenant_id: str, location_id: int, start: str, end: str):
    """Aggregate fact_order into f_location_daily_features for dashboard views."""
    db_url = os.environ["DATABASE_URL"].replace("postgresql+psycopg2", "postgresql")
    conn = psycopg2.connect(db_url)
    conn.autocommit = False
    cur = conn.cursor()

    logger.info("Starting fact_order → f_location_daily_features ETL")

    try:
        cur.execute("""
            INSERT INTO restaurant.f_location_daily_features (
                tenant_id, location_id, day, location_name,
                revenue, cogs, labor, fixed_costs, marketing_spend,
                interest_expense, orders, customers, new_customers,
                avg_inventory, ar_balance, ap_balance, ebit,
                gross_profit, gross_margin, food_cost_pct, labor_cost_pct,
                prime_cost, prime_cost_pct, aov, revenue_per_customer,
                contribution_margin, contribution_margin_pct,
                dio, ar_days, ap_days, cash_conversion_cycle,
                discount_pct, void_pct, refund_pct,
                waste_pct, waste_amount, stockout_count,
                labor_hours, overtime_hours, sales_per_labor_hour,
                day_of_week, week_of_year, month_of_year,
                is_weekend, is_holiday,
                sales_last_7d_avg, sales_last_14d_avg,
                gross_margin_last_7d_avg, food_cost_last_7d_avg,
                labor_cost_last_7d_avg, created_at
            )
            SELECT
                fo.tenant_id,
                fo.location_id,
                fo.order_date                               AS day,
                COALESCE(dl.location_name, 'Unknown')       AS location_name,
                SUM(fo.net_sales)                           AS revenue,
                SUM(fo.net_sales) * 0.30                    AS cogs,
                SUM(fo.net_sales) * 0.30                    AS labor,
                SUM(fo.net_sales) * 0.15                    AS fixed_costs,
                SUM(fo.net_sales) * 0.02                    AS marketing_spend,
                SUM(fo.net_sales) * 0.01                    AS interest_expense,
                COUNT(*)                                    AS orders,
                SUM(fo.customer_count)                      AS customers,
                0                                           AS new_customers,
                0                                           AS avg_inventory,
                0                                           AS ar_balance,
                0                                           AS ap_balance,
                SUM(fo.net_sales) * 0.42                    AS ebit,
                SUM(fo.net_sales) * 0.70                    AS gross_profit,
                0.70                                        AS gross_margin,
                0.30                                        AS food_cost_pct,
                0.30                                        AS labor_cost_pct,
                SUM(fo.net_sales) * 0.60                    AS prime_cost,
                0.60                                        AS prime_cost_pct,
                SUM(fo.net_sales) / NULLIF(COUNT(*), 0)     AS aov,
                SUM(fo.net_sales) / NULLIF(SUM(fo.customer_count), 0) AS revenue_per_customer,
                SUM(fo.net_sales) * 0.40                    AS contribution_margin,
                0.40                                        AS contribution_margin_pct,
                0                                           AS dio,
                0                                           AS ar_days,
                0                                           AS ap_days,
                0                                           AS cash_conversion_cycle,
                0                                           AS discount_pct,
                0                                           AS void_pct,
                0                                           AS refund_pct,
                0                                           AS waste_pct,
                0                                           AS waste_amount,
                0                                           AS stockout_count,
                0                                           AS labor_hours,
                0                                           AS overtime_hours,
                0                                           AS sales_per_labor_hour,
                EXTRACT(DOW FROM fo.order_date)             AS day_of_week,
                EXTRACT(WEEK FROM fo.order_date)            AS week_of_year,
                EXTRACT(MONTH FROM fo.order_date)           AS month_of_year,
                CASE WHEN EXTRACT(DOW FROM fo.order_date) IN (0,6) THEN true ELSE false END AS is_weekend,
                false                                       AS is_holiday,
                AVG(SUM(fo.net_sales)) OVER (
                    ORDER BY fo.order_date
                    ROWS BETWEEN 6 PRECEDING AND CURRENT ROW
                )                                           AS sales_last_7d_avg,
                AVG(SUM(fo.net_sales)) OVER (
                    ORDER BY fo.order_date
                    ROWS BETWEEN 13 PRECEDING AND CURRENT ROW
                )                                           AS sales_last_14d_avg,
                0.70                                        AS gross_margin_last_7d_avg,
                0.30                                        AS food_cost_last_7d_avg,
                0.30                                        AS labor_cost_last_7d_avg,
                NOW()
            FROM restaurant.fact_order fo
            LEFT JOIN restaurant.dim_location dl
                ON dl.tenant_id = fo.tenant_id
                AND dl.location_id = fo.location_id
            WHERE fo.tenant_id = %(tenant_id)s::uuid
              AND fo.location_id = %(location_id)s
              AND fo.order_date >= %(start)s::date
              AND fo.order_date <= %(end)s::date
            GROUP BY fo.tenant_id, fo.location_id, fo.order_date, dl.location_name
            ON CONFLICT (tenant_id, location_id, day)
            DO UPDATE SET
                revenue          = EXCLUDED.revenue,
                cogs             = EXCLUDED.cogs,
                labor            = EXCLUDED.labor,
                gross_profit     = EXCLUDED.gross_profit,
                gross_margin     = EXCLUDED.gross_margin,
                orders           = EXCLUDED.orders,
                customers        = EXCLUDED.customers,
                aov              = EXCLUDED.aov,
                ebit             = EXCLUDED.ebit,
                created_at       = NOW()
        """, {"tenant_id": tenant_id, "location_id": location_id,
              "start": start, "end": end})

        rows = cur.rowcount
        logger.info("f_location_daily_features: %s rows upserted", rows)
        conn.commit()

        cur.execute("""
            SELECT MIN(day), MAX(day), COUNT(*)
            FROM restaurant.f_location_daily_features
            WHERE tenant_id = %(tenant_id)s::uuid AND location_id = %(location_id)s
        """, {"tenant_id": tenant_id, "location_id": location_id})
        r = cur.fetchone()
        logger.info("Verification: %s → %s | %s days", r[0], r[1], r[2])

    except Exception as e:
        conn.rollback()
        logger.error("Features ETL failed: %s", str(e))
        raise
    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora fact_order → raw_restaurant_daily ETL")
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--location-id", type=int, required=True)
    parser.add_argument("--start", default=str(date.today()))
    parser.add_argument("--end", default=str(date.today()))
    args = parser.parse_args()
    run_etl(tenant_id=args.tenant_id, location_id=args.location_id,
            start=args.start, end=args.end)
    run_features_etl(tenant_id=args.tenant_id, location_id=args.location_id,
            start=args.start, end=args.end)


