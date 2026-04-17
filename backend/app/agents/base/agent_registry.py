"""
Valora AI — AgentRegistry
Central registry of all agents. Mirrors integrations/pos/registry.py.
"""
from __future__ import annotations
from typing import Type
from app.agents.base.base_agent import BaseAgent

_registry: dict[str, Type[BaseAgent]] = {}

def register(agent_cls: Type[BaseAgent]) -> Type[BaseAgent]:
    _registry[agent_cls.name] = agent_cls
    return agent_cls

def get_agent(name: str) -> Type[BaseAgent]:
    if name not in _registry:
        raise KeyError(f"Agent '{name}' not registered. Available: {list(_registry)}")
    return _registry[name]

def get_all() -> dict[str, Type[BaseAgent]]:
    return dict(_registry)

def get_by_domain(domain: str) -> list[Type[BaseAgent]]:
    return [cls for cls in _registry.values() if cls.domain == domain]
