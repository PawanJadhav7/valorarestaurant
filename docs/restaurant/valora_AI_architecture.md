                           ┌──────────────────────────────┐
                           │       Data Sources           │
                           │ POS / Sales / Labor / Inv    │
                           └──────────────┬───────────────┘
                                          │
                                          ▼
                    ┌──────────────────────────────────────────┐
                    │           Raw / Analytics Layer          │
                    │                                          │
                    │ analytics.fact_sales_daily               │
                    │ analytics.fact_labor_daily               │
                    │ analytics.fact_inventory_daily           │
                    └─────────────────┬────────────────────────┘
                                      │
                                      ▼
                    ┌──────────────────────────────────────────┐
                    │          Feature Store Layer             │
                    │                                          │
                    │ restaurant.f_location_daily_features     │
                    │                                          │
                    │ revenue / margin / food / labor          │
                    │ inventory / waste / stockouts            │
                    │ productivity / working capital           │
                    └─────────────────┬────────────────────────┘
                                      │
                                      ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                    AI Intelligence Layer                        │
        │                                                                 │
        │ ml.location_risk_daily                                          │
        │   → stockout_risk / waste_spike / inventory_stress / labor risk │
        │                                                                 │
        │ ml.recommended_action_daily                                     │
        │   → prevent_stockouts / reduce_kitchen_waste / rebalance_inv    │
        │                                                                 │
        │ ml.profit_opportunity_daily                                     │
        │   → estimated profit uplift                                     │
        │                                                                 │
        │ ml.insight_brief_daily                                          │
        │   → headline + summary narrative                                │
        └──────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                 Serving / Read Model Layer                      │
        │                                                                 │
        │ ml.mv_dashboard_location_daily                                  │
        │ ml.mv_dashboard_top_risks                                       │
        │ ml.mv_dashboard_top_actions                                     │
        │ ml.mv_dashboard_profit_opportunity                              │
        │ ml.mv_dashboard_insight_briefs                                  │
        │ ml.mv_dashboard_forecast_trend                                  │
        │ ml.mv_valora_control_tower                                      │
        └──────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                        API Layer                                │
        │                                                                 │
        │ FastAPI: app/api/valora_dashboard.py                            │
        │                                                                 │
        │ /api/dashboard/home                                             │
        │ /api/dashboard/kpis                                             │
        │ /api/dashboard/risks                                            │
        │ /api/dashboard/actions                                          │
        │ /api/dashboard/opportunities                                    │
        │ /api/dashboard/insights                                         │
        │ /api/dashboard/forecast                                         │
        │ /api/dashboard/control-tower                                    │
        │ /api/dashboard/alerts                                           │
        └──────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                      Frontend Layer                             │
        │                                                                 │
        │ Next.js                                                         │
        │                                                                 │
        │ /restaurant                     → overview dashboard            │
        │ /restaurant/location/[id]       → location drilldown           │
        │                                                                 │
        │ Components                                                      │
        │ KPI tiles / Control Tower / Alert Center / Insight sections     │
        └──────────────────────────┬──────────────────────────────────────┘
                                   │
                                   ▼
        ┌─────────────────────────────────────────────────────────────────┐
        │                    Operator Experience                          │
        │                                                                 │
        │ “Which location is at risk?”                                    │
        │ “What action should I take?”                                    │
        │ “How much profit can I recover?”                                │
        │ “Which stores are healthy?”                                     │
        └─────────────────────────────────────────────────────────────────┘