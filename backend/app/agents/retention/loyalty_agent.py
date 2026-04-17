"""
Valora AI — LoyaltyAgent
STATUS: Placeholder — Requires Square Customers API
TIMELINE: Option 4
FRAMEWORK: LangChain
DEPENDS ON: customer_external_id in fact_order (already present)
            Square Customers API (GET /v2/customers/{id})

Builds guest loyalty profiles by linking orders to customer IDs.
Tracks: visit frequency, average spend, favourite items,
        lifetime value, last visit date.

Currently fact_order.customer_external_id is populated for
Square orders — this agent activates that data.
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class LoyaltyAgent(BaseAgent):
    name = "loyalty_agent"
    domain = "retention"
    status = "placeholder"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={
                "status": "placeholder",
                "description": "Guest loyalty profiling via Square Customers API",
                "framework": "LangChain",
                "depends_on": ["Square Customers API", "fact_order.customer_external_id"],
            })
