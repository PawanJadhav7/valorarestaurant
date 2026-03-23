from __future__ import annotations

from .base import POSAdapter
from .schemas import CanonicalOrder, RawWebhookEnvelope


class SquareAdapter(POSAdapter):
    provider_name = "square"

    def __init__(self, base_url: str = "https://connect.squareupsandbox.com") -> None:
        self.base_url = base_url.rstrip("/")

    def fetch_orders_updated_since(
        self,
        *,
        access_token: str,
        external_location_id: str,
        cursor: str | None,
        limit: int = 100,
    ) -> tuple[list[CanonicalOrder], str | None]:
        raise NotImplementedError("Square adapter not implemented yet")

    def verify_webhook_signature(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
        secret: str,
    ) -> bool:
        raise NotImplementedError("Square webhook verification not implemented yet")

    def parse_webhook(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
    ) -> RawWebhookEnvelope:
        raise NotImplementedError("Square webhook parsing not implemented yet")