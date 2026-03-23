from __future__ import annotations

import hashlib
import json

from sqlalchemy.orm import Session

from .registry import POSAdapterRegistry
from .repositories import POSRepository


class POSIngestionService:
    """
    Orchestrates:
    Adapter → Raw Event → DB Upsert → Cursor → Job Log
    """

    def __init__(self, db: Session, registry: POSAdapterRegistry) -> None:
        self.db = db
        self.repo = POSRepository(db)
        self.registry = registry

    def sync_orders(
        self,
        *,
        tenant_id: str,
        location_id: int,
        provider: str,
    ) -> dict:
        job_id = self.repo.create_sync_job_log(
            tenant_id=tenant_id,
            location_id=location_id,
            provider=provider,
            resource_name="orders",
            run_type="manual",
        )

        try:
            conn = self.repo.get_connection(
                tenant_id,
                location_id,
                provider,
            )

            if not conn:
                raise ValueError("Active POS connection not found")

            adapter = self.registry.get(provider)

            cursor = self.repo.get_cursor(
                tenant_id,
                location_id,
                provider,
                "orders",
            )

            if conn["auth_type"] == "api_key":
                access_token = conn.get("api_key") or ""
            else:
                access_token = conn.get("access_token_encrypted") or ""

            orders, next_cursor = adapter.fetch_orders_updated_since(
                access_token=access_token,
                external_location_id=conn["external_location_id"],
                cursor=cursor,
                limit=100,
            )

            processed = 0
            failed = 0

            for order in orders:
                payload = order.model_dump(mode="json")

                payload_hash = hashlib.sha256(
                    json.dumps(payload, sort_keys=True).encode("utf-8")
                ).hexdigest()

                raw_event_id = self.repo.save_raw_event(
                    tenant_id=tenant_id,
                    location_id=location_id,
                    provider=provider,
                    event_source="poll",
                    event_type="order.sync",
                    provider_object_id=order.provider_order_id,
                    payload_json=payload,
                    payload_hash=payload_hash,
                )

                try:
                    self.repo.upsert_order_graph(
                        tenant_id=tenant_id,
                        location_id=location_id,
                        pos_connection_id=conn["pos_connection_id"],
                        raw_event_id=raw_event_id,
                        order=order,
                    )

                    self.repo.mark_raw_event_processed(raw_event_id)
                    processed += 1

                except Exception as e:
                    self.repo.mark_raw_event_failed(raw_event_id, str(e))
                    failed += 1
                except Exception:
                    raise

            self.repo.update_cursor(
                tenant_id=tenant_id,
                location_id=location_id,
                provider=provider,
                resource_name="orders",
                cursor_value=next_cursor or cursor,
            )

            self.repo.finalize_sync_job_log(
                sync_job_id=job_id,
                status="success",
                records_fetched=len(orders),
                records_processed=processed,
                records_failed=failed,
                error_message=None,
            )

            self.db.commit()

            return {
                "status": "success",
                "provider": provider,
                "tenant_id": tenant_id,
                "location_id": location_id,
                "processed_orders": processed,
                "failed_orders": failed,
                "next_cursor": next_cursor,
            }

        except Exception as e:
            self.db.rollback()
            self.repo.finalize_sync_job_log(
                sync_job_id=job_id,
                status="failed",
                records_fetched=0,
                records_processed=0,
                records_failed=1,
                error_message=str(e),
            )
            self.db.commit()
            raise

    def handle_webhook(
        self,
        *,
        provider: str,
        headers: dict[str, str],
        raw_body: bytes,
        tenant_id: str,
        location_id: int,
    ) -> dict:
        adapter = self.registry.get(provider)

        envelope = adapter.parse_webhook(
            headers=headers,
            raw_body=raw_body,
        )

        payload_hash = hashlib.sha256(raw_body).hexdigest()

        raw_event_id = self.repo.save_raw_event(
            tenant_id=tenant_id,
            location_id=location_id,
            provider=provider,
            event_source="webhook",
            event_type=envelope.event_type,
            provider_object_id=envelope.provider_object_id,
            payload_json=envelope.payload,
            payload_hash=payload_hash,
        )

        self.repo.mark_raw_event_processed(raw_event_id)
        self.db.commit() 
      

        return {
            "status": "webhook_received",
            "event_type": envelope.event_type,
        }