"""
Valora AI — BaseAgent
Every agent inherits from this. Mirrors integrations/pos/base.py pattern.
"""
from __future__ import annotations
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any
import logging


@dataclass
class AgentResult:
    agent_name: str
    tenant_id: str
    location_id: int
    status: str                        # "success" | "partial" | "failed"
    outputs: dict[str, Any]
    signals_used: list[str] = field(default_factory=list)
    actions_generated: list[dict] = field(default_factory=list)
    errors: list[str] = field(default_factory=list)
    ran_at: datetime = field(default_factory=datetime.utcnow)
    duration_ms: int = 0

    def to_dict(self) -> dict:
        return {
            "agent": self.agent_name,
            "tenant_id": self.tenant_id,
            "location_id": self.location_id,
            "status": self.status,
            "outputs": self.outputs,
            "signals_used": self.signals_used,
            "actions_generated": self.actions_generated,
            "errors": self.errors,
            "ran_at": self.ran_at.isoformat(),
            "duration_ms": self.duration_ms,
        }


class BaseAgent(ABC):
    name: str = "base_agent"
    domain: str = "base"

    def __init__(self):
        self.logger = logging.getLogger(f"valora.agents.{self.domain}.{self.name}")

    @abstractmethod
    def run(self, tenant_id: str, location_id: int, context: dict[str, Any]) -> AgentResult:
        ...

    def build_result(self, tenant_id, location_id, status="success",
                     outputs=None, signals_used=None, actions=None, errors=None) -> AgentResult:
        return AgentResult(
            agent_name=self.name, tenant_id=tenant_id, location_id=location_id,
            status=status, outputs=outputs or {}, signals_used=signals_used or [],
            actions_generated=actions or [], errors=errors or [],
        )
