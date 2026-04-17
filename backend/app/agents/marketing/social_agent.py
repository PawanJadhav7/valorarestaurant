"""
Valora AI — SocialAgent
STATUS: Placeholder — Option 5
FRAMEWORK: LangChain content generation chain
CHANNELS: Instagram, Facebook, Google Business

Generates platform-specific social content triggered by:
  - Top performing item this week
  - Upcoming local event (events API)
  - Weather-based promotion (hot day → cold drinks promo)
  - Seasonal menu addition
  - Milestone (restaurant anniversary, 1000th order)

Each post is sized + toned per platform:
  Instagram: visual-first caption, 5 hashtags, emoji-friendly
  Facebook: longer copy, community tone, event link
  Google Business: factual, SEO-friendly, call to action
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class SocialAgent(BaseAgent):
    name = "social_agent"
    domain = "marketing"
    status = "placeholder"

    PLATFORMS = ["instagram", "facebook", "google_business"]

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={
                "status": "placeholder",
                "description": "Social media content generation per platform",
                "framework": "LangChain",
                "platforms": self.PLATFORMS,
                "triggers": ["top_item", "local_event", "weather", "seasonal", "milestone"],
            })
