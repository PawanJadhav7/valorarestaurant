from __future__ import annotations

import hashlib
import hmac
import json
from datetime import datetime, timezone
from decimal import Decimal

import httpx

from .base import POSAdapter
from .schemas import (
    CanonicalDiscount,
    CanonicalOrder,
    CanonicalOrderItem,
    CanonicalPayment,
    CanonicalRefund,
    RawWebhookEnvelope,
)


class SquareAdapter(POSAdapter):
    provider_name = "square"

    def __init__(self, base_url: str = "https://connect.squareupsandbox.com") -> None:
        self.base_url = base_url.rstrip("/")

    # ------------------------------------------------------------------
    # Helpers
    # ------------------------------------------------------------------

    def _headers(self, access_token: str) -> dict[str, str]:
        return {
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/json",
            "Square-Version": "2024-01-17",
        }

    def _cents_to_decimal(self, amount: int | None) -> Decimal:
        """Square returns all money in cents (smallest currency unit)."""
        if amount is None:
            return Decimal("0")
        return Decimal(amount) / Decimal("100")

    def _parse_dt(self, value: str | None) -> datetime | None:
        if not value:
            return None
        return datetime.fromisoformat(value.replace("Z", "+00:00"))

    # ------------------------------------------------------------------
    # fetch_orders_updated_since
    # ------------------------------------------------------------------

    def fetch_orders_updated_since(
        self,
        *,
        access_token: str,
        external_location_id: str,
        cursor: str | None,
        limit: int = 100,
    ) -> tuple[list[CanonicalOrder], str | None]:

        url = f"{self.base_url}/v2/orders/search"

        body: dict = {
            "location_ids": [external_location_id],
            "limit": limit,
            "return_entries": False,
            "query": {
                "filter": {
                    "state_filter": {
                        "states": ["COMPLETED", "OPEN", "CANCELED"]
                    }
                },
                "sort": {
                    "sort_field": "UPDATED_AT",
                    "sort_order": "ASC",
                },
            },
        }

        if cursor:
            body["cursor"] = cursor

        response = httpx.post(url, headers=self._headers(access_token), json=body)
        response.raise_for_status()
        data = response.json()

        orders = [
            self._map_order(raw, external_location_id)
            for raw in data.get("orders", [])
        ]

        next_cursor = data.get("cursor")  # None if last page
        return orders, next_cursor

    # ------------------------------------------------------------------
    # Order Mapper
    # ------------------------------------------------------------------

    def _map_order(self, raw: dict, external_location_id: str) -> CanonicalOrder:
        order_id = raw["id"]
        state = raw.get("state", "UNKNOWN")
        created_at = self._parse_dt(raw.get("created_at"))
        closed_at = self._parse_dt(raw.get("closed_at"))
        updated_at = self._parse_dt(raw.get("updated_at"))

        order_ts = created_at or datetime.now(timezone.utc)
        order_date = order_ts.date()

        # ---- Money fields (all in cents from Square) ----
        total_money = raw.get("total_money", {})
        tax_money = raw.get("total_tax_money", {})
        discount_money = raw.get("total_discount_money", {})
        tip_money = raw.get("total_tip_money", {})
        service_charge_money = raw.get("total_service_charge_money", {})

        gross_sales = self._cents_to_decimal(total_money.get("amount"))
        discount_amount = self._cents_to_decimal(discount_money.get("amount"))
        tax_amount = self._cents_to_decimal(tax_money.get("amount"))
        tip_amount = self._cents_to_decimal(tip_money.get("amount"))
        service_charge_amount = self._cents_to_decimal(service_charge_money.get("amount"))
        net_sales = gross_sales - discount_amount

        currency = total_money.get("currency", "USD")

        # ---- Source / channel ----
        source = raw.get("source", {})
        order_channel = source.get("name", "POS")

        # ---- Customer ----
        customer_id = raw.get("customer_id")

        # ---- Nested ----
        items = self._map_items(raw.get("line_items", []))
        payments = self._map_payments(raw.get("tenders", []))
        discounts = self._map_discounts(raw.get("discounts", []))
        refunds = self._map_refunds(raw.get("refunds", []))

        return CanonicalOrder(
            provider=self.provider_name,
            provider_order_id=order_id,
            external_location_id=external_location_id,
            order_ts=order_ts,
            order_date=order_date,
            order_channel=order_channel,
            order_status=state,
            gross_sales=gross_sales,
            discount_amount=discount_amount,
            net_sales=net_sales,
            tax_amount=tax_amount,
            tip_amount=tip_amount,
            service_charge_amount=service_charge_amount,
            customer_count=1,
            opened_at_utc=created_at,
            closed_at_utc=closed_at,
            currency_code_pos=currency,
            provider_updated_at_utc=updated_at,
            customer_external_id=customer_id,
            items=items,
            payments=payments,
            discounts=discounts,
            refunds=refunds,
        )

    # ------------------------------------------------------------------
    # Line Items
    # ------------------------------------------------------------------

    def _map_items(self, line_items: list[dict]) -> list[CanonicalOrderItem]:
        result = []
        for item in line_items:
            base_price = item.get("base_price_money", {})
            gross_money = item.get("gross_sales_money", {})
            total_discount = item.get("total_discount_money", {})

            unit_price = self._cents_to_decimal(base_price.get("amount"))
            line_revenue = self._cents_to_decimal(gross_money.get("amount"))
            line_discount = self._cents_to_decimal(total_discount.get("amount"))

            quantity_str = item.get("quantity", "1")
            try:
                quantity = int(float(quantity_str))
            except (ValueError, TypeError):
                quantity = 1

            # Modifiers
            modifiers = {}
            for mod in item.get("modifiers", []):
                mod_name = mod.get("name", "unknown")
                mod_price = self._cents_to_decimal(
                    mod.get("base_price_money", {}).get("amount")
                )
                modifiers[mod_name] = str(mod_price)

            result.append(
                CanonicalOrderItem(
                    provider_line_id=item.get("uid"),
                    external_item_id=item.get("catalog_object_id"),
                    item_name=item.get("name", "Unknown Item"),
                    category=item.get("variation_name"),
                    quantity=quantity,
                    unit_price=unit_price,
                    line_discount=line_discount,
                    line_revenue=line_revenue,
                    line_cogs=Decimal("0"),  # Square doesn't provide COGS
                    modifiers=modifiers,
                )
            )
        return result

    # ------------------------------------------------------------------
    # Payments (Tenders in Square)
    # ------------------------------------------------------------------

    def _map_payments(self, tenders: list[dict]) -> list[CanonicalPayment]:
        result = []
        for tender in tenders:
            amount_money = tender.get("amount_money", {})
            result.append(
                CanonicalPayment(
                    provider_payment_id=tender.get("id"),
                    payment_method=tender.get("type"),  # CARD, CASH, etc.
                    amount=self._cents_to_decimal(amount_money.get("amount")),
                    payment_status=tender.get("card_details", {}).get("status"),
                )
            )
        return result

    # ------------------------------------------------------------------
    # Discounts
    # ------------------------------------------------------------------

    def _map_discounts(self, discounts: list[dict]) -> list[CanonicalDiscount]:
        result = []
        for discount in discounts:
            amount_money = discount.get("applied_money", {})
            result.append(
                CanonicalDiscount(
                    provider_discount_id=discount.get("uid"),
                    discount_name=discount.get("name"),
                    discount_type=discount.get("type"),  # FIXED_AMOUNT, PERCENTAGE
                    discount_amount=self._cents_to_decimal(amount_money.get("amount")),
                )
            )
        return result

    # ------------------------------------------------------------------
    # Refunds
    # ------------------------------------------------------------------

    def _map_refunds(self, refunds: list[dict]) -> list[CanonicalRefund]:
        result = []
        for refund in refunds:
            amount_money = refund.get("amount_money", {})
            result.append(
                CanonicalRefund(
                    provider_refund_id=refund.get("id"),
                    refund_amount=self._cents_to_decimal(amount_money.get("amount")),
                    refund_reason=refund.get("reason"),
                    created_at_utc=self._parse_dt(refund.get("created_at")),
                )
            )
        return result

    # ------------------------------------------------------------------
    # Webhook Signature Verification
    # ------------------------------------------------------------------

    def verify_webhook_signature(
            self,
            *,
            headers: dict[str, str],
            raw_body: bytes,
            secret: str,
    ) -> bool:
        import base64
        import os

        signature = headers.get("x-square-hmacsha256-signature") or headers.get(
            "X-Square-HmacSha256-Signature"
        )
        if not signature:
            return False

        notification_url = os.getenv(
            "SQUARE_WEBHOOK_URL",
            "https://angelique-canniest-prefamously.ngrok-free.dev/api/pos/square/webhook"
        )

        # Square signs: HMAC-SHA256(secret, notification_url + raw_body)
        message = (notification_url + raw_body.decode("utf-8")).encode("utf-8")

        expected = base64.b64encode(
            hmac.new(
                secret.encode("utf-8"),
                message,
                hashlib.sha256,
            ).digest()
        ).decode("utf-8")

        return hmac.compare_digest(signature, expected)

    # ------------------------------------------------------------------
    # Webhook Parsing
    # ------------------------------------------------------------------

    def parse_webhook(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
    ) -> RawWebhookEnvelope:
        payload = json.loads(raw_body)

        event_type = payload.get("type", "unknown")           # e.g. "order.updated"
        event_id = payload.get("event_id")
        merchant_id = payload.get("merchant_id")

        data = payload.get("data", {})
        object_id = data.get("id")
        location_id = (
            data.get("object", {})
            .get("order_updated", {})
            .get("location_id")
            or data.get("object", {})
            .get("order", {})
            .get("location_id")
        )

        return RawWebhookEnvelope(
            provider=self.provider_name,
            event_type=event_type,
            provider_event_id=event_id,
            provider_object_id=object_id,
            external_location_id=location_id or merchant_id,
            payload=payload,
        )