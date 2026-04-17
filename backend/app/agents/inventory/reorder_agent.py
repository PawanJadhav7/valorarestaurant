"""
Valora AI — ReorderAgent
Demand forecast → reorder quantities → supplier draft emails.
Framework: CrewAI (forecast role + buyer role).
Data: fact_order_item + demand_forecast + supplier API.
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class ReorderAgent(BaseAgent):
    name = "reorder_agent"
    domain = "inventory"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        # TODO: implement CrewAI forecast+buyer crew
        return self.build_result(tenant_id, location_id,
            outputs={"message": "stub — implement CrewAI crew here"},
            signals_used=["demand_forecast", "current_stock", "lead_time"])
