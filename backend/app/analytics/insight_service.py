from __future__ import annotations

from decimal import Decimal
from typing import Any


class InsightService:
    """
    Rule-based insight generation on top of KPI snapshot.
    This is the first AI layer bridge before ML/LLM enrichment.
    """

    def generate_daily_insights(self, snapshot: dict[str, Any]) -> list[dict[str, Any]]:
        summary = snapshot.get("summary") or {}
        payment_mix = snapshot.get("payment_mix") or []
        top_items = snapshot.get("top_items") or []

        insights: list[dict[str, Any]] = []

        net_sales = self._d(summary.get("net_sales"))
        avg_order_value = self._d(summary.get("avg_order_value"))
        discount_pct = self._d(summary.get("discount_pct"))
        order_count = int(summary.get("order_count") or 0)
        customer_count = int(summary.get("customer_count") or 0)

        if order_count == 0:
            insights.append({
                "type": "warning",
                "title": "No orders recorded",
                "message": "No POS orders were recorded for this date. Check POS sync, store hours, or data delays.",
                "priority": 1,
            })
            return insights

        if net_sales > 0 and avg_order_value < Decimal("20"):
            insights.append({
                "type": "opportunity",
                "title": "Average order value is low",
                "message": f"AOV is ${avg_order_value:.2f}. Consider bundles, add-ons, or upsell prompts to raise ticket size.",
                "priority": 2,
            })

        if discount_pct >= Decimal("10"):
            insights.append({
                "type": "risk",
                "title": "Discounting is elevated",
                "message": f"Discount rate is {discount_pct:.1f}%. Review promotions and discount leakage.",
                "priority": 1,
            })
        elif discount_pct >= Decimal("5"):
            insights.append({
                "type": "watch",
                "title": "Discounting should be monitored",
                "message": f"Discount rate is {discount_pct:.1f}%. Keep an eye on margin impact.",
                "priority": 3,
            })

        if customer_count > 0 and order_count > 0:
            customers_per_order = Decimal(customer_count) / Decimal(order_count)
            if customers_per_order > Decimal("2.5"):
                insights.append({
                    "type": "signal",
                    "title": "Higher group traffic detected",
                    "message": f"Customers per order is {customers_per_order:.2f}. Group ordering may be driving demand.",
                    "priority": 4,
                })

        if top_items:
            best = top_items[0]
            insights.append({
                "type": "opportunity",
                "title": "Top-selling item identified",
                "message": f"{best['item_name']} is leading sales with qty {best['qty_sold']} and revenue ${Decimal(str(best['revenue'])):.2f}. Feature it in promotions and inventory planning.",
                "priority": 3,
            })

        if payment_mix:
            top_payment = payment_mix[0]
            insights.append({
                "type": "signal",
                "title": "Primary payment method identified",
                "message": f"{top_payment['payment_method']} accounts for {Decimal(str(top_payment['pct'])):.1f}% of payment mix.",
                "priority": 5,
            })

        if not insights:
            insights.append({
                "type": "healthy",
                "title": "Operations look stable",
                "message": "No major KPI anomalies detected for this day based on current rules.",
                "priority": 5,
            })

        return sorted(insights, key=lambda x: x["priority"])

    def _d(self, value: Any) -> Decimal:
        if value is None:
            return Decimal("0")
        if isinstance(value, Decimal):
            return value
        return Decimal(str(value))