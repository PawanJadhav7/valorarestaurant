"""
Valora AI — Historical Data Generator (Bronze Layer Only)
=========================================================
Generates realistic historical POS data into Bronze layer only.
ETL from Bronze → Silver is handled separately.

Bronze → restaurant.pos_raw_event (raw JSON blobs)

Run one quarter at a time per merchant:
    python generate_historical.py --start 2025-10-01 --end 2025-12-31 --tenant-id <uuid>

All 200 steps documented in historical_generation_steps.md
"""

from __future__ import annotations

import argparse
import hashlib
import json
import logging
import os
import random
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from enum import Enum

import psycopg2
import psycopg2.extras
from dotenv import load_dotenv

load_dotenv(".env.local")
load_dotenv(".env")

logging.basicConfig(
    level=logging.INFO,
    format="[%(asctime)s] %(levelname)s %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

DATABASE_URL = os.getenv("DATABASE_URL", "").replace("postgresql+psycopg2://", "postgresql://")


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class DayType(Enum):
    CLOSED        = "closed"
    REDUCED       = "reduced"
    FULL          = "full"
    FULL_EXTENDED = "full_extended"


# ─────────────────────────────────────────────
# SCHEDULES
# ─────────────────────────────────────────────

SCHEDULES = {
    "italian": {
        "closed_weekdays":      {0},
        "reduced_weekdays":     {1},
        "reduced_hours":        (17, 22),
        "full_hours":           (11, 22),
        "summer_hours":         (11, 23),
        "winter_hours":         (11, 21),
        "closed_holidays":      {(12, 25), (11, 28)},
        "base_daily_orders":    90,
        "reduced_daily_orders": 40,
    },
    "american": {
        "closed_weekdays":      set(),
        "reduced_weekdays":     {0, 1},
        "reduced_hours":        (11, 21),
        "full_hours":           (10, 23),
        "summer_hours":         (10, 24),
        "winter_hours":         (10, 22),
        "closed_holidays":      {(12, 25)},
        "base_daily_orders":    100,
        "reduced_daily_orders": 45,
    },
    "mexican": {
        "closed_weekdays":      {1},
        "reduced_weekdays":     {2},
        "reduced_hours":        (16, 21),
        "full_hours":           (11, 23),
        "summer_hours":         (11, 24),
        "winter_hours":         (11, 22),
        "closed_holidays":      {(12, 25), (1, 1)},
        "base_daily_orders":    85,
        "reduced_daily_orders": 35,
    },
    "asian": {
        "closed_weekdays":      {2},
        "reduced_weekdays":     {0},
        "reduced_hours":        (17, 22),
        "full_hours":           (11, 23),
        "summer_hours":         (11, 23),
        "winter_hours":         (11, 22),
        "closed_holidays":      {(12, 25), (1, 1)},
        "base_daily_orders":    95,
        "reduced_daily_orders": 42,
    },
    "default": {
        "closed_weekdays":      {0},
        "reduced_weekdays":     {1},
        "reduced_hours":        (16, 22),
        "full_hours":           (11, 22),
        "summer_hours":         (11, 23),
        "winter_hours":         (11, 21),
        "closed_holidays":      {(12, 25)},
        "base_daily_orders":    80,
        "reduced_daily_orders": 35,
    },
}

CUISINE_MAP = {
    "bella napoli":              "italian",
    "casa del sol":              "mexican",
    "sakura ramen":              "asian",
    "the copper kettle":         "american",
    "the green plate":           "american",
    "blue lantern noodle house": "asian",
    "the gilded fork":           "american",
    "casa fuego":                "mexican",
    "maple street bistro":       "american",
    "the harbor grille":         "american",
}

MENUS = {
    "italian": [
        {"name": "Margherita Pizza",    "price": 14.00, "category": "Mains"},
        {"name": "Spaghetti Carbonara", "price": 16.00, "category": "Mains"},
        {"name": "Tiramisu",            "price": 8.00,  "category": "Desserts"},
        {"name": "Caesar Salad",        "price": 11.00, "category": "Salads"},
        {"name": "Bruschetta",          "price": 9.00,  "category": "Starters"},
        {"name": "Espresso",            "price": 4.00,  "category": "Drinks"},
        {"name": "Chianti Wine",        "price": 12.00, "category": "Drinks"},
        {"name": "Penne Arrabbiata",    "price": 15.00, "category": "Mains"},
        {"name": "Gelato",              "price": 6.00,  "category": "Desserts"},
        {"name": "Sparkling Water",     "price": 3.00,  "category": "Drinks"},
    ],
    "american": [
        {"name": "Classic Burger",      "price": 15.00, "category": "Mains"},
        {"name": "BBQ Ribs",            "price": 22.00, "category": "Mains"},
        {"name": "Mac & Cheese",        "price": 12.00, "category": "Sides"},
        {"name": "Apple Pie",           "price": 7.00,  "category": "Desserts"},
        {"name": "Clam Chowder",        "price": 10.00, "category": "Soups"},
        {"name": "Craft Beer",          "price": 7.00,  "category": "Drinks"},
        {"name": "Lemonade",            "price": 4.00,  "category": "Drinks"},
        {"name": "Fish & Chips",        "price": 18.00, "category": "Mains"},
        {"name": "Onion Rings",         "price": 8.00,  "category": "Sides"},
        {"name": "Cheesecake",          "price": 8.00,  "category": "Desserts"},
    ],
    "asian": [
        {"name": "Tonkotsu Ramen",      "price": 16.00, "category": "Mains"},
        {"name": "Gyoza",               "price": 9.00,  "category": "Starters"},
        {"name": "Spicy Tuna Roll",     "price": 14.00, "category": "Sushi"},
        {"name": "Miso Soup",           "price": 5.00,  "category": "Soups"},
        {"name": "Matcha Ice Cream",    "price": 7.00,  "category": "Desserts"},
        {"name": "Green Tea",           "price": 4.00,  "category": "Drinks"},
        {"name": "Sake",                "price": 9.00,  "category": "Drinks"},
        {"name": "Chicken Teriyaki",    "price": 17.00, "category": "Mains"},
        {"name": "Edamame",             "price": 6.00,  "category": "Starters"},
        {"name": "Bubble Tea",          "price": 6.00,  "category": "Drinks"},
    ],
    "mexican": [
        {"name": "Beef Tacos",          "price": 13.00, "category": "Mains"},
        {"name": "Chicken Burrito",     "price": 14.00, "category": "Mains"},
        {"name": "Guacamole",           "price": 8.00,  "category": "Starters"},
        {"name": "Churros",             "price": 7.00,  "category": "Desserts"},
        {"name": "Tortilla Soup",       "price": 9.00,  "category": "Soups"},
        {"name": "Margarita",           "price": 11.00, "category": "Drinks"},
        {"name": "Horchata",            "price": 5.00,  "category": "Drinks"},
        {"name": "Quesadilla",          "price": 12.00, "category": "Mains"},
        {"name": "Nachos",              "price": 10.00, "category": "Starters"},
        {"name": "Flan",                "price": 7.00,  "category": "Desserts"},
    ],
    "default": [
        {"name": "Grilled Salmon",      "price": 20.00, "category": "Mains"},
        {"name": "House Salad",         "price": 10.00, "category": "Salads"},
        {"name": "Chocolate Cake",      "price": 8.00,  "category": "Desserts"},
        {"name": "Soup of the Day",     "price": 9.00,  "category": "Soups"},
        {"name": "Coffee",              "price": 4.00,  "category": "Drinks"},
        {"name": "Orange Juice",        "price": 5.00,  "category": "Drinks"},
        {"name": "Steak",               "price": 28.00, "category": "Mains"},
        {"name": "Pasta",               "price": 15.00, "category": "Mains"},
        {"name": "Cheesecake",          "price": 8.00,  "category": "Desserts"},
        {"name": "Sparkling Water",     "price": 3.00,  "category": "Drinks"},
    ],
}

PAYMENT_METHODS = ["CREDIT_CARD", "DEBIT_CARD", "CASH", "GIFT_CARD"]
MAJOR_HOLIDAYS  = {(1,1),(7,4),(11,28),(11,29),(12,24),(12,25),(12,31)}


# ─────────────────────────────────────────────
# SCHEDULE HELPERS
# ─────────────────────────────────────────────

def get_cuisine(location_name: str) -> str:
    name_lower = location_name.lower()
    for key, cuisine in CUISINE_MAP.items():
        if key in name_lower:
            return cuisine
    return "default"


def get_day_type(dt: date, schedule: dict) -> DayType:
    weekday   = dt.weekday()
    month_day = (dt.month, dt.day)
    if month_day in schedule["closed_holidays"]: return DayType.CLOSED
    if weekday in schedule["closed_weekdays"]:   return DayType.CLOSED
    if weekday in schedule["reduced_weekdays"]:  return DayType.REDUCED
    if dt.month in (6, 7, 8) and weekday in (4, 5): return DayType.FULL_EXTENDED
    return DayType.FULL


def get_open_hours(dt: date, schedule: dict, day_type: DayType) -> tuple[int, int]:
    if day_type == DayType.CLOSED:       return (0, 0)
    if day_type == DayType.REDUCED:      return schedule["reduced_hours"]
    if day_type == DayType.FULL_EXTENDED: return schedule["summer_hours"]
    month = dt.month
    if month in (6, 7, 8):   return schedule["summer_hours"]
    if month in (12, 1, 2):  return schedule["winter_hours"]
    return schedule["full_hours"]


def get_hourly_orders(
    hour: int,
    open_hour: int,
    close_hour: int,
    base_daily: int,
    dt: date,
    years_ago: int,
) -> int:
    if hour < open_hour or hour >= close_hour:
        return 0

    hourly_weights = {
        6: 0.03,  7: 0.05,  8: 0.06,  9: 0.04,
        10: 0.04, 11: 0.10, 12: 0.14, 13: 0.12, 14: 0.06,
        15: 0.03, 16: 0.04,
        17: 0.08, 18: 0.13, 19: 0.14, 20: 0.11,
        21: 0.06, 22: 0.03, 23: 0.01,
    }

    weight = hourly_weights.get(hour, 0.02)
    base   = base_daily * weight

    if dt.weekday() >= 5:               base *= 1.5
    if (dt.month, dt.day) in MAJOR_HOLIDAYS: base *= 1.8

    growth = 1.05 ** (5 - years_ago)
    base  *= growth

    return max(0, int(base + random.gauss(0, base * 0.15)))


# ─────────────────────────────────────────────
# ORDER GENERATOR
# ─────────────────────────────────────────────

def generate_order(conn: dict, order_dt: datetime, menu: list[dict]) -> dict:
    num_items    = random.choices([1, 2, 3, 4, 5], weights=[15, 35, 30, 15, 5])[0]
    chosen_items = random.choices(menu, k=num_items)

    items    = []
    subtotal = Decimal("0")
    for item in chosen_items:
        qty        = random.choices([1, 2, 3], weights=[70, 25, 5])[0]
        unit_price = round(
            Decimal(str(item["price"])) * Decimal(str(random.uniform(0.95, 1.05))), 2
        )
        line_rev  = unit_price * qty
        subtotal += line_rev
        items.append({
            "name":          item["name"],
            "category":      item["category"],
            "quantity":      qty,
            "unit_price":    float(unit_price),
            "line_revenue":  float(line_rev),
            "line_discount": 0.0,
        })

    discount = Decimal("0")
    if random.random() > 0.8:
        discount = round(subtotal * Decimal("0.10"), 2)

    net_sales = subtotal - discount
    tax       = round(net_sales * Decimal("0.08"), 2)
    tip       = Decimal("0")
    if random.random() > 0.6:
        tip = round(net_sales * Decimal(str(random.choice([0.15, 0.18, 0.20]))), 2)

    gross_sales    = net_sales + tax + tip
    payment_method = random.choices(PAYMENT_METHODS, weights=[55, 25, 15, 5])[0]

    return {
        "provider_order_id": f"hist_{conn['provider']}_{uuid.uuid4().hex[:16]}",
        "order_dt":          order_dt,
        "order_date":        order_dt.date(),
        "gross_sales":       float(gross_sales),
        "discount_amount":   float(discount),
        "net_sales":         float(net_sales),
        "tax_amount":        float(tax),
        "tip_amount":        float(tip),
        "service_charge":    0.0,
        "customer_count":    random.randint(1, 6),
        "items":             items,
        "payment_method":    payment_method,
        "payment_amount":    float(gross_sales),
    }


# ─────────────────────────────────────────────
# BRONZE PAYLOAD BUILDER
# ─────────────────────────────────────────────

def build_raw_payload(conn: dict, order: dict) -> dict:
    """Build canonical raw JSON payload for Bronze layer."""
    return {
        "provider":               conn["provider"],
        "provider_order_id":      order["provider_order_id"],
        "external_location_id":   conn["external_location_id"],
        "order_ts":               order["order_dt"].isoformat(),
        "order_date":             order["order_date"].isoformat(),
        "order_channel":          "in_store",
        "order_status":           "completed",
        "gross_sales":            str(order["gross_sales"]),
        "discount_amount":        str(order["discount_amount"]),
        "net_sales":              str(order["net_sales"]),
        "tax_amount":             str(order["tax_amount"]),
        "tip_amount":             str(order["tip_amount"]),
        "service_charge_amount":  str(order["service_charge"]),
        "customer_count":         order["customer_count"],
        "currency_code_pos":      "USD",
        "customer_external_id":   None,
        "opened_at_utc":          order["order_dt"].isoformat(),
        "closed_at_utc":          (
            order["order_dt"] + timedelta(minutes=random.randint(15, 90))
        ).isoformat(),
        "provider_updated_at_utc": order["order_dt"].isoformat(),
        "items": [
            {
                "name":          i["name"],
                "category":      i["category"],
                "quantity":      i["quantity"],
                "unit_price":    i["unit_price"],
                "line_revenue":  i["line_revenue"],
                "line_discount": i["line_discount"],
            }
            for i in order["items"]
        ],
        "payments": [{
            "payment_method": order["payment_method"],
            "amount":         order["payment_amount"],
            "status":         "captured",
        }],
        "discounts": [],
        "refunds":   [],
    }


# ─────────────────────────────────────────────
# BRONZE INSERT (ONLY)
# ─────────────────────────────────────────────

def insert_bronze_batch(db, batch: list[dict]) -> int:
    """
    Insert batch into Bronze layer ONLY.
    Silver ETL is handled separately.
    Returns count of inserted records.
    """
    inserted = 0
    with db.cursor() as cur:
        for item in batch:
            payload_str  = json.dumps(item["payload"], sort_keys=True)
            payload_hash = hashlib.sha256(payload_str.encode()).hexdigest()

            try:
                cur.execute("SAVEPOINT sp_bronze")
                cur.execute("""
                    INSERT INTO restaurant.pos_raw_event (
                        tenant_id, location_id, provider,
                        event_source, event_type,
                        provider_object_id,
                        payload_json, payload_hash,
                        status, received_at, processed_at
                    )
                    VALUES (
                        CAST(%s AS uuid), %s, %s,
                        'backfill', 'order.completed',
                        %s,
                        %s::jsonb, %s,
                        'new', %s, NULL
                    )
                    ON CONFLICT (tenant_id, location_id, provider, payload_hash)
                    DO NOTHING
                    RETURNING raw_event_id
                """, (
                    item["tenant_id"],
                    item["location_id"],
                    item["provider"],
                    item["provider_order_id"],
                    payload_str,
                    payload_hash,
                    item["order_dt"],
                ))
                row = cur.fetchone()
                cur.execute("RELEASE SAVEPOINT sp_bronze")
                if row:
                    inserted += 1

            except Exception as e:
                try:
                    cur.execute("ROLLBACK TO SAVEPOINT sp_bronze")
                    cur.execute("RELEASE SAVEPOINT sp_bronze")
                except Exception:
                    pass
                logger.error("Bronze insert failed: %s", e)

    return inserted


# ─────────────────────────────────────────────
# DB HELPERS
# ─────────────────────────────────────────────

def new_connection():
    db = psycopg2.connect(DATABASE_URL)
    db.autocommit = False
    return db


def ensure_connection(db):
    try:
        db.cursor().execute("SELECT 1")
        return db
    except Exception:
        logger.warning("DB connection lost — reconnecting...")
        try:
            db.close()
        except Exception:
            pass
        return new_connection()


def flush_batch(db, batch: list[dict]) -> tuple[int, object]:
    """Flush bronze batch with retry on connection failure."""
    max_retries = 3
    for attempt in range(max_retries):
        try:
            db       = ensure_connection(db)
            inserted = insert_bronze_batch(db, batch)
            db.commit()
            return inserted, db
        except Exception as e:
            logger.warning("Flush attempt %d failed: %s — reconnecting...", attempt + 1, e)
            try:
                db.rollback()
            except Exception:
                pass
            try:
                db.close()
            except Exception:
                pass
            db = new_connection()
            if attempt == max_retries - 1:
                raise
    return 0, db


# ─────────────────────────────────────────────
# MAIN GENERATOR
# ─────────────────────────────────────────────

def generate_historical(
    start_date: date,
    end_date: date,
    batch_size: int = 50,
    tenant_filter: str | None = None,
):
    q      = (start_date.month - 1) // 3 + 1
    label  = f"Q{q} {start_date.year} ({start_date} → {end_date})"
    days   = (end_date - start_date).days + 1

    logger.info("=" * 60)
    logger.info("BRONZE GENERATOR — %s", label)
    logger.info("Days: %d | Batch size: %d | Layer: Bronze only", days, batch_size)
    logger.info("Silver ETL will run separately after Bronze is complete.")
    logger.info("=" * 60)

    db = new_connection()

    try:
        with db.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    pc.tenant_id::text,
                    pc.location_id,
                    pc.provider,
                    pc.external_merchant_id,
                    pc.external_location_id,
                    dl.location_name
                FROM restaurant.pos_connection pc
                JOIN restaurant.dim_location dl
                    ON dl.location_id = pc.location_id
                    AND dl.tenant_id  = pc.tenant_id
                WHERE pc.status = 'active'
                  AND pc.provider IN ('square', 'clover')
                ORDER BY pc.provider, dl.location_name
            """)
            connections = [dict(r) for r in cur.fetchall()]

        if tenant_filter:
            connections = [c for c in connections if c["tenant_id"] == tenant_filter]

        logger.info("Found %d connection(s) to process", len(connections))

        total_inserted = 0

        for conn in connections:
            cuisine  = get_cuisine(conn["location_name"])
            schedule = SCHEDULES[cuisine]
            menu     = MENUS[cuisine]

            logger.info("─" * 50)
            logger.info(
                "Processing: %s (%s) [%s]",
                conn["location_name"], conn["provider"], cuisine
            )

            current_date = start_date
            conn_inserted = 0
            batch         = []
            closed_days   = 0
            open_days     = 0
            batches_done  = 0

            while current_date <= end_date:
                day_type  = get_day_type(current_date, schedule)
                years_ago = datetime.now().year - current_date.year

                if day_type == DayType.CLOSED:
                    closed_days  += 1
                    current_date += timedelta(days=1)
                    continue

                open_days += 1
                open_hour, close_hour = get_open_hours(current_date, schedule, day_type)
                base_orders = (
                    schedule["reduced_daily_orders"]
                    if day_type == DayType.REDUCED
                    else schedule["base_daily_orders"]
                )

                for hour in range(open_hour, close_hour):
                    count = get_hourly_orders(
                        hour, open_hour, close_hour,
                        base_orders, current_date, years_ago
                    )
                    for _ in range(count):
                        order_dt = datetime(
                            current_date.year, current_date.month,
                            current_date.day, hour,
                            random.randint(0, 59),
                            random.randint(0, 59),
                            tzinfo=timezone.utc,
                        )
                        order   = generate_order(conn, order_dt, menu)
                        payload = build_raw_payload(conn, order)

                        batch.append({
                            "tenant_id":         conn["tenant_id"],
                            "location_id":       conn["location_id"],
                            "provider":          conn["provider"],
                            "provider_order_id": order["provider_order_id"],
                            "order_dt":          order_dt,
                            "payload":           payload,
                        })

                    # Flush when batch is full
                    if len(batch) >= batch_size:
                        n, db      = flush_batch(db, batch)
                        conn_inserted += n
                        batches_done  += 1
                        batch          = []

                current_date += timedelta(days=1)

            # Flush remaining
            if batch:
                n, db          = flush_batch(db, batch)
                conn_inserted += n
                batches_done  += 1

            total_inserted += conn_inserted

            logger.info(
                "✅ %s → Open: %d | Closed: %d | Bronze inserted: %d | Batches: %d",
                conn["location_name"],
                open_days, closed_days,
                conn_inserted, batches_done,
            )

        logger.info("=" * 60)
        logger.info("BRONZE COMPLETE — %s", label)
        logger.info("  Total Bronze records inserted: %d", total_inserted)
        logger.info("  Next: Run ETL to process Bronze → Silver")
        logger.info("=" * 60)

    except Exception as e:
        try:
            db.rollback()
        except Exception:
            pass
        logger.error("Generation failed: %s", e)
        raise
    finally:
        try:
            db.close()
        except Exception:
            pass


# ─────────────────────────────────────────────
# ENTRY POINT
# ─────────────────────────────────────────────

if __name__ == "__main__":
    parser = argparse.ArgumentParser(
        description="Valora Bronze Historical Data Generator"
    )
    parser.add_argument("--start",      type=str, required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end",        type=str, required=True, help="End date YYYY-MM-DD")
    parser.add_argument("--batch-size", type=int, default=50,    help="Batch size (default: 50)")
    parser.add_argument("--tenant-id",  type=str, default=None,  help="Specific tenant only")

    args = parser.parse_args()

    start = date.fromisoformat(args.start)
    end   = date.fromisoformat(args.end)

    if start > end:
        raise ValueError(f"--start {start} must be before --end {end}")

    generate_historical(
        start_date=start,
        end_date=end,
        batch_size=args.batch_size,
        tenant_filter=args.tenant_id,
    )