"""
Valora AI — BriefAgent
STATUS: Active (running in generate_insights.py via Gemini)
NEXT: Migrate to LangChain with multi-model support
      (Gemini → Claude → GPT fallback chain).
      Add brief personalization per owner communication style.

Synthesises risk + opportunity signals into a
human-readable daily brief with headline + summary + actions.
Writes to: ml.insight_brief_daily
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class BriefAgent(BaseAgent):
    name = "brief_agent"
    domain = "insights"
    status = "active"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={"status": "active — Gemini via generate_insights.py"},
            signals_used=["risks", "opportunities", "recommended_actions"])
