# Valora Restaurant KPI Code Registry
Version: 1.0  
Last Updated: 2026-02-19  
Owner: Valora Executive Engine  

---

## 🔷 Naming Philosophy

We maintain:

- **Snake Case (DB layer)** → internal storage
- **EXECUTIVE_CODE (API/UI/AI layer)** → presentation & AI logic

This ensures:
- Clean analytics
- Stable AI reasoning
- Investor-ready metric definitions
- Cross-domain compatibility

---

# 🔹 PROFIT KPIs

| Executive Code | Snake Key | Formula | Unit | Category |
|---------------|-----------|---------|------|----------|
| REVENUE | revenue | Σ sales | usd | Profit |
| COGS | cogs | Σ cost_of_goods | usd | Profit |
| GROSS_MARGIN | gross_margin | (revenue - cogs) / revenue | pct | Profit |
| PRIME_COST_RATIO | prime_cost_ratio | (cogs + labor_cost) / revenue | pct | Profit |
| FIXED_COST_COVERAGE_RATIO | fixed_cost_coverage_ratio | gross_profit / fixed_cost | ratio | Profit |
| BREAK_EVEN_REVENUE | break_even_revenue | fixed_cost / gross_margin_pct | usd | Profit |
| SAFETY_MARGIN | safety_margin | (revenue - break_even_revenue) / revenue | pct | Profit |
| INTEREST_COVERAGE_RATIO | interest_coverage_ratio | EBIT / interest_expense | ratio | Profit |

---

# 🔹 COST & EFFICIENCY KPIs

| Executive Code | Snake Key | Formula | Unit | Category |
|---------------|-----------|---------|------|----------|
| FOOD_COST_RATIO | food_cost_ratio | cogs / revenue | pct | Cost |
| LABOR_COST_RATIO | labor_cost_ratio | labor_cost / revenue | pct | Cost |
| DAYS_INVENTORY_ON_HAND | days_inventory_on_hand | avg_inventory / cogs * 365 | days | Ops |
| CASH_CONVERSION_CYCLE | cash_conversion_cycle | inventory_days + ar_days - ap_days | days | Ops |

---

# 🔹 GROWTH KPIs

| Executive Code | Snake Key | Formula | Unit | Category |
|---------------|-----------|---------|------|----------|
| ARPU | arpu | revenue / active_customers | usd | Growth |
| CUSTOMER_CHURN | customer_churn | (current_customers / previous_customers) - 1 | pct | Growth |
| CAC | cac | marketing_cost / new_customers | usd | Growth |

---

# 🔹 KPI Severity Logic (UI Layer)

| Severity | Rule Example |
|----------|--------------|
| GOOD | Within optimal threshold |
| WARN | 10–20% deviation |
| RISK | Exceeds threshold or negative trend |

---

# 🔷 AI Interpretation Layer

Each Executive KPI must support:

- Trend direction
- Variance vs prior period
- Driver attribution
- Recommended actions

Example:

GROSS_MARGIN ↓  
→ Likely driven by Food Cost Ratio ↑  
→ Recommend supplier renegotiation or menu repricing.

---

# End of Registry v1.0