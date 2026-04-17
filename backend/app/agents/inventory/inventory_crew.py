"""
Valora AI — InventoryCrew
STATUS: Placeholder — Option 5
FRAMEWORK: CrewAI (two-role crew)

The full inventory optimization workflow as a CrewAI crew.

Roles:
  ForecastAnalyst   — reads demand_forecast + fact_order_item
                      determines what will be needed next 7 days
                      tools: DB query, forecast model

  InventoryBuyer    — takes ForecastAnalyst output
                      checks current stock levels
                      calculates reorder quantities
                      drafts supplier orders
                      tools: stock API, SupplierAgent

Manager (CrewAI):
  Resolves conflicts between forecast and budget constraints.
  Routes final order list for owner approval if above threshold.

Output: approved reorder list → SupplierAgent → email/API
"""

CREW_DEFINITION = {
    "framework": "CrewAI",
    "status": "placeholder",
    "roles": {
        "ForecastAnalyst": {
            "goal": "Determine ingredient demand for next 7 days",
            "tools": ["db_query", "demand_forecast_model"],
            "inputs": ["fact_order_item", "ml.forecast_daily"],
        },
        "InventoryBuyer": {
            "goal": "Calculate reorder quantities and draft supplier orders",
            "tools": ["stock_api", "supplier_agent", "email_tool"],
            "inputs": ["ForecastAnalyst.output", "current_stock_levels"],
        },
    },
    "manager": "CrewAI built-in manager",
    "output": "reorder_list → owner_approval → supplier_dispatch",
}
