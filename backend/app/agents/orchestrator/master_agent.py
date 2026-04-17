"""
Valora AI — MasterAgent
Coordinates all domain agents → daily owner briefing.
Framework: CrewAI manager role.
Pattern: run all domain agents, collect outputs, synthesise.
"""
from app.agents.base.base_agent import BaseAgent, AgentResult
from app.agents.base.agent_registry import get_by_domain
from typing import Any

class MasterAgent(BaseAgent):
    name = "master_agent"
    domain = "orchestrator"
    DOMAINS = ["insights", "menu", "retention", "marketing", "inventory"]

    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        all_outputs, all_actions, errors = {}, [], []
        for domain in self.DOMAINS:
            for agent_cls in get_by_domain(domain):
                try:
                    result = agent_cls().run(tenant_id, location_id, context)
                    all_outputs[agent_cls.name] = result.outputs
                    all_actions.extend(result.actions_generated)
                except Exception as e:
                    errors.append(f"{agent_cls.name}: {str(e)}")
        return self.build_result(tenant_id, location_id,
            status="partial" if errors else "success",
            outputs=all_outputs, actions=all_actions, errors=errors)
