"""
Valora AI — PromoAgent
STATUS: Placeholder — Option 5
FRAMEWORK: LangChain + LangGraph (promo scheduling loop)

Designs and schedules promotional offers based on:
  - Slow day detection (Tuesday lunch is always quiet)
  - Inventory surplus (too much of an ingredient → feature it)
  - Revenue gap to monthly target
  - Competitor activity signals (future)

Output:
  - Promo offer structure (discount, BOGO, bundle)
  - Timing recommendation (day + hour)
  - Expected revenue lift estimate
  - Draft marketing copy for SocialAgent
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class PromoAgent(BaseAgent):
    name = "promo_agent"
    domain = "marketing"
    status = "placeholder"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={
                "status": "placeholder",
                "description": "Promotional offer design + scheduling",
                "framework": "LangChain + LangGraph",
                "depends_on": ["slow_day_detection", "inventory_surplus", "revenue_gap"],
            })
