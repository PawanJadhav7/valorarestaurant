from __future__ import annotations

import json
from decimal import Decimal
from typing import Any

from sqlalchemy import text
from sqlalchemy.orm import Session

from .schemas import CanonicalOrder


class POSRepository:
    def __init__(self, db: Session) -> None:
        self.db = db

    # -----------------------------------------------------
    # CONNECTION + CURSOR
    # -----------------------------------------------------
    def get_connection(self, tenant_id: str, location_id: int, provider: str):
        q = text("""
            SELECT *
            FROM restaurant.pos_connection
            WHERE tenant_id = :tenant_id
              AND location_id = :location_id
              AND provider = :provider
              AND status = 'active'
            LIMIT 1
        """)
        res = self.db.execute(q, {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "provider": provider,
        })
        return res.mappings().first()

    def get_cursor(self, tenant_id: str, location_id: int, provider: str, resource_name: str):
        q = text("""
            SELECT cursor_value
            FROM restaurant.pos_sync_state
            WHERE tenant_id = :tenant_id
              AND location_id = :location_id
              AND provider = :provider
              AND resource_name = :resource_name
        """)
        res = self.db.execute(q, {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "provider": provider,
            "resource_name": resource_name,
        })
        row = res.mappings().first()
        return row["cursor_value"] if row else None

    def update_cursor(
        self,
        tenant_id: str,
        location_id: int,
        provider: str,
        resource_name: str,
        cursor_value: str | None,
    ) -> None:
        q = text("""
            UPDATE restaurant.pos_sync_state
            SET cursor_value = :cursor_value,
                last_success_at = now(),
                updated_at = now()
            WHERE tenant_id = :tenant_id
              AND location_id = :location_id
              AND provider = :provider
              AND resource_name = :resource_name
        """)
        self.db.execute(q, {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "provider": provider,
            "resource_name": resource_name,
            "cursor_value": cursor_value,
        })

    # -----------------------------------------------------
    # RAW EVENT
    # -----------------------------------------------------
    def save_raw_event(
        self,
        *,
        tenant_id: str,
        location_id: int,
        provider: str,
        event_source: str,
        event_type: str,
        provider_object_id: str | None,
        payload_json: dict[str, Any],
        payload_hash: str,
    ) -> int:
        q = text("""
            INSERT INTO restaurant.pos_raw_event (
                tenant_id, location_id, provider,
                event_source, event_type,
                provider_object_id,
                payload_json, payload_hash,
                status, received_at
            )
            VALUES (
                :tenant_id, :location_id, :provider,
                :event_source, :event_type,
                :provider_object_id,
                CAST(:payload_json AS jsonb), :payload_hash,
                'new', now()
            )
            RETURNING raw_event_id
        """)
        res = self.db.execute(q, {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "provider": provider,
            "event_source": event_source,
            "event_type": event_type,
            "provider_object_id": provider_object_id,
            "payload_json": json.dumps(payload_json),
            "payload_hash": payload_hash,
        })
        return int(res.scalar_one())

    def mark_raw_event_processed(self, raw_event_id: int) -> None:
        self.db.execute(text("""
            UPDATE restaurant.pos_raw_event
            SET status = 'processed',
                processed_at = now()
            WHERE raw_event_id = :id
        """), {"id": raw_event_id})

    def mark_raw_event_failed(self, raw_event_id: int, error: str) -> None:
        self.db.execute(text("""
            UPDATE restaurant.pos_raw_event
            SET status = 'failed',
                processed_at = now(),
                error_message = :error
            WHERE raw_event_id = :id
        """), {"id": raw_event_id, "error": error[:1000]})

    # -----------------------------------------------------
    # CORE UPSERT
    # -----------------------------------------------------
    def upsert_order_graph(
    self,
    *,
    tenant_id: str,
    location_id: int,
    pos_connection_id: int,
    raw_event_id: int,
    order: CanonicalOrder,
) -> int:
        res = self.db.execute(text("""
            UPDATE restaurant.fact_order
            SET order_ts = :order_ts,
                order_date = :order_date,
                order_channel = :order_channel,
                order_status = :order_status,
                gross_sales = :gross_sales,
                discount_amount = :discount_amount,
                net_sales = :net_sales,
                customer_count = :customer_count,
                external_location_id = :external_location_id,
                pos_connection_id = :pos_connection_id,
                raw_event_id = :raw_event_id,
                opened_at_utc = :opened_at_utc,
                closed_at_utc = :closed_at_utc,
                tax_amount = :tax_amount,
                tip_amount = :tip_amount,
                service_charge_amount = :service_charge_amount,
                currency_code_pos = :currency_code_pos,
                provider_updated_at_utc = :provider_updated_at_utc,
                customer_external_id = :customer_external_id
            WHERE tenant_id = :tenant_id
            AND location_id = :location_id
            AND provider = :provider
            AND provider_order_id = :provider_order_id
            RETURNING order_id
        """), {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "provider": order.provider,
            "provider_order_id": order.provider_order_id,
            "order_ts": order.order_ts,
            "order_date": order.order_date,
            "order_channel": order.order_channel,
            "order_status": order.order_status,
            "gross_sales": self._n(order.gross_sales),
            "discount_amount": self._n(order.discount_amount),
            "net_sales": self._n(order.net_sales),
            "customer_count": order.customer_count,
            "external_location_id": order.external_location_id,
            "pos_connection_id": pos_connection_id,
            "raw_event_id": raw_event_id,
            "opened_at_utc": order.opened_at_utc,
            "closed_at_utc": order.closed_at_utc,
            "tax_amount": self._n(order.tax_amount),
            "tip_amount": self._n(order.tip_amount),
            "service_charge_amount": self._n(order.service_charge_amount),
            "currency_code_pos": order.currency_code_pos,
            "provider_updated_at_utc": order.provider_updated_at_utc,
            "customer_external_id": order.customer_external_id,
        })

        row = res.first()

        if row:
            order_id = int(row[0])
        else:
            res = self.db.execute(text("""
            INSERT INTO restaurant.fact_order (
                tenant_id,
                location_id,
                order_ts,
                order_date,
                order_channel,
                order_status,
                gross_sales,
                discount_amount,
                net_sales,
                customer_count,
                provider,
                provider_order_id,
                external_location_id,
                pos_connection_id,
                raw_event_id,
                opened_at_utc,
                closed_at_utc,
                tax_amount,
                tip_amount,
                service_charge_amount,
                currency_code_pos,
                provider_updated_at_utc,
                customer_external_id
            )
            VALUES (
                :tenant_id,
                :location_id,
                :order_ts,
                :order_date,
                :order_channel,
                :order_status,
                :gross_sales,
                :discount_amount,
                :net_sales,
                :customer_count,
                :provider,
                :provider_order_id,
                :external_location_id,
                :pos_connection_id,
                :raw_event_id,
                :opened_at_utc,
                :closed_at_utc,
                :tax_amount,
                :tip_amount,
                :service_charge_amount,
                :currency_code_pos,
                :provider_updated_at_utc,
                :customer_external_id
            )
            RETURNING order_id
        """), {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "order_ts": order.order_ts,
            "order_date": order.order_date,
            "order_channel": order.order_channel,
            "order_status": order.order_status,
            "gross_sales": self._n(order.gross_sales),
            "discount_amount": self._n(order.discount_amount),
            "net_sales": self._n(order.net_sales),
            "customer_count": order.customer_count,
            "provider": order.provider,
            "provider_order_id": order.provider_order_id,
            "external_location_id": order.external_location_id,
            "pos_connection_id": pos_connection_id,
            "raw_event_id": raw_event_id,
            "opened_at_utc": order.opened_at_utc,
            "closed_at_utc": order.closed_at_utc,
            "tax_amount": self._n(order.tax_amount),
            "tip_amount": self._n(order.tip_amount),
            "service_charge_amount": self._n(order.service_charge_amount),
            "currency_code_pos": order.currency_code_pos,
            "provider_updated_at_utc": order.provider_updated_at_utc,
            "customer_external_id": order.customer_external_id,
        })
        order_id = int(res.scalar_one())

        self.db.execute(
            text("DELETE FROM restaurant.fact_order_item WHERE order_id = :id"),
            {"id": order_id},
        )
        self.db.execute(
            text("DELETE FROM restaurant.fact_order_payment WHERE order_id = :id"),
            {"id": order_id},
        )

        for item in order.items:
            self.db.execute(text("""
            INSERT INTO restaurant.fact_order_item (
                order_id,
                tenant_id,
                location_id,
                quantity,
                unit_price,
                line_revenue
            )
            VALUES (
                :order_id,
                :tenant_id,
                :location_id,
                :qty,
                :price,
                :rev
            )
        """), {
            "order_id": order_id,
            "tenant_id": tenant_id,
            "location_id": location_id,
            "qty": item.quantity,
            "price": self._n(item.unit_price),
            "rev": self._n(item.line_revenue),
        })

        for pay in order.payments:
            self.db.execute(text("""
                INSERT INTO restaurant.fact_order_payment (
                    order_id,
                    tenant_id,
                    location_id,
                    amount,
                    payment_method
            )
            VALUES (
                :order_id,
                :tenant_id,
                :location_id,
                :amount,
                :method
            )
        """), {
            "order_id": order_id,
            "tenant_id": tenant_id,
            "location_id": location_id,
            "amount": self._n(pay.amount),
            "method": pay.payment_method,
        })

        return order_id
    # -----------------------------------------------------
    # SYNC JOB LOGGING (Observability / Monitoring)
    # -----------------------------------------------------
    def create_sync_job_log(
        self,
        *,
        tenant_id: str,
        location_id: int,
        provider: str,
        resource_name: str,
        run_type: str = "manual",
    ) -> int:
        res = self.db.execute(text("""
            INSERT INTO restaurant.pos_sync_job_log (
                tenant_id,
                location_id,
                provider,
                resource_name,
                run_type,
                started_at,
                status
            )
            VALUES (
                :tenant_id,
                :location_id,
                :provider,
                :resource_name,
                :run_type,
                now(),
                'running'
            )
            RETURNING sync_job_id
        """), {
            "tenant_id": tenant_id,
            "location_id": location_id,
            "provider": provider,
            "resource_name": resource_name,
            "run_type": run_type,
        })
        return int(res.scalar_one())

    def finalize_sync_job_log(
        self,
        *,
        sync_job_id: int,
        status: str,
        records_fetched: int = 0,
        records_processed: int = 0,
        records_failed: int = 0,
        error_message: str | None = None,
    ) -> None:
        self.db.execute(text("""
            UPDATE restaurant.pos_sync_job_log
            SET completed_at = now(),
                status = :status,
                records_fetched = :records_fetched,
                records_processed = :records_processed,
                records_failed = :records_failed,
                error_message = :error_message
            WHERE sync_job_id = :sync_job_id
        """), {
            "sync_job_id": sync_job_id,
            "status": status,
            "records_fetched": records_fetched,
            "records_processed": records_processed,
            "records_failed": records_failed,
            "error_message": error_message,
        })

    # -----------------------------------------------------
    # UTIL
    # -----------------------------------------------------
    def _n(self, v: Decimal | int | float | None) -> Decimal:
        if v is None:
            return Decimal("0")
        if isinstance(v, Decimal):
            return v
        return Decimal(str(v))