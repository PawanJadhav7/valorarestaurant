from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Tuple, List

from .schemas import CanonicalOrder, RawWebhookEnvelope


class POSAdapter(ABC):
    """
    Base contract for all POS providers (Clover, Toast, Square, etc.)
    """

    provider_name: str

    # -----------------------------
    # POLLING (batch sync)
    # -----------------------------
    @abstractmethod
    async def fetch_orders_updated_since(
        self,
        *,
        access_token: str,
        external_location_id: str,
        cursor: str | None,
        limit: int = 100,
    ) -> Tuple[List[CanonicalOrder], str | None]:
        """
        Fetch orders updated since last cursor.

        Returns:
            (orders, next_cursor)
        """
        raise NotImplementedError

    # -----------------------------
    # WEBHOOK SECURITY
    # -----------------------------
    @abstractmethod
    def verify_webhook_signature(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
        secret: str,
    ) -> bool:
        """
        Validate webhook authenticity.
        """
        raise NotImplementedError

    # -----------------------------
    # WEBHOOK PARSING
    # -----------------------------
    @abstractmethod
    def parse_webhook(
        self,
        *,
        headers: dict[str, str],
        raw_body: bytes,
    ) -> RawWebhookEnvelope:
        """
        Convert provider webhook → canonical envelope
        """
        raise NotImplementedError