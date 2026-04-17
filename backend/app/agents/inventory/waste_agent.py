"""
Valora AI — WasteAgent
STATUS: Placeholder — Option 5
FRAMEWORK: LangChain anomaly detection + recommendation chain
DEPENDS ON: waste_amount in f_location_daily_features (already tracked)

Monitors food waste patterns and generates reduction recommendations.

Current data available:
  f_location_daily_features.waste_amount  ← already in pipeline
  f_location_daily_features.waste_pct     ← already in pipeline

Future data needed:
  ingredient-level waste (requires manual entry or IoT scale)

Detects:
  - Waste spike (>2x 7d avg)
  - Chronic waste (>5% of revenue for >7 consecutive days)
  - Day-specific waste patterns (e.g. Mondays always high)

Output: waste reduction brief + prep quantity adjustments
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from typing import Any

class WasteAgent(BaseAgent):
    name = "waste_agent"
    domain = "inventory"
    status = "placeholder"

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        return self.build_result(tenant_id, location_id,
            outputs={
                "status": "placeholder",
                "description": "Waste pattern detection + prep quantity recommendations",
                "data_available": ["waste_amount", "waste_pct"],
                "data_needed": ["ingredient_level_waste"],
            })
