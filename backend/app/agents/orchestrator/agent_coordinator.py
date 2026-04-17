"""
Valora AI — AgentCoordinator
STATUS: Placeholder — builds when 3+ agents are active
FRAMEWORK: CrewAI manager role

Determines the execution order of agents per run cycle.
Handles dependencies: e.g. ItemPerformanceAgent must run
before PricingAgent and MenuAgent.

Execution DAG (planned):
  1. ItemPerformanceAgent  (menu domain — scores items)
  2. LoyaltyAgent          (retention — builds guest profiles)
     InsightAgent          (insights — runs in parallel)
  3. RiskAgent             (depends on InsightAgent)
     ChurnAgent            (depends on LoyaltyAgent)
     MenuAgent             (depends on ItemPerformanceAgent)
  4. PricingAgent          (depends on MenuAgent)
     WinbackAgent          (depends on ChurnAgent)
     WasteAgent            (depends on inventory data)
  5. CampaignAgent         (depends on top items + promo signals)
     ReorderAgent          (depends on WasteAgent + demand)
  6. MasterAgent           (synthesises all outputs → briefing)
"""

EXECUTION_DAG = {
    "phase_1": ["item_performance_agent", "loyalty_agent", "insight_agent"],
    "phase_2": ["risk_agent", "churn_agent", "menu_agent"],
    "phase_3": ["pricing_agent", "winback_agent", "waste_agent"],
    "phase_4": ["campaign_agent", "reorder_agent"],
    "phase_5": ["master_agent"],
    "framework": "CrewAI",
    "status": "placeholder",
}
