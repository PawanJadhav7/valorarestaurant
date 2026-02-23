# Valora Restaurant — AI Framework

> Purpose: Operate the restaurant in a continuously “profitable range” by ingesting daily operational data, computing KPI health, detecting risks early, prescribing actions, and simulating “what-if” outcomes. The system must deliver timely, severity-based notifications and maintain auditable, board-grade trust.

---

## 1) Goals and Non-Goals

### Goals
- **Daily refresh** of all operational KPIs and profitability drivers.
- **Insight generation** from current trends + historical patterns (drivers, deltas, narratives).
- **Risk & warning detection** with severity scoring and escalation.
- **Prescriptive actions** to minimize loss / improve margins (pricing, labor, purchasing, waste, menu mix).
- **What-if simulation** to preview trend changes and projected impact when an owner chooses an option.
- **Closed-loop learning**: track actions taken and measure post-action outcomes.

### Non-Goals (initially)
- Perfect causal inference on day 1 (start with robust heuristics + evolve to causal/uplift).
- Fully autonomous execution (system recommends; owner approves unless future automation is explicitly enabled).
- Real-time per-transaction decisioning (optional later; MVP is daily + near-real-time alerts where feasible).

---

## 2) Core Capabilities (End-to-End Loop)

1. **Ingest** daily (and optional near-real-time) data from POS, labor, inventory, vendors, reservations, and context (weather/events).
2. **Validate & reconcile** data quality (completeness, totals, anomalies, schema).
3. **Transform & model** into canonical marts (sales, labor, inventory, profitability).
4. **Compute KPIs** deterministically (dbt/SQL), producing “board-ready” metrics.
5. **Forecast** demand and cost drivers (7/14/30 day horizons) with confidence intervals.
6. **Detect** anomalies and risks (food cost drift, labor inefficiency, shrink/waste, discount leakage, stockout risk).
7. **Recommend actions** (playbooks + optimization) and generate “why” explanations.
8. **Simulate what-if** outcomes per action (expected KPI trajectory + profit delta + confidence band).
9. **Notify** based on severity (Info/Watch/Warn/Critical) across channels (in-app/email/SMS).
10. **Track actions taken** and measure realized uplift; feed learnings back to models.

---

## 3) Data Sources

### Operational Sources
- **POS**: check headers, line items, modifiers, discounts, comps, voids, refunds, tenders, taxes, channel (dine-in/delivery).
- **Inventory**: on-hand, receipts, transfers, counts, usage, waste/spoilage, shrink, recipe/BOM (menu item → ingredients).
- **Purchasing/Vendors**: invoices, SKU pricing, lead time, fill rate, substitutions, delivery schedule.
- **Labor / Scheduling**: scheduled vs actual hours, wages, role mix, overtime, tip pools (where applicable).
- **Reservations / Footfall**: bookings, covers, no-shows, table turns, waitlist.
- **Delivery Platforms**: fees, commissions, refunds, rating impact signals (optional).
- **Context**: weather, holidays, local events, seasonality indicators.

### Master Data
- Item master, SKU master, recipe/BOM, category hierarchies, store/venue metadata, cost centers.

---

## 4) Data Architecture (Lakehouse)

### Storage Layers
- **Bronze (Raw)**: source-aligned tables, minimal changes (for audit & reprocessing).
- **Silver (Cleaned/Conformed)**: standard schemas, canonical IDs, timestamps, currency, deduplication.
- **Gold (Marts)**: analytics-ready star schemas + KPI rollups (daily/weekly/monthly).

### Key Gold Marts
- `sales_mart`: revenue, units, mix, discounts, comps/voids, channel split.
- `labor_mart`: hours, labor cost, SPLH (sales per labor hour), productivity.
- `inventory_mart`: usage, waste, shrink, stockouts, par compliance.
- `profitability_mart`: COGS estimates, gross margin, prime cost, contribution margin by category/item.

### Orchestration
- Airflow/Prefect scheduled daily pipelines (with backfill).
- Optional streaming for POS events (enables near-real-time alerts).

### Data Quality & Reconciliation
- Completeness checks (missing day = **Critical**).
- Reconcile POS sales vs payment/tender totals.
- Inventory variance checks (count vs expected usage).
- Vendor invoice completeness and price-change detection.

---

## 5) Core Data Model (Minimum Required Tables)

### Facts
- `fact_sales_line_item`  
  - grain: (date_time, store, check_id, item_id)  
  - fields: qty, gross_sales, net_sales, discount, comp, void_flag, channel
- `fact_sales_check`  
  - totals at check level, taxes, tips, payment types
- `fact_inventory_movement`  
  - receipts, usage, waste, counts, transfers by SKU and date
- `fact_vendor_invoice`  
  - sku, unit_cost, qty, delivery_date, fill_rate, vendor_id
- `fact_labor_shift`  
  - role, scheduled_hours, actual_hours, wage_cost, overtime
- `fact_reservations`  
  - covers, no_show, channel, duration, table turns
- `fact_actions_taken`  
  - action_id, timestamp, parameters, owner_id, location, expected_impact, realized_impact

### Dimensions
- `dim_item` (menu item) and `dim_sku` (ingredient/SKU)
- `dim_recipe_bom` (item → SKU usage)
- `dim_store` / `dim_location`
- `dim_calendar` (holiday/event flags, seasonality features)
- `dim_vendor`

---

## 6) KPI Engine

### Deterministic KPI Computation
Compute using SQL/dbt, producing daily and MTD views:
- **Gross Margin %**
- **Food Cost %** (COGS / net sales)
- **Labor Cost %**
- **Prime Cost %** (COGS + labor) / net sales
- **Contribution margin** by category/item
- **Discount / comp / void rates**
- **Inventory days on hand**
- **Waste rate** (waste $ / purchases $ or usage $)
- **Sales per labor hour (SPLH)**
- **Table turns / seat utilization** (if relevant)

### Baselines & Targets
- Baselines are learned per store (and optionally day-of-week/season).
- Targets are configurable (per concept, region, segment).

---

## 7) AI/ML Layer (Model Families)

### 7.1 Forecasting (Demand & Costs)
**Purpose:** Predict the next 7/14/30 days for sales, covers, labor needs, COGS drivers.  
- Outputs: forecasts + confidence intervals + driver signals.
- Typical models: gradient boosting, time series (StatsForecast/Prophet), hierarchical forecasts.

### 7.2 Anomaly & Risk Detection
**Purpose:** Identify abnormal behaviors early and quantify risk.  
Examples:
- Food cost drift, waste spike, shrink anomalies
- Discount leakage, void/refund spikes
- Labor overstaffing vs demand or understaffing risk (service degradation proxy)
- Stockout probability for high-selling SKUs or critical ingredients

Outputs:
- anomaly score
- impacted KPI(s)
- estimated $ impact range
- explanation (top contributors)

### 7.3 Prescriptive Recommendations (Actions) + What-if Simulation
**Purpose:** Recommend interventions and show expected KPI trajectory and profit delta if chosen.

Actions library (examples):
- Pricing adjustments (by category/item)
- Promo mix changes (reduce cannibalization)
- Vendor swap or reorder strategy adjustments
- Par-level and prep planning
- Staffing and shift-mix optimization
- Menu engineering (push high-margin items)

What-if simulator:
- Accepts: baseline state + action parameters
- Applies: response functions (elasticity, waste reduction curves, labor productivity curves)
- Returns: updated forecast path, KPI trajectory, profit delta + confidence band

> MVP uses heuristics + learned elasticities from historical changes. V2 introduces causal/uplift models and constrained optimization.

---

## 8) Insight Generation (Narratives + Driver Attribution)

### Driver Attribution
- Decompose KPI changes into drivers:
  - vendor price changes
  - recipe usage variance
  - waste/shrink contributions
  - channel mix shifts
  - discount leakage
  - labor efficiency variance

### Narrative Templates (examples)
- “Food cost rose **+1.2 pts** vs baseline; primary drivers were **dairy price +12%** and **waste +8%** in prep line.”
- “Stockout risk 72% for top ingredient cluster; projected lost sales: $X–$Y.”

---

## 9) Severity Scoring & Notifications

### Severity Levels
- **Info**: low impact, low urgency (in-app).
- **Watch**: early drift, moderate confidence (email summary).
- **Warn**: likely impact, action recommended soon (email + push).
- **Critical**: high impact and/or compliance/financial risk (SMS + push + escalation).

### Severity Function (recommended)
`severity = f(estimated_impact_$, confidence, persistence, business_criticality, reversibility)`

- **estimated_impact_$**: projected weekly/monthly loss/gain
- **confidence**: model confidence / anomaly certainty
- **persistence**: how many days trend persists
- **criticality**: whether it affects core operations (stockouts, cash, compliance)
- **reversibility**: how quickly an action can correct the issue

### Notification Routing
- Critical → SMS + push + on-call escalation (optional)
- Warn → push + email
- Watch → email digest
- Info → in-app only

### Alert Hygiene
- Deduping + cooldown windows
- Grouping related alerts into a single incident
- “Snooze” and “resolved” states
- Full audit trail: data inputs, model version, action recommendation history

---

## 10) Serving Layer (APIs) & UI Modules

### Core APIs
- `GET /kpis?date=YYYY-MM-DD`
- `GET /insights?date=...`
- `GET /risks?severity>=...`
- `POST /whatif` (baseline context + action parameters)
- `POST /actions/commit` (owner accepted action)
- `GET /actions/history`

### UI Modules
- **Today’s Health**: KPI tiles + deltas vs baseline
- **Risks & Warnings**: sortable queue with severity, impact, confidence
- **Recommended Actions**: ranked by ROI/impact and feasibility
- **What-if Studio**: pick action → view trend preview and profit delta
- **Action Tracking**: adopted actions + realized outcomes

---

## 11) Closed-Loop Learning

### Action Tracking
Every recommended action should have:
- expected impact range
- assumptions (elasticity, waste reduction %, staffing response)
- confidence and model version
- owner decision (accepted/rejected/modified)
- realized outcome after a defined evaluation window

### Post-Action Evaluation
- Compare actual KPIs to counterfactual baseline forecast
- Update priors/elasticities; refine playbooks
- Detect when “best action” changes under new regime (drift)

---

## 12) Observability, Governance, and Trust

### Data Observability
- Great Expectations / custom checks
- pipeline SLAs and freshness monitoring
- automatic incident creation for missing feeds

### Model Monitoring
- forecast error (MAPE) tracked by store/category
- drift detection on key features
- alert precision/recall proxy using owner feedback (“useful/not useful”)

### Auditability
- Each insight/alert includes “why,” “data used,” “confidence,” “recommended actions,” “assumptions.”
- Keep historical versions of KPIs and model outputs.

### Security & Access
- RBAC by store/region/role
- PII minimization (restaurant ops typically minimal, but payment data must be tokenized)
- encryption at rest and in transit

---

## 13) Suggested Technology Stack (Cloud-Neutral)

- **Ingestion**: Fivetran/Airbyte + custom connectors (POS, vendors)
- **Orchestration**: Airflow/Prefect
- **Storage**: S3/ADLS/GCS + Lakehouse (Databricks) or DW (Snowflake/BigQuery)
- **Transform**: dbt
- **ML**: Python (sklearn/XGBoost/StatsForecast/Prophet; optional PyTorch)
- **Serving**: FastAPI + feature store optional (Feast)
- **Notifications**: SNS/Twilio/SendGrid + in-app push
- **Observability**: Great Expectations + OpenTelemetry + dashboards

---

## 14) Roadmap

### MVP (fast path)
- Daily ingestion + Gold marts
- KPI engine + baseline thresholds
- Demand forecasting (7/14 days)
- Basic anomaly detection
- 10–15 action playbooks
- What-if simulator (heuristic + learned elasticity where possible)
- Severity notifications + action tracking

### V2 (high-leverage AI)
- Causal/uplift models for promos and pricing
- Constrained optimization (maximize profit under labor/inventory constraints)
- Item-level substitution effects
- Automated daily executive narrative summaries

---

## 15) Example Owner Experience (Operational)

**Critical alert (SMS + app):**  
“Food cost projected to exceed 37% within 5 days (confidence 0.82). Drivers: dairy price ↑12%, waste ↑8%. Estimated impact: -$2.4k/week.”

**Actions with what-if:**
1. Reduce dairy reorder 10% + adjust par levels → food cost -0.6 pts, waste -8%  
2. Vendor swap for dairy SKUs → food cost -1.1 pts, lead time +1 day  
3. Price +2% on top 8 dairy-heavy items → margin +$1.05k/week, demand -0.4%  

Owner selects #3 → trend preview updates KPI trajectory + profit delta band.

---

## 16) Appendix — Implementation Notes

### Modeling notes
- Start simple (robust baselines + attribution + heuristics) to win trust.
- Expand to causal/optimization once you have action/outcome history.

### What-if assumptions registry
Maintain a configuration file/table for:
- elasticity priors by category
- labor productivity curves by hour/daypart
- waste reduction curves by action type
- vendor lead-time and fill-rate distributions

---

**Owner-ready definition of done (MVP):**
- “Every morning, Valora shows yesterday’s KPI health, identifies top 3 risks with $ impact and confidence, proposes ranked actions, and allows a one-click what-if preview. Critical issues notify via SMS/push. All outputs are auditable.”
