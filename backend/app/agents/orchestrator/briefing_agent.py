"""
Valora AI — BriefingAgent
STATUS: Placeholder — builds after 3+ domain agents active
FRAMEWORK: LangChain summarisation chain

Synthesises outputs from all domain agents into a single
daily owner briefing. Delivered via:
  - Dashboard (already wired: ml.insight_brief_daily)
  - Email digest (SendGrid — Option 3 alert delivery)
  - Push notification (Firebase — future)
  - WhatsApp/SMS (Twilio — future)

Briefing structure:
  1. Performance headline (1 line)
  2. Top 3 risks (if any)
  3. Top 3 opportunities
  4. Recommended actions (ranked by ROI)
  5. Agent activity summary (what each agent found)
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class BriefingAgent(BaseAgent):
    name = "briefing_agent"
    domain = "orchestrator"
    status = "placeholder"

    DELIVERY_CHANNELS = ["dashboard", "email", "push", "sms"]

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={
                "status": "placeholder",
                "description": "Daily owner briefing synthesised from all agent outputs",
                "framework": "LangChain summarisation chain",
                "channels": self.DELIVERY_CHANNELS,
            })
