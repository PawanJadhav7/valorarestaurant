# -----------------------------------------------------
# KPI AGGREGATION (Daily Metrics)
# -----------------------------------------------------
from __future__ import annotations

from datetime import date
from decimal import Decimal

from sqlalchemy import text
from sqlalchemy.orm import Session


class KPIRepository:
    """
    Daily KPI aggregation from restaurant.fact_order and related POS-ingested tables.
    """

    def __init__(self, db: Session) -> None:
        self.db = db

    # -----------------------------------------------------
    # DAILY ORDER KPIS
    # -----------------------------------------------------
    def get_daily_order_kpis(
        self,
        *,
        tenant_id: str,
        location_id: int,
        business_date: date,
        provider: str | None = None,
    ) -> dict:
        provider_filter = ""
        params: dict = {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "business_date": business_date,
        }

        if provider:
            provider_filter = "AND fo.provider = :provider"
            params["provider"] = provider

        q = text(f"""
            SELECT
                COALESCE(COUNT(*), 0) AS order_count,
                COALESCE(SUM(fo.gross_sales), 0) AS gross_sales,
                COALESCE(SUM(fo.discount_amount), 0) AS discount_amount,
                COALESCE(SUM(fo.net_sales), 0) AS net_sales,
                COALESCE(SUM(fo.tax_amount), 0) AS tax_amount,
                COALESCE(SUM(fo.tip_amount), 0) AS tip_amount,
                COALESCE(SUM(fo.service_charge_amount), 0) AS service_charge_amount,
                COALESCE(SUM(fo.customer_count), 0) AS customer_count,
                COALESCE(AVG(NULLIF(fo.net_sales, 0)), 0) AS avg_order_value
            FROM restaurant.fact_order fo
            WHERE fo.tenant_id = :tenant_id
              AND fo.location_id = :location_id
              AND fo.order_date = :business_date
              {provider_filter}
        """)

        row = self.db.execute(q, params).mappings().first()
        if not row:
            return self._empty_daily_kpis(tenant_id, location_id, business_date, provider)

        order_count = int(row["order_count"] or 0)
        net_sales = self._d(row["net_sales"])
        customer_count = int(row["customer_count"] or 0)

        avg_order_value = Decimal("0")
        if order_count > 0:
            avg_order_value = net_sales / Decimal(order_count)

        avg_customer_spend = Decimal("0")
        if customer_count > 0:
            avg_customer_spend = net_sales / Decimal(customer_count)

        return {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "business_date": str(business_date),
            "provider": provider,
            "order_count": order_count,
            "gross_sales": self._d(row["gross_sales"]),
            "discount_amount": self._d(row["discount_amount"]),
            "net_sales": net_sales,
            "tax_amount": self._d(row["tax_amount"]),
            "tip_amount": self._d(row["tip_amount"]),
            "service_charge_amount": self._d(row["service_charge_amount"]),
            "customer_count": customer_count,
            "avg_order_value": avg_order_value,
            "avg_customer_spend": avg_customer_spend,
            "discount_pct": self._safe_pct(self._d(row["discount_amount"]), self._d(row["gross_sales"])),
        }

    # -----------------------------------------------------
    # DAILY PAYMENT MIX
    # -----------------------------------------------------
    def get_daily_payment_mix(
        self,
        *,
        tenant_id: str,
        location_id: int,
        business_date: date,
        provider: str | None = None,
    ) -> list[dict]:
        provider_filter = ""
        params: dict = {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "business_date": business_date,
        }

        if provider:
            provider_filter = "AND fo.provider = :provider"
            params["provider"] = provider

        q = text(f"""
            SELECT
                COALESCE(fop.payment_method, 'unknown') AS payment_method,
                COALESCE(SUM(fop.amount), 0) AS amount
            FROM restaurant.fact_order fo
            JOIN restaurant.fact_order_payment fop
              ON fop.order_id = fo.order_id
            WHERE fo.tenant_id = :tenant_id
              AND fo.location_id = :location_id
              AND fo.order_date = :business_date
              {provider_filter}
            GROUP BY COALESCE(fop.payment_method, 'unknown')
            ORDER BY amount DESC
        """)

        rows = self.db.execute(q, params).mappings().all()
        total = sum(self._d(r["amount"]) for r in rows)

        result: list[dict] = []
        for r in rows:
            amount = self._d(r["amount"])
            result.append({
                "payment_method": r["payment_method"],
                "amount": amount,
                "pct": self._safe_pct(amount, total),
            })

        return result

    # -----------------------------------------------------
    # DAILY ITEM KPIS
    # -----------------------------------------------------
    def get_daily_item_kpis(
        self,
        *,
        tenant_id: str,
        location_id: int,
        business_date: date,
        provider: str | None = None,
        limit: int = 10,
    ) -> list[dict]:
        provider_filter = ""
        params: dict = {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "business_date": business_date,
            "limit": limit,
        }

        if provider:
            provider_filter = "AND fo.provider = :provider"
            params["provider"] = provider

        q = text(f"""
            SELECT
                COALESCE(dmi.item_name, 'Unknown Item') AS item_name,
                COALESCE(SUM(foi.quantity), 0) AS qty_sold,
                COALESCE(SUM(foi.line_revenue), 0) AS revenue
            FROM restaurant.fact_order fo
            JOIN restaurant.fact_order_item foi
              ON foi.order_id = fo.order_id
            LEFT JOIN restaurant.dim_menu_item dmi
              ON dmi.menu_item_id = foi.menu_item_id
            WHERE fo.tenant_id = :tenant_id
              AND fo.location_id = :location_id
              AND fo.order_date = :business_date
              {provider_filter}
            GROUP BY COALESCE(dmi.item_name, 'Unknown Item')
            ORDER BY revenue DESC
            LIMIT :limit
        """)

        rows = self.db.execute(q, params).mappings().all()
        return [
            {
                "item_name": r["item_name"],
                "qty_sold": int(r["qty_sold"] or 0),
                "revenue": self._d(r["revenue"]),
            }
            for r in rows
        ]

    # -----------------------------------------------------
    # DAILY KPI SNAPSHOT
    # -----------------------------------------------------
    def get_daily_snapshot(
        self,
        *,
        tenant_id: str,
        location_id: int,
        business_date: date,
        provider: str | None = None,
    ) -> dict:
        return {
            "summary": self.get_daily_order_kpis(
                tenant_id=tenant_id,
                location_id=location_id,
                business_date=business_date,
                provider=provider,
            ),
            "payment_mix": self.get_daily_payment_mix(
                tenant_id=tenant_id,
                location_id=location_id,
                business_date=business_date,
                provider=provider,
            ),
            "top_items": self.get_daily_item_kpis(
                tenant_id=tenant_id,
                location_id=location_id,
                business_date=business_date,
                provider=provider,
                limit=10,
            ),
        }

    # -----------------------------------------------------
    # HELPERS
    # -----------------------------------------------------
    def _empty_daily_kpis(
        self,
        tenant_id: str,
        location_id: int,
        business_date: date,
        provider: str | None,
    ) -> dict:
        zero = Decimal("0")
        return {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "business_date": str(business_date),
            "provider": provider,
            "order_count": 0,
            "gross_sales": zero,
            "discount_amount": zero,
            "net_sales": zero,
            "tax_amount": zero,
            "tip_amount": zero,
            "service_charge_amount": zero,
            "customer_count": 0,
            "avg_order_value": zero,
            "avg_customer_spend": zero,
            "discount_pct": zero,
        }

    def _safe_pct(self, numerator: Decimal, denominator: Decimal) -> Decimal:
        if denominator == 0:
            return Decimal("0")
        return (numerator / denominator) * Decimal("100")

    def _d(self, value) -> Decimal:
        if value is None:
            return Decimal("0")
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))