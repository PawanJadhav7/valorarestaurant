"""
Valora AI — pos_order → fact_order ETL
Promotes real POS orders from Silver (pos_order) to Gold (fact_order/fact_order_item/fact_order_payment)
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

    logger.info("Starting pos_order → fact_order ETL")
    logger.info("  tenant_id:   %s", tenant_id)
    logger.info("  location_id: %s", location_id)
    logger.info("  range:       %s → %s", start, end)

    try:
        # ── Step 1: pos_order → fact_order ──────────────────────────────
        cur.execute("""
            INSERT INTO restaurant.fact_order (
                tenant_id, location_id, provider, provider_order_id,
                external_location_id, pos_connection_id, raw_event_id,
                order_ts, order_date, order_channel, order_status,
                gross_sales, discount_amount, net_sales,
                tax_amount, tip_amount, service_charge_amount,
                customer_count, currency_code_pos,
                opened_at_utc, closed_at_utc,
                provider_updated_at_utc, customer_external_id,
                created_at
            )
            SELECT
                po.tenant_id,
                po.location_id,
                po.provider,
                po.provider_order_id,
                pc.external_location_id,
                pc.pos_connection_id,
                NULL AS raw_event_id,
                po.order_ts,
                po.order_date,
                po.order_channel,
                po.order_status,
                po.gross_sales,
                po.discount_amount,
                po.net_sales,
                po.tax_amount,
                po.tip_amount,
                po.service_charge_amount,
                po.customer_count,
                po.currency_code,
                po.opened_at_utc,
                po.closed_at_utc,
                po.provider_updated_at_utc,
                po.customer_external_id,
                NOW()
            FROM restaurant.pos_order po
            LEFT JOIN restaurant.pos_connection pc
                ON pc.tenant_id = po.tenant_id
                AND pc.location_id = po.location_id
                AND pc.provider = po.provider
            WHERE po.tenant_id = %(tenant_id)s::uuid
              AND po.location_id = %(location_id)s
              AND po.order_date >= %(start)s::date
              AND po.order_date <= %(end)s::date
            ON CONFLICT ON CONSTRAINT fact_order_provider_order_unique
            DO UPDATE SET
                order_status             = EXCLUDED.order_status,
                gross_sales              = EXCLUDED.gross_sales,
                discount_amount          = EXCLUDED.discount_amount,
                net_sales                = EXCLUDED.net_sales,
                tax_amount               = EXCLUDED.tax_amount,
                tip_amount               = EXCLUDED.tip_amount,
                service_charge_amount    = EXCLUDED.service_charge_amount,
                customer_count           = EXCLUDED.customer_count,
                closed_at_utc            = EXCLUDED.closed_at_utc,
                provider_updated_at_utc  = EXCLUDED.provider_updated_at_utc
        """, {"tenant_id": tenant_id, "location_id": location_id, "start": start, "end": end})
        orders_inserted = cur.rowcount
        logger.info("fact_order: %s rows upserted", orders_inserted)

        # ── Step 2a: upsert dim_menu_item ────────────────────────────────
        cur.execute("""
            INSERT INTO restaurant.dim_menu_item (
                tenant_id, location_id, provider, provider_item_id,
                item_name, category, created_at
            )
            SELECT DISTINCT ON (poi.tenant_id, poi.location_id, po.provider, poi.provider_item_id)
                poi.tenant_id,
                poi.location_id,
                po.provider,
                poi.provider_item_id,
                poi.item_name,
                poi.category,
                NOW()
            FROM restaurant.pos_order_item poi
            JOIN restaurant.pos_order po ON po.pos_order_id = poi.pos_order_id
            WHERE poi.tenant_id = %(tenant_id)s::uuid
              AND poi.location_id = %(location_id)s
              AND po.order_date >= %(start)s::date
              AND po.order_date <= %(end)s::date
              AND poi.provider_item_id IS NOT NULL
            ON CONFLICT (tenant_id, location_id, provider, provider_item_id)
            WHERE provider IS NOT NULL AND provider_item_id IS NOT NULL
            DO UPDATE SET item_name = EXCLUDED.item_name
        """, {"tenant_id": tenant_id, "location_id": location_id, "start": start, "end": end})
        logger.info("dim_menu_item: %s rows upserted", cur.rowcount)

        # ── Step 2b: pos_order_item → fact_order_item ────────────────────
        cur.execute("""
            INSERT INTO restaurant.fact_order_item (
                order_id, tenant_id, location_id,
                menu_item_id, provider_line_id, external_item_id,
                quantity, unit_price, line_discount, line_revenue,
                modifiers_json, created_at
            )
            SELECT
                fo.order_id,
                poi.tenant_id,
                poi.location_id,
                dmi.menu_item_id,
                poi.provider_line_id,
                poi.provider_item_id,
                poi.quantity,
                poi.unit_price,
                poi.line_discount,
                poi.line_revenue,
                poi.modifiers::jsonb,
                NOW()
            FROM restaurant.pos_order_item poi
            JOIN restaurant.pos_order po
                ON po.pos_order_id = poi.pos_order_id
            JOIN restaurant.fact_order fo
                ON fo.tenant_id = po.tenant_id
                AND fo.provider = po.provider
                AND fo.provider_order_id = po.provider_order_id
            LEFT JOIN restaurant.dim_menu_item dmi
                ON dmi.tenant_id = poi.tenant_id
                AND dmi.location_id = poi.location_id
                AND dmi.provider = po.provider
                AND dmi.provider_item_id = poi.provider_item_id
            WHERE poi.tenant_id = %(tenant_id)s::uuid
              AND poi.location_id = %(location_id)s
              AND po.order_date >= %(start)s::date
              AND po.order_date <= %(end)s::date
            ON CONFLICT DO NOTHING
        """, {"tenant_id": tenant_id, "location_id": location_id, "start": start, "end": end})
        items_inserted = cur.rowcount
        logger.info("fact_order_item: %s rows upserted", items_inserted)

        # ── Step 3: pos_order_payment → fact_order_payment ───────────────
        cur.execute("""
            INSERT INTO restaurant.fact_order_payment (
                order_id, tenant_id, location_id,
                provider, provider_payment_id,
                payment_method, amount, payment_status,
                created_at
            )
            SELECT
                fo.order_id,
                pop.tenant_id,
                pop.location_id,
                po.provider,
                pop.provider_payment_id,
                pop.payment_method,
                pop.amount,
                pop.payment_status,
                NOW()
            FROM restaurant.pos_order_payment pop
            JOIN restaurant.pos_order po
                ON po.pos_order_id = pop.pos_order_id
            JOIN restaurant.fact_order fo
                ON fo.tenant_id = po.tenant_id
                AND fo.provider = po.provider
                AND fo.provider_order_id = po.provider_order_id
            WHERE pop.tenant_id = %(tenant_id)s::uuid
              AND pop.location_id = %(location_id)s
              AND po.order_date >= %(start)s::date
              AND po.order_date <= %(end)s::date
            ON CONFLICT DO NOTHING
        """, {"tenant_id": tenant_id, "location_id": location_id, "start": start, "end": end})
        payments_inserted = cur.rowcount
        logger.info("fact_order_payment: %s rows upserted", payments_inserted)

        conn.commit()

        # ── Verification ─────────────────────────────────────────────────
        cur.execute("""
            SELECT COUNT(*), COALESCE(SUM(net_sales), 0), MIN(order_date), MAX(order_date)
            FROM restaurant.fact_order
            WHERE tenant_id = %(tenant_id)s::uuid
            AND location_id = %(location_id)s
        """, {"tenant_id": tenant_id, "location_id": location_id})
        r = cur.fetchone()
        logger.info("── Verification ──────────────────────────")
        logger.info("  Total orders:  %s", r[0])
        logger.info("  Total revenue: $%.2f", float(r[1]))
        logger.info("  Date range:    %s → %s", r[2], r[3])
        logger.info("──────────────────────────────────────────")

    except Exception as e:
        conn.rollback()
        logger.error("ETL failed: %s", str(e))
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora pos_order → fact_order ETL")
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--location-id", type=int, required=True)
    parser.add_argument("--start", default=str(date.today()))
    parser.add_argument("--end", default=str(date.today()))
    args = parser.parse_args()

    run_etl(
        tenant_id=args.tenant_id,
        location_id=args.location_id,
        start=args.start,
        end=args.end,
    )
