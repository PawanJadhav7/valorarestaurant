"""
Valora AI — ChurnAgent
Guest visit frequency decay → churn risk scoring → win-back actions.
Framework: LangGraph stateful loop: detect → score → flag → wait → recheck.
Data: fact_order customer_external_id + Square Customers API.
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class ChurnAgent(BaseAgent):
    name = "churn_agent"
    domain = "retention"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        # TODO: implement LangGraph stateful loop
        return self.build_result(tenant_id, location_id,
            outputs={"message": "stub — implement LangGraph loop here"},
            signals_used=["visit_frequency", "recency", "spend_trend"])
