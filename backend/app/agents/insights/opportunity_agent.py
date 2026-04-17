"""
Valora AI — OpportunityAgent
STATUS: Active (running in generate_insights.py)
NEXT: Expand opportunity types beyond revenue_momentum.
      Add: upsell_opportunity, slow_day_promo, peak_hour_extension.

Detects positive signals that can be amplified:
- Revenue momentum (growing >10% vs 14d avg)
- High-margin item performing well
- Repeat customer frequency increasing
- Slow day recovery opportunity
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class OpportunityAgent(BaseAgent):
    name = "opportunity_agent"
    domain = "insights"
    status = "active"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={"status": "active — lives in generate_insights.py"},
            signals_used=["revenue_momentum", "margin_trend", "customer_frequency"])
