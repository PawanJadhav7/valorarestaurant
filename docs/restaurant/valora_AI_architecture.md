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


        # Valora AI Architecture: ML Layer vs Valora AI Engine

## Overview
Valora AI is built on a layered intelligence architecture that separates quantitative machine learning from decision intelligence. This separation ensures scalability, explainability, and production reliability.

---

## 1. ML Intelligence Layer

### Purpose
The ML Intelligence Layer generates structured predictive and analytical signals from operational and financial data.

### Responsibilities
- Forecasting (revenue, demand, labor)
- Anomaly detection
- Risk scoring (stockouts, cost overruns)
- Profit opportunity estimation
- Trend detection

### Output
Structured numerical signals such as:
- Risk scores
- Forecast values
- Confidence intervals
- Anomaly flags
- Profit uplift estimates

### Nature of Work
- Mathematical
- Statistical
- Model-driven
- Deterministic outputs

---

## 2. Valora AI Engine (Decision Intelligence Layer)

### Purpose
The Valora AI Engine transforms ML outputs and KPI data into actionable, explainable business insights.

### Responsibilities
- Context assembly (tenant, location, profile)
- Prompt generation
- Business interpretation of signals
- Recommendation generation
- Narrative insights for operators
- Action prioritization

### Output
Human-readable and structured decision outputs such as:
- Insight summaries
- Recommended actions
- Risk explanations
- Operational guidance

### Nature of Work
- Contextual reasoning
- Language generation
- Business logic driven
- Decision-oriented outputs

---

## 3. Architectural Relationship

### End-to-End Flow
Data Ingestion → KPI Layer → ML Intelligence Layer → Valora AI Engine → Persisted Insights → Dashboard

### Key Principle
ML generates signals.  
Valora AI Engine generates decisions.

---

## 4. Separation of Responsibilities

### ML Layer SHOULD NOT
- Generate business narratives
- Provide operator recommendations
- Perform contextual reasoning

### Valora AI Engine SHOULD NOT
- Perform forecasting math
- Train predictive models
- Compute raw statistical scores

---

## 5. Production Design Principle

### Prototype Model
“Generate insight on demand.”

### Production Model
“Generate, store, and serve insights after data refresh.”

---

## 6. Strategic Importance

The ML layer provides analytical intelligence.  
The Valora AI Engine provides decision intelligence.

Together, they form the core competitive advantage of the Valora platform.

## Sequence
1. Data ingestion completes
2. KPI/ML refresh completes
3. Materialized views refresh
4. AI generation job starts
5. ai.generation_run inserted
6. Per-location prompts built from ml.mv_valora_control_tower
7. LLM called only where necessary
8. ai.location_insight_daily written
9. ai.prompt_audit written
10. app.job_run_log updated


## Valora AI Persistence Architecture

Valora separates predictive intelligence from decision intelligence through dedicated `ml` and `ai` schemas.

The `ml` schema is responsible for quantitative model outputs, including forecasts, anomaly events, risk signals, recommended actions, profit opportunity estimates, and model governance artifacts. These outputs are exposed through serving views and materialized views such as `ml.mv_valora_control_tower`.

The `ai` schema is responsible for decision-intelligence persistence, including LLM generation runs, prompt audit metadata, persisted daily insight artifacts, interactive explanation logs, and future feedback capture. The `ai` layer consumes structured upstream facts from the `ml` layer and transforms them into explainable, user-facing operational guidance.

This layered design ensures:
- clear separation between prediction and explanation,
- stronger auditability and model lineage,
- better scalability of batch scoring versus LLM generation workloads,
- stable dashboard performance through persisted AI outputs,
- and fault isolation between ML refresh failures and AI serving failures.