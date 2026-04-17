"""
Valora AI — MenuAgent
Item performance scoring → price/retire/promote recommendations.
Framework: LangChain. Data: fact_order_item + dim_menu_item + Square catalog.
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class MenuAgent(BaseAgent):
    name = "menu_agent"
    domain = "menu"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        # TODO: query fact_order_item, score items, call LangChain chain
        return self.build_result(tenant_id, location_id,
            outputs={"message": "stub — implement item scoring here"},
            signals_used=["item_velocity", "item_margin", "item_sentiment"])
