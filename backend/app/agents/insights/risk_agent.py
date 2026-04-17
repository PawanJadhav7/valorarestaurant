"""
Valora AI — RiskAgent
STATUS: Active (running in generate_insights.py)
NEXT: Refactor into LangChain tool-calling agent with
      configurable risk thresholds per tenant.

Detects operational risks from daily feature signals:
- Revenue decline (>15% vs 7d avg)
- Margin compression (gross margin <60%)
- Prime cost spike (>70%)
- Waste anomaly (>5% of revenue)
- Stockout pattern (>3 in a week)
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class RiskAgent(BaseAgent):
    name = "risk_agent"
    domain = "insights"
    status = "active"  # already running via generate_insights.py

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        # TODO: extract from scripts/generate_insights.py → risk detection logic
        return self.build_result(tenant_id, location_id,
            outputs={"status": "active — lives in generate_insights.py"},
            signals_used=["revenue_trend", "gross_margin", "prime_cost", "waste_pct"])
