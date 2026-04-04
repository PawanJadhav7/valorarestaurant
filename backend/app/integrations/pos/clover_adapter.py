from __future__ import annotations

import hashlib
import hmac
import json
from datetime import UTC, datetime
from decimal import Decimal
from typing import Any

import requests
import certifi
import ssl

from .base import POSAdapter
from .schemas import (
    CanonicalDiscount,
    CanonicalOrder,
    CanonicalOrderItem,
    CanonicalPayment,
    CanonicalRefund,
    RawWebhookEnvelope,
)


class CloverAdapter(POSAdapter):
    provider_name = "clover"

    def __init__(self, base_url: str = "https://sandbox.dev.clover.com") -> None:
        self.base_url = base_url.rstrip("/")

    def fetch_orders_updated_since(
            self,
            *,
            access_token: str,
            external_location_id: str,
            cursor: str | None,
            limit: int = 100,
    ) -> tuple[list[CanonicalOrder], str | None]:
        if not access_token:
            raise ValueError("Missing Clover access token")

        headers = {
            "Authorization": f"Bearer {access_token}",
            "Accept": "application/json",
        }

        params: dict[str, Any] = {"limit": limit, "expand": "lineItems,payments", "include": "payments"}
        if cursor:
            params["updatedSince"] = cursor

        response = requests.get(
            f"{self.base_url}/v3/merchants/{external_location_id}/orders",
            headers=headers,
            params=params,
            timeout=30.0,
            verify=certifi.where(),
        )
        response.raise_for_status()
        payload = response.json()

        raw_orders = payload.get("elements", []) or []
        orders = [
            self._map_order(external_location_id=external_location_id, row=row)
            for row in raw_orders
        ]

        next_cursor = self._extract_next_cursor(payload=payload, fallback_orders=orders)
        return orders, next_cursor

    def verify_webhook_signature(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
        secret: str,
    ) -> bool:
        signature_header = headers.get("Clover-Signature") or headers.get("clover-signature")
        if not signature_header:
            return False

        parts: dict[str, str] = {}
        for part in signature_header.split(","):
            if "=" in part:
                key, value = part.split("=", 1)
                parts[key.strip()] = value.strip()

        ts = parts.get("t")
        v1 = parts.get("v1")

        if not ts or not v1:
            return False

        signed_payload = f"{ts}.{raw_body.decode('utf-8')}".encode("utf-8")
        expected = hmac.new(
            secret.encode("utf-8"),
            signed_payload,
            hashlib.sha256,
        ).hexdigest()

        return hmac.compare_digest(expected, v1)

    def parse_webhook(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
    ) -> RawWebhookEnvelope:
        data = json.loads(raw_body.decode("utf-8"))

        provider_event_id = self._safe_str(data.get("id"))
        event_type = self._safe_str(data.get("type")) or self._safe_str(data.get("eventType")) or "unknown"

        provider_object_id = (
            self._safe_str(data.get("objectId"))
            or self._safe_str(data.get("orderId"))
            or self._safe_str(data.get("data"))
        )

        external_location_id = (
            self._safe_str(data.get("merchantId"))
            or self._safe_str(data.get("locationId"))
        )

        return RawWebhookEnvelope(
            provider="clover",
            event_type=event_type,
            provider_event_id=provider_event_id,
            provider_object_id=provider_object_id,
            external_location_id=external_location_id,
            payload=data,
        )

    def _map_order(
        self,
        *,
        external_location_id: str,
        row: dict[str, Any],
    ) -> CanonicalOrder:
        provider_order_id = self._safe_str(row.get("id")) or "unknown_order"

        order_ts = self._parse_dt(
            row.get("clientCreatedTime")
            or row.get("createdTime")
            or row.get("modifiedTime")
        )

        provider_updated_at_utc = self._parse_dt(
            row.get("modifiedTime")
            or row.get("clientCreatedTime")
            or row.get("createdTime")
        )

        payments_elements = (row.get("payments") or {}).get("elements", [])
        if payments_elements:
            gross_sales = sum(
                self._money_to_decimal(p.get("amount", 0))
                for p in payments_elements
                if p.get("result") in ("SUCCESS", None)
            )
        else:
            gross_sales = self._money_to_decimal(
                row.get("total") or row.get("totalAmount") or 0
            )

        tax_amount = self._money_to_decimal(
            row.get("taxAmount")
            or row.get("tax")
            or 0
        )

        tip_amount = self._money_to_decimal(
            row.get("tipAmount")
            or row.get("tip")
            or 0
        )

        discount_amount = self._extract_discount_total(row)
        service_charge_amount = self._money_to_decimal(
            row.get("serviceChargeAmount") or 0
        )

        net_sales = gross_sales - discount_amount
        if net_sales < Decimal("0"):
            net_sales = Decimal("0")

        customer_count = int(row.get("customerCount") or 1)

        order_channel = self._map_order_channel(row)
        order_status = self._map_order_status(row)

        items = self._map_items(row)
        payments = self._map_payments(row)
        discounts = self._map_discounts(row)
        refunds = self._map_refunds(row)

        customer_external_id = None
        if isinstance(row.get("customer"), dict):
            customer_external_id = self._safe_str(row["customer"].get("id"))

        return CanonicalOrder(
            provider="clover",
            provider_order_id=provider_order_id,
            external_location_id=external_location_id,
            order_ts=order_ts,
            order_date=order_ts.date(),
            order_channel=order_channel,
            order_status=order_status,
            gross_sales=gross_sales,
            discount_amount=discount_amount,
            net_sales=net_sales,
            tax_amount=tax_amount,
            tip_amount=tip_amount,
            service_charge_amount=service_charge_amount,
            customer_count=customer_count,
            opened_at_utc=order_ts,
            closed_at_utc=provider_updated_at_utc,
            currency_code_pos="USD",
            provider_updated_at_utc=provider_updated_at_utc,
            customer_external_id=customer_external_id,
            items=items,
            payments=payments,
            discounts=discounts,
            refunds=refunds,
        )

    def _map_items(self, row: dict[str, Any]) -> list[CanonicalOrderItem]:
        raw_items = (
                (row.get("lineItems") or {}).get("elements", [])
                or (row.get("items") or {}).get("elements", [])
                or []
        )
        results: list[CanonicalOrderItem] = []

        for item in raw_items:
            price = self._money_to_decimal(
                item.get("price")
                or item.get("priceAmount")
                or 0
            )
            quantity = int(item.get("unitQty") or item.get("quantity") or 1)
            line_discount = self._money_to_decimal(item.get("discountAmount") or 0)
            line_revenue = self._money_to_decimal(
                item.get("total")
                or item.get("lineRevenue")
                or (price * quantity) - line_discount
            )

            external_item_id = None
            item_ref = item.get("item")
            if isinstance(item_ref, dict):
                external_item_id = self._safe_str(item_ref.get("id"))

            modifiers = self._extract_modifiers(item)

            results.append(
                CanonicalOrderItem(
                    provider_line_id=self._safe_str(item.get("id")),
                    external_item_id=external_item_id,
                    item_name=self._safe_str(item.get("name")) or "Unknown Item",
                    category=self._extract_category(item),
                    quantity=quantity,
                    unit_price=price,
                    line_discount=line_discount,
                    line_revenue=line_revenue,
                    line_cogs=Decimal("0"),
                    modifiers=modifiers,
                )
            )

        return results

    def _map_payments(self, row: dict[str, Any]) -> list[CanonicalPayment]:
        raw_payments = (row.get("payments") or {}).get("elements", [])
        results: list[CanonicalPayment] = []

        for payment in raw_payments:
            # Only include successful payments
            if payment.get("result") not in ("SUCCESS", None):
                continue

            tender_label = None
            tender = payment.get("tender")
            if isinstance(tender, dict):
                tender_label = (
                        self._safe_str(tender.get("label"))
                        or self._safe_str(tender.get("id"))
                )

            results.append(
                CanonicalPayment(
                    provider_payment_id=self._safe_str(payment.get("id")),
                    payment_method=tender_label or self._safe_str(payment.get("paymentMethod")),
                    amount=self._money_to_decimal(payment.get("amount") or 0),
                    payment_status="captured",
                )
            )

        return results

    def _map_discounts(self, row: dict[str, Any]) -> list[CanonicalDiscount]:
        raw_discounts = row.get("discounts") or []
        results: list[CanonicalDiscount] = []

        for discount in raw_discounts:
            results.append(
                CanonicalDiscount(
                    provider_discount_id=self._safe_str(discount.get("id")),
                    discount_name=self._safe_str(discount.get("name")),
                    discount_type=self._safe_str(discount.get("type")),
                    discount_amount=self._money_to_decimal(
                        discount.get("amount")
                        or discount.get("discountAmount")
                        or 0
                    ),
                )
            )

        total_discount = self._extract_discount_total(row)
        if total_discount > Decimal("0") and not results:
            results.append(
                CanonicalDiscount(
                    provider_discount_id=None,
                    discount_name="Order Discount",
                    discount_type="unknown",
                    discount_amount=total_discount,
                )
            )

        return results

    def _map_refunds(self, row: dict[str, Any]) -> list[CanonicalRefund]:
        raw_refunds = row.get("refunds") or []
        results: list[CanonicalRefund] = []

        for refund in raw_refunds:
            results.append(
                CanonicalRefund(
                    provider_refund_id=self._safe_str(refund.get("id")),
                    refund_amount=self._money_to_decimal(refund.get("amount") or 0),
                    refund_reason=self._safe_str(refund.get("reason")),
                    created_at_utc=self._parse_dt(
                        refund.get("createdTime") or refund.get("modifiedTime")
                    ),
                )
            )

        return results

    def _extract_modifiers(self, item: dict[str, Any]) -> dict[str, Any]:
        modifiers = item.get("modifications") or item.get("modifiers") or []
        if isinstance(modifiers, dict):
            return modifiers
        if isinstance(modifiers, list):
            return {"items": modifiers}
        return {}

    def _extract_category(self, item: dict[str, Any]) -> str | None:
        category = item.get("category")
        if isinstance(category, dict):
            return self._safe_str(category.get("name"))
        if isinstance(category, str):
            return category
        return None

    def _extract_discount_total(self, row: dict[str, Any]) -> Decimal:
        direct = row.get("discountAmount")
        if direct is not None:
            return self._money_to_decimal(direct)

        discounts = row.get("discounts") or []
        total = Decimal("0")
        for discount in discounts:
            total += self._money_to_decimal(
                discount.get("amount")
                or discount.get("discountAmount")
                or 0
            )
        return total

    def _map_order_status(self, row: dict[str, Any]) -> str:
        status = (self._safe_str(row.get("state")) or self._safe_str(row.get("status")) or "").lower()

        if status in {"paid", "closed", "completed", "locked"}:
            return "completed"
        if status in {"open"}:
            return "open"
        if status in {"cancelled", "canceled"}:
            return "cancelled"
        if status in {"voided"}:
            return "voided"
        return "completed"

    def _map_order_channel(self, row: dict[str, Any]) -> str:
        channel = self._safe_str(row.get("channel"))
        if channel:
            return channel.lower()

        source = self._safe_str(row.get("source"))
        if source:
            return source.lower()

        return "in_store"

    def _extract_next_cursor(
        self,
        *,
        payload: dict[str, Any],
        fallback_orders: list[CanonicalOrder],
    ) -> str | None:
        for key in ("cursor", "nextCursor", "next_cursor", "updatedSince"):
            value = payload.get(key)
            if value:
                return str(value)

        if fallback_orders:
            latest = max(
                (
                    order.provider_updated_at_utc
                    for order in fallback_orders
                    if order.provider_updated_at_utc is not None
                ),
                default=None,
            )
            if latest:
                return latest.isoformat()

        return None

    def _parse_dt(self, value: Any) -> datetime:
        if value is None:
            return datetime.now(UTC)

        if isinstance(value, datetime):
            return value if value.tzinfo else value.replace(tzinfo=UTC)

        if isinstance(value, (int, float)):
            if value > 10_000_000_000:
                return datetime.fromtimestamp(value / 1000, tz=UTC)
            return datetime.fromtimestamp(value, tz=UTC)

        if isinstance(value, str):
            cleaned = value.strip()
            if not cleaned:
                return datetime.now(UTC)

            try:
                if cleaned.endswith("Z"):
                    return datetime.fromisoformat(cleaned.replace("Z", "+00:00"))
                parsed = datetime.fromisoformat(cleaned)
                return parsed if parsed.tzinfo else parsed.replace(tzinfo=UTC)
            except ValueError:
                return datetime.now(UTC)

        return datetime.now(UTC)

    def _money_to_decimal(self, value: Any) -> Decimal:
        if value is None:
            return Decimal("0")

        if isinstance(value, Decimal):
            return value

        if isinstance(value, int):
            return Decimal(value) / Decimal("100")

        if isinstance(value, float):
            return Decimal(str(value))

        if isinstance(value, str):
            cleaned = value.strip()
            if cleaned == "":
                return Decimal("0")
            try:
                if cleaned.isdigit() or (cleaned.startswith("-") and cleaned[1:].isdigit()):
                    return Decimal(cleaned) / Decimal("100")
                return Decimal(cleaned)
            except Exception:
                return Decimal("0")

        return Decimal("0")

    def _safe_str(self, value: Any) -> str | None:
        if value is None:
            return None
        text = str(value).strip()
        return text if text else None