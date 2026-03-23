from __future__ import annotations

from .base import POSAdapter


class POSAdapterRegistry:
    """
    Registry to manage multiple POS providers.
    """

    def __init__(self) -> None:
        self._adapters: dict[str, POSAdapter] = {}

    def register(self, adapter: POSAdapter) -> None:
        key = adapter.provider_name.lower()
        self._adapters[key] = adapter

    def get(self, provider: str) -> POSAdapter:
        key = provider.lower()

        if key not in self._adapters:
            raise ValueError(f"No adapter registered for provider={provider}")

        return self._adapters[key]

    def list_providers(self) -> list[str]:
        return list(self._adapters.keys())