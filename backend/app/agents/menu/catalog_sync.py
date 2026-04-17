"""
Valora AI — CatalogSync
STATUS: Placeholder — Priority next step (fixes Unknown Item)
TIMELINE: Option 3 — Part 1 (quick win)
DEPENDS ON: Square Items API + Clover Items API

Fetches full menu catalog from Square/Clover and populates
dim_menu_item with real item names, categories, and prices.

This fixes the "Unknown Item" problem in kpi/daily top_items.
Runs once on demand + on schedule (weekly catalog refresh).

Square endpoint: GET /v2/catalog/list?types=ITEM
Clover endpoint: GET /v3/merchants/{mid}/items
"""
from typing import Any

class CatalogSync:
    """Not an agent — a sync utility. Called by MenuAgent before scoring."""
    status = "placeholder"

    def sync_square(self, tenant_id: str, location_id: int, access_token: str) -> dict:
        """
        TODO: implement Square catalog fetch
        1. GET /v2/catalog/list?types=ITEM
        2. Upsert into restaurant.dim_menu_item
           ON CONFLICT (tenant_id, location_id, provider, provider_item_id)
           DO UPDATE SET item_name, category, base_price
        """
        return {"status": "placeholder", "items_synced": 0}

    def sync_clover(self, tenant_id: str, location_id: int, access_token: str) -> dict:
        """
        TODO: implement Clover items fetch
        1. GET /v3/merchants/{mid}/items
        2. Upsert into restaurant.dim_menu_item
        """
        return {"status": "placeholder", "items_synced": 0}
