from __future__ import annotations

from datetime import date, datetime
from decimal import Decimal
from typing import Any

from pydantic import BaseModel, Field


# -------------------------------
# Order Line Item
# -------------------------------
class CanonicalOrderItem(BaseModel):
    provider_line_id: str | None = None
    external_item_id: str | None = None

    item_name: str
    category: str | None = None

    quantity: int = 1
    unit_price: Decimal = Decimal("0")

    line_discount: Decimal = Decimal("0")
    line_revenue: Decimal = Decimal("0")
    line_cogs: Decimal = Decimal("0")

    modifiers: dict[str, Any] = Field(default_factory=dict)


# -------------------------------
# Payment
# -------------------------------
class CanonicalPayment(BaseModel):
    provider_payment_id: str | None = None
    payment_method: str | None = None

    amount: Decimal = Decimal("0")
    payment_status: str | None = None


# -------------------------------
# Discount
# -------------------------------
class CanonicalDiscount(BaseModel):
    provider_discount_id: str | None = None
    discount_name: str | None = None
    discount_type: str | None = None

    discount_amount: Decimal = Decimal("0")


# -------------------------------
# Refund
# -------------------------------
class CanonicalRefund(BaseModel):
    provider_refund_id: str | None = None

    refund_amount: Decimal = Decimal("0")
    refund_reason: str | None = None

    created_at_utc: datetime | None = None


# -------------------------------
# Full Order (Core Object)
# -------------------------------
class CanonicalOrder(BaseModel):
    provider: str
    provider_order_id: str

    external_location_id: str

    order_ts: datetime
    order_date: date

    order_channel: str
    order_status: str

    gross_sales: Decimal = Decimal("0")
    discount_amount: Decimal = Decimal("0")
    net_sales: Decimal = Decimal("0")

    tax_amount: Decimal = Decimal("0")
    tip_amount: Decimal = Decimal("0")
    service_charge_amount: Decimal = Decimal("0")

    customer_count: int = 1

    opened_at_utc: datetime | None = None
    closed_at_utc: datetime | None = None

    currency_code_pos: str | None = "USD"

    provider_updated_at_utc: datetime | None = None

    customer_external_id: str | None = None

    # Nested structures
    items: list[CanonicalOrderItem] = Field(default_factory=list)
    payments: list[CanonicalPayment] = Field(default_factory=list)
    discounts: list[CanonicalDiscount] = Field(default_factory=list)
    refunds: list[CanonicalRefund] = Field(default_factory=list)


# -------------------------------
# Raw Webhook Envelope
# -------------------------------
class RawWebhookEnvelope(BaseModel):
    provider: str
    event_type: str

    provider_event_id: str | None = None
    provider_object_id: str | None = None

    external_location_id: str | None = None

    payload: dict[str, Any]