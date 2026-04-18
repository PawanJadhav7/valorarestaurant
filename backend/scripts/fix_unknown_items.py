"""
Valora AI — Fix Unknown Item
Populates fact_order_item.menu_item_id by matching on item_name
from pos_order_item since external_item_id is null in sandbox.
"""
from __future__ import annotations
import os
import logging
import argparse
import psycopg2
from dotenv import load_dotenv

load_dotenv(".env.local")
logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger(__name__)


def run(*, tenant_id: str, location_id: int):
    url = os.environ["DATABASE_URL"].replace("postgresql+psycopg2", "postgresql")
    conn = psycopg2.connect(url)
    conn.autocommit = False
    cur = conn.cursor()

    try:
        # Step 1: Upsert dim_menu_item using item_name as key
        cur.execute("""
            INSERT INTO restaurant.dim_menu_item (
                tenant_id, location_id, provider, provider_item_id,
                item_name, category, created_at
            )
            SELECT DISTINCT ON (poi.tenant_id, poi.location_id, po.provider, poi.item_name)
                poi.tenant_id,
                poi.location_id,
                po.provider,
                poi.provider_line_id,
                poi.item_name,
                COALESCE(poi.category, 'Uncategorized'),
                NOW()
            FROM restaurant.pos_order_item poi
            JOIN restaurant.pos_order po ON po.pos_order_id = poi.pos_order_id
            WHERE poi.tenant_id = %(tenant_id)s::uuid
              AND poi.location_id = %(location_id)s
              AND poi.item_name IS NOT NULL
            ON CONFLICT (tenant_id, location_id, provider, provider_item_id)
            WHERE provider IS NOT NULL AND provider_item_id IS NOT NULL
            DO UPDATE SET
                item_name = EXCLUDED.item_name,
                category  = EXCLUDED.category
        """, {"tenant_id": tenant_id, "location_id": location_id})
        logger.info("dim_menu_item: %s rows upserted", cur.rowcount)

        # Step 2: Update fact_order_item.menu_item_id by matching item_name
        cur.execute("""
            UPDATE restaurant.fact_order_item foi
            SET menu_item_id = dmi.menu_item_id
            FROM restaurant.pos_order_item poi
            JOIN restaurant.pos_order po ON po.pos_order_id = poi.pos_order_id
            JOIN restaurant.fact_order fo
                ON fo.tenant_id = po.tenant_id
                AND fo.provider = po.provider
                AND fo.provider_order_id = po.provider_order_id
            JOIN restaurant.dim_menu_item dmi
                ON dmi.tenant_id = poi.tenant_id
                AND dmi.location_id = poi.location_id
                AND dmi.item_name = poi.item_name
            WHERE foi.order_id = fo.order_id
              AND foi.provider_line_id = poi.provider_line_id
              AND foi.tenant_id = %(tenant_id)s::uuid
              AND foi.location_id = %(location_id)s
              AND foi.menu_item_id IS NULL
        """, {"tenant_id": tenant_id, "location_id": location_id})
        updated = cur.rowcount
        logger.info("fact_order_item: %s rows updated with menu_item_id", updated)

        conn.commit()

        # Verify
        cur.execute("""
            SELECT COUNT(*) as total,
                   COUNT(menu_item_id) as with_id,
                   COUNT(*) - COUNT(menu_item_id) as still_missing
            FROM restaurant.fact_order_item
            WHERE tenant_id = %(tenant_id)s::uuid
              AND location_id = %(location_id)s
        """, {"tenant_id": tenant_id, "location_id": location_id})
        r = cur.fetchone()
        logger.info("Verification — total=%s with_id=%s still_missing=%s", r[0], r[1], r[2])

    except Exception as e:
        conn.rollback()
        logger.error("Failed: %s", str(e))
        raise
    finally:
        cur.close()
        conn.close()


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--tenant-id", required=True)
    parser.add_argument("--location-id", type=int, required=True)
    args = parser.parse_args()
    run(tenant_id=args.tenant_id, location_id=args.location_id)
