"""
Valora AI — Real-Time POS Order Simulator
==========================================
Simulates realistic restaurant orders for all active tenants
every 5 minutes via Square and Clover APIs.

Usage:
    python pos_realtime_simulator.py --run-once
    python pos_realtime_simulator.py --daemon
    python pos_realtime_simulator.py --provider square --run-once
"""

from __future__ import annotations

import argparse
import logging
import os
import random
import time
import uuid
from datetime import datetime, timezone
from typing import Any

import psycopg2
import psycopg2.extras
import requests
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
SQUARE_BASE   = os.getenv("SQUARE_OAUTH_BASE", "https://connect.squareupsandbox.com")
CLOVER_BASE   = os.getenv("CLOVER_API_BASE", "https://sandbox.dev.clover.com")
RENDER_URL    = os.getenv("RENDER_URL", "https://valorarestaurant.onrender.com")
INTERVAL_SECS = int(os.getenv("SIMULATOR_INTERVAL", "300"))

MENUS = {
    "italian": [
        {"name": "Margherita Pizza",    "price": 1400},
        {"name": "Spaghetti Carbonara", "price": 1600},
        {"name": "Tiramisu",            "price": 800},
        {"name": "Caesar Salad",        "price": 1100},
        {"name": "Bruschetta",          "price": 900},
        {"name": "Espresso",            "price": 400},
        {"name": "Chianti Wine",        "price": 1200},
    ],
    "american": [
        {"name": "Classic Burger",      "price": 1500},
        {"name": "BBQ Ribs",            "price": 2200},
        {"name": "Mac & Cheese",        "price": 1200},
        {"name": "Apple Pie",           "price": 700},
        {"name": "Clam Chowder",        "price": 1000},
        {"name": "Craft Beer",          "price": 700},
        {"name": "Lemonade",            "price": 400},
    ],
    "asian": [
        {"name": "Tonkotsu Ramen",      "price": 1600},
        {"name": "Gyoza",               "price": 900},
        {"name": "Spicy Tuna Roll",     "price": 1400},
        {"name": "Miso Soup",           "price": 500},
        {"name": "Matcha Ice Cream",    "price": 700},
        {"name": "Green Tea",           "price": 400},
        {"name": "Sake",                "price": 900},
    ],
    "mexican": [
        {"name": "Beef Tacos",          "price": 1300},
        {"name": "Chicken Burrito",     "price": 1400},
        {"name": "Guacamole",           "price": 800},
        {"name": "Churros",             "price": 700},
        {"name": "Tortilla Soup",       "price": 900},
        {"name": "Margarita",           "price": 1100},
        {"name": "Horchata",            "price": 500},
    ],
    "default": [
        {"name": "Grilled Salmon",      "price": 2000},
        {"name": "House Salad",         "price": 1000},
        {"name": "Chocolate Cake",      "price": 800},
        {"name": "Soup of the Day",     "price": 900},
        {"name": "Coffee",              "price": 400},
        {"name": "Orange Juice",        "price": 500},
    ],
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


def get_order_count_for_now() -> int:
    now     = datetime.now(timezone.utc)
    hour    = now.hour
    weekday = now.weekday()
    hourly_base = {
        0: 0, 1: 0, 2: 0, 3: 0, 4: 0, 5: 0,
        6: 1, 7: 2, 8: 3, 9: 2,
        10: 2, 11: 5, 12: 8, 13: 7, 14: 4,
        15: 2, 16: 2,
        17: 5, 18: 8, 19: 9, 20: 8,
        21: 6, 22: 3, 23: 1,
    }
    base = hourly_base.get(hour, 1)
    if weekday >= 5:
        base = int(base * 1.5)
    base = max(1, base + random.randint(-1, 2))
    return base


def get_db_connections() -> list[dict]:
    conn = psycopg2.connect(DATABASE_URL)
    try:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute("""
                SELECT
                    pc.pos_connection_id,
                    pc.tenant_id::text,
                    pc.location_id,
                    pc.provider,
                    pc.external_merchant_id,
                    pc.external_location_id,
                    pc.api_key,
                    dl.location_name
                FROM restaurant.pos_connection pc
                JOIN restaurant.dim_location dl
                    ON dl.location_id = pc.location_id
                    AND dl.tenant_id = pc.tenant_id
                WHERE pc.status = 'active'
                  AND pc.provider IN ('square', 'clover')
                  AND pc.api_key IS NOT NULL
                ORDER BY pc.provider, dl.location_name
            """)
            return [dict(row) for row in cur.fetchall()]
    finally:
        conn.close()


def get_menu(location_name: str) -> list[dict]:
    name_lower = location_name.lower()
    for key, cuisine in CUISINE_MAP.items():
        if key in name_lower:
            return MENUS[cuisine]
    return MENUS["default"]


def idempotency_key() -> str:
    return str(uuid.uuid4())


class SquareOrderCreator:
    def __init__(self, conn: dict) -> None:
        self.conn        = conn
        self.token       = conn["api_key"]
        self.location_id = conn["external_location_id"]
        self.name        = conn["location_name"]
        self.menu        = get_menu(self.name)
        self.headers     = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type":  "application/json",
            "Square-Version": "2024-01-17",
        }

    def create_order(self) -> dict | None:
        num_items = random.randint(1, 4)
        chosen_items = random.sample(self.menu, min(num_items, len(self.menu)))

        line_items = []
        for item in chosen_items:
            line_items.append({
                "name": item["name"],
                "quantity": str(random.randint(1, 3)),
                "base_price_money": {
                    "amount": item["price"],
                    "currency": "USD",
                },
            })

        # Discount applied at line item level not order level
        body = {
            "idempotency_key": idempotency_key(),
            "order": {
                "location_id": self.location_id,
                "line_items": line_items,
                # ← NO state field here
            },
        }

        # Add tax
        body["order"]["taxes"] = [{
            "uid": "sales-tax",
            "name": "Sales Tax",
            "percentage": "8",
            "scope": "ORDER",
        }]

        try:
            resp = requests.post(
                f"{SQUARE_BASE}/v2/orders",
                headers=self.headers,
                json=body,
                timeout=30,
            )
            resp.raise_for_status()
            order = resp.json()["order"]
            order_id = order["id"]
            total = order.get("total_money", {}).get("amount", 0)

            # Create payment to complete the order
            if total > 0:
                pay_resp = requests.post(
                    f"{SQUARE_BASE}/v2/payments",
                    headers=self.headers,
                    json={
                        "idempotency_key": idempotency_key(),
                        "source_id": "cnon:card-nonce-ok",
                        "amount_money": {"amount": total, "currency": "USD"},
                        "order_id": order_id,
                        "location_id": self.location_id,
                        "tip_money": {
                            "amount": random.choice([0, 200, 300, 500]),
                            "currency": "USD",
                        },
                    },
                    timeout=30,
                )
                pay_resp.raise_for_status()

            logger.info("✅ Square | %s | Order %s | $%.2f", self.name, order_id, total / 100)
            return order

        except Exception as e:
            logger.error("❌ Square | %s | Failed: %s", self.name, e)
            return None

    def create_orders(self, count: int) -> int:
        created = 0
        for _ in range(count):
            if self.create_order():
                created += 1
            time.sleep(0.5)
        return created


class CloverOrderCreator:
    def __init__(self, conn: dict) -> None:
        self.conn        = conn
        self.token       = conn["api_key"]
        self.merchant_id = conn["external_merchant_id"]
        self.name        = conn["location_name"]
        self.menu        = get_menu(self.name)
        self.headers     = {
            "Authorization": f"Bearer {self.token}",
            "Content-Type":  "application/json",
        }
        self._item_ids: list[dict] = []

    def _base_url(self, path: str) -> str:
        return f"{CLOVER_BASE}/v3/merchants/{self.merchant_id}{path}"

    def _get_or_create_items(self) -> list[dict]:
        if self._item_ids:
            return self._item_ids
        try:
            resp = requests.get(self._base_url("/items?limit=20"), headers=self.headers, timeout=30)
            resp.raise_for_status()
            existing = resp.json().get("elements", [])
            if existing:
                self._item_ids = [{"id": i["id"], "name": i["name"], "price": i.get("price", 1000)} for i in existing]
                return self._item_ids
            for item in self.menu:
                try:
                    r = requests.post(
                        self._base_url("/items"),
                        headers=self.headers,
                        json={"name": item["name"], "price": item["price"], "priceType": "FIXED"},
                        timeout=30,
                    )
                    r.raise_for_status()
                    created = r.json()
                    self._item_ids.append({"id": created["id"], "name": created["name"], "price": created.get("price", item["price"])})
                except Exception:
                    pass
        except Exception as e:
            logger.error("❌ Clover | %s | Failed to get items: %s", self.name, e)
        return self._item_ids

    def create_order(self) -> dict | None:
        items = self._get_or_create_items()
        if not items:
            return None
        try:
            # Create order
            order_resp = requests.post(
                self._base_url("/orders"),
                headers=self.headers,
                json={"state": "open"},
                timeout=30
            )
            order_resp.raise_for_status()
            order_id = order_resp.json()["id"]

            # Add line items
            num_items = random.randint(1, 4)
            chosen_items = random.sample(items, min(num_items, len(items)))
            total = 0
            for item in chosen_items:
                qty = random.randint(1, 3)
                price = item["price"]
                total += price * qty
                requests.post(
                    self._base_url(f"/orders/{order_id}/line_items"),
                    headers=self.headers,
                    json={
                        "item": {"id": item["id"]},
                        "price": price,
                        "unitQty": qty * 1000,
                        "name": item["name"],
                    },
                    timeout=30
                )

            # Add discount sometimes
            if random.random() > 0.7:
                discount = int(total * 0.10)
                requests.post(
                    self._base_url(f"/orders/{order_id}/discounts"),
                    headers=self.headers,
                    json={"name": "Happy Hour 10%", "amount": discount},
                    timeout=30
                )
                total -= discount

            # Add tip
            tip = random.choice([0, 0, 200, 300, 500]) if random.random() > 0.4 else 0

            # Get real tender ID
            tender_id = self._get_tender_id()
            if not tender_id:
                logger.error("❌ Clover | %s | No tender found", self.name)
                return None

            # ---- Fixed payment call with real tender ID ----
            pay_resp = requests.post(
                self._base_url(f"/orders/{order_id}/payments"),
                headers=self.headers,
                json={
                    "amount": total,
                    "tipAmount": tip,
                    "offline": False,
                    "tender": {"id": tender_id},  # ← Real tender ID
                },
                timeout=30,
            )

            if pay_resp.status_code != 200:
                logger.error(
                    "❌ Clover payment failed order=%s status=%s body=%s",
                    order_id, pay_resp.status_code, pay_resp.text
                )

            if pay_resp.status_code != 200:
                logger.error(
                    "❌ Clover payment failed order=%s status=%s body=%s",
                    order_id, pay_resp.status_code, pay_resp.text
                )

            # Lock order
            requests.post(
                self._base_url(f"/orders/{order_id}"),
                headers=self.headers,
                json={"state": "locked"},
                timeout=30
            )

            logger.info("✅ Clover | %s | Order %s | $%.2f", self.name, order_id, total / 100)
            return {"id": order_id, "total": total}

        except Exception as e:
            logger.error("❌ Clover | %s | Failed: %s", self.name, e)
            return None

    def create_orders(self, count: int) -> int:
        created = 0
        for _ in range(count):
            if self.create_order():
                created += 1
            time.sleep(0.5)
        return created

    def _get_tender_id(self) -> str | None:
        """Fetch the first active tender ID for this merchant."""
        try:
            resp = requests.get(
                self._base_url("/tenders"),
                headers=self.headers,
                timeout=30,
            )
            resp.raise_for_status()
            tenders = resp.json().get("elements", [])
            for tender in tenders:
                if tender.get("type") == "CREDIT_CARD":
                    return tender["id"]
            # Fallback to first tender
            if tenders:
                return tenders[0]["id"]
        except Exception as e:
            logger.error("❌ Clover | %s | Failed to get tender: %s", self.name, e)
        return None


def trigger_sync(conn: dict) -> None:
    provider    = conn["provider"]
    tenant_id   = conn["tenant_id"]
    location_id = conn["location_id"]
    url  = f"{RENDER_URL}/api/pos/{provider}/sync"
    body = {"tenant_id": tenant_id, "location_id": location_id}
    try:
        resp = requests.post(url, json=body, timeout=60)
        resp.raise_for_status()
        result = resp.json()
        logger.info("✅ Sync | %s | processed=%d failed=%d",
            conn["location_name"],
            result.get("processed_orders", 0),
            result.get("failed_orders", 0))
    except Exception as e:
        logger.error("❌ Sync | %s | Failed: %s", conn["location_name"], e)


def run_simulation(provider_filter: str | None = None) -> None:
    now          = datetime.now(timezone.utc)
    order_count  = get_order_count_for_now()
    hour         = now.hour
    weekday_name = now.strftime("%A")

    logger.info("=" * 60)
    logger.info("POS SIMULATOR — %s %02d:00 UTC | %d orders/merchant", weekday_name, hour, order_count)
    logger.info("=" * 60)

    try:
        connections = get_db_connections()
    except Exception as e:
        logger.error("❌ Failed to fetch DB connections: %s", e)
        return

    if provider_filter:
        connections = [c for c in connections if c["provider"] == provider_filter]

    logger.info("Found %d active connections", len(connections))
    total_created = 0

    for conn in connections:
        provider = conn["provider"]
        name     = conn["location_name"]
        logger.info("─" * 40)
        logger.info("Processing: %s (%s)", name, provider)
        created = 0
        try:
            if provider == "square":
                created = SquareOrderCreator(conn).create_orders(order_count)
            elif provider == "clover":
                created = CloverOrderCreator(conn).create_orders(order_count)
            total_created += created
        except Exception as e:
            logger.error("❌ Failed for %s: %s", name, e)
            continue
        if created > 0:
            time.sleep(2)
            trigger_sync(conn)

    logger.info("=" * 60)
    logger.info("DONE — Total orders created: %d", total_created)
    logger.info("=" * 60)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Valora POS Real-Time Simulator")
    parser.add_argument("--provider", choices=["square", "clover"], default=None)
    parser.add_argument("--run-once", action="store_true")
    parser.add_argument("--daemon",   action="store_true")
    parser.add_argument("--interval", type=int, default=INTERVAL_SECS)
    args = parser.parse_args()

    if args.run_once:
        run_simulation(provider_filter=args.provider)
    elif args.daemon:
        logger.info("Starting daemon (interval: %ds)", args.interval)
        while True:
            try:
                run_simulation(provider_filter=args.provider)
            except KeyboardInterrupt:
                logger.info("Stopped")
                break
            except Exception as e:
                logger.error("Error: %s", e)
            time.sleep(args.interval)
    else:
        parser.print_help()
