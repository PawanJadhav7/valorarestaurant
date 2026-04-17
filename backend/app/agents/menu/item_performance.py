"""
Valora AI — ItemPerformance
STATUS: Placeholder — Next build after insights tuning
TIMELINE: Option 3 (after 30 days of data)
DEPENDS ON: Square Items/Catalog API (fixes Unknown Item problem)

Scores every menu item on 4 dimensions:
  velocity    — how often it sells vs category average
  margin      — item contribution margin vs location avg
  sentiment   — guest feedback signals (future: review scraping)
  trend       — 7d vs 30d velocity change

Output feeds MenuAgent and PricingAgent.
DB: reads fact_order_item + dim_menu_item
    writes ml.item_performance_daily (table to be created)
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class ItemPerformanceAgent(BaseAgent):
    name = "item_performance_agent"
    domain = "menu"
    status = "placeholder"

    SCORE_DIMENSIONS = ["velocity", "margin", "sentiment", "trend"]

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            status="success",
            outputs={
                "status": "placeholder",
                "description": "Item performance scoring — builds after Square catalog API",
                "score_dimensions": self.SCORE_DIMENSIONS,
                "depends_on": ["Square Items API", "fact_order_item", "dim_menu_item"],
            })
