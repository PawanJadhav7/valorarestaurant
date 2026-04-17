"""
Valora AI — InsightAgent
Wraps generate_insights.py as a proper BaseAgent.
Framework: LangChain (future) — currently Gemini direct.
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class InsightAgent(BaseAgent):
    name = "insight_agent"
    domain = "insights"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        # TODO: refactor scripts/generate_insights.py logic here
        return self.build_result(tenant_id, location_id,
            outputs={"message": "stub — wire generate_insights.py here"},
            signals_used=["revenue_trend", "gross_margin", "risk_signals"])
