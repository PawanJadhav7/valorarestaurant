"""
Valora AI — KPI Context Engine
Dynamically builds AI context based on:
  - Clicked KPI (primary signal)
  - Active risk signals for that location/date
  - Historical trend data (7d/14d avg)
  - Location scope (single vs portfolio)

Extensible: add new context sources as plugins in Phase 2+
  Phase 2: weather, day_of_week, holidays, events
  Phase 3: sentiment, social, supply chain, economic data
"""
from __future__ import annotations
import logging
import os
from datetime import date, timedelta
from typing import Optional
import psycopg2

logger = logging.getLogger(__name__)

# ── Primary KPI → related KPI columns ────────────────────────────────────────
# When a KPI is clicked, these are the most relevant columns to fetch
KPI_CONTEXT_MAP: dict[str, list[str]] = {
    # Sales & Demand
    "REVENUE":              ["revenue", "orders", "customers", "aov",
                             "sales_last_7d_avg", "sales_last_14d_avg",
                             "discount_pct", "void_pct", "refund_pct",
                             "gross_margin", "gross_profit"],
    "ORDERS":               ["orders", "customers", "aov", "revenue",
                             "sales_last_7d_avg", "void_pct", "discount_pct"],
    "ARPU":                 ["aov", "revenue", "orders", "customers",
                             "discount_pct", "refund_pct"],
    "CUSTOMERS":            ["customers", "new_customers", "orders",
                             "revenue", "aov", "sales_last_7d_avg"],

    # Cost & Margin
    "GROSS_MARGIN":         ["gross_margin", "gross_profit", "cogs",
                             "food_cost_pct", "labor_cost_pct",
                             "prime_cost_pct", "revenue",
                             "gross_margin_last_7d_avg"],
    "FOOD_COST_RATIO":      ["food_cost_pct", "cogs", "gross_margin",
                             "waste_pct", "waste_amount",
                             "food_cost_last_7d_avg", "prime_cost_pct"],
    "LABOR_COST_RATIO":     ["labor_cost_pct", "labor", "labor_hours",
                             "overtime_hours", "sales_per_labor_hour",
                             "prime_cost_pct", "labor_cost_last_7d_avg"],
    "PRIME_COST_RATIO":     ["prime_cost_pct", "prime_cost", "cogs",
                             "labor", "food_cost_pct", "labor_cost_pct",
                             "gross_margin"],
    "COGS":                 ["cogs", "food_cost_pct", "gross_margin",
                             "waste_amount", "revenue"],
    "LABOR":                ["labor", "labor_cost_pct", "labor_hours",
                             "overtime_hours", "sales_per_labor_hour",
                             "revenue"],

    # Profitability
    "GROSS_PROFIT":         ["gross_profit", "gross_margin", "revenue",
                             "cogs", "labor", "prime_cost_pct", "ebit"],
    "EBIT":                 ["ebit", "gross_profit", "gross_margin",
                             "revenue", "cogs", "labor", "fixed_costs"],

    # Inventory & Waste
    "WASTE_PCT":            ["waste_pct", "waste_amount", "food_cost_pct",
                             "cogs", "stockout_count", "avg_inventory"],
    "WASTE_AMOUNT":         ["waste_amount", "waste_pct", "food_cost_pct",
                             "cogs", "avg_inventory"],
    "STOCKOUT_COUNT":       ["stockout_count", "waste_pct", "avg_inventory",
                             "orders", "revenue"],
    "DAYS_INVENTORY_ON_HAND": ["dio", "avg_inventory", "cogs",
                                "stockout_count", "waste_pct"],

    # Workforce
    "LABOR_HOURS":          ["labor_hours", "overtime_hours",
                             "sales_per_labor_hour", "labor_cost_pct",
                             "labor", "revenue"],
    "SALES_PER_LABOR_HOUR": ["sales_per_labor_hour", "labor_hours",
                             "overtime_hours", "labor_cost_pct",
                             "revenue", "orders"],

    # Operations
    "VOID_PCT":             ["void_pct", "discount_pct", "refund_pct",
                             "orders", "revenue"],
    "DISCOUNT_PCT":         ["discount_pct", "void_pct", "refund_pct",
                             "revenue", "gross_margin", "aov"],
    "REFUND_PCT":           ["refund_pct", "void_pct", "discount_pct",
                             "orders", "revenue"],

    # Cash & Working Capital
    "AR_DAYS":              ["ar_days", "ap_days", "cash_conversion_cycle",
                             "avg_inventory", "revenue"],
    "AP_DAYS":              ["ap_days", "ar_days", "cash_conversion_cycle",
                             "cogs", "revenue"],
    "CASH_CONVERSION_CYCLE": ["cash_conversion_cycle", "ar_days", "ap_days",
                               "avg_inventory", "cogs", "revenue"],
}

# ── Risk type → additional KPI columns to include ────────────────────────────
RISK_CONTEXT_MAP: dict[str, list[str]] = {
    "revenue_decline":    ["revenue", "orders", "aov", "sales_last_7d_avg",
                           "discount_pct", "void_pct"],
    "food_cost_high":     ["food_cost_pct", "cogs", "waste_pct",
                           "waste_amount", "gross_margin"],
    "labor_cost_high":    ["labor_cost_pct", "labor_hours", "overtime_hours",
                           "sales_per_labor_hour"],
    "prime_cost_high":    ["prime_cost_pct", "food_cost_pct",
                           "labor_cost_pct", "gross_margin"],
    "inventory_stress":   ["stockout_count", "waste_pct", "waste_amount",
                           "avg_inventory", "food_cost_pct"],
    "waste_spike":        ["waste_pct", "waste_amount", "food_cost_pct",
                           "cogs", "gross_margin"],
    "margin_compression": ["gross_margin", "food_cost_pct", "labor_cost_pct",
                           "prime_cost_pct", "revenue"],
    "negative_ebit":      ["ebit", "gross_profit", "cogs", "labor",
                           "fixed_costs", "revenue"],
    "discount_abuse":     ["discount_pct", "void_pct", "refund_pct",
                           "revenue", "gross_margin"],
    "labor_overtime":     ["overtime_hours", "labor_hours",
                           "labor_cost_pct", "sales_per_labor_hour"],
    "low_cover_count":    ["orders", "customers", "revenue",
                           "sales_last_7d_avg", "aov"],
}

# ── Always include these trend columns ────────────────────────────────────────
TREND_COLUMNS = [
    "sales_last_7d_avg",
    "sales_last_14d_avg",
    "gross_margin_last_7d_avg",
    "food_cost_last_7d_avg",
    "labor_cost_last_7d_avg",
    "day_of_week",
    "is_weekend",
    "is_holiday",
]

# ── All available columns in f_location_daily_features ───────────────────────
ALL_FEATURE_COLUMNS = [
    "revenue", "cogs", "labor", "fixed_costs", "marketing_spend",
    "orders", "customers", "new_customers", "avg_inventory",
    "ebit", "gross_profit", "gross_margin", "food_cost_pct",
    "labor_cost_pct", "prime_cost", "prime_cost_pct", "aov",
    "revenue_per_customer", "contribution_margin", "contribution_margin_pct",
    "dio", "ar_days", "ap_days", "cash_conversion_cycle",
    "discount_pct", "void_pct", "refund_pct", "waste_pct", "waste_amount",
    "stockout_count", "labor_hours", "overtime_hours", "sales_per_labor_hour",
    "day_of_week", "is_weekend", "is_holiday",
    "sales_last_7d_avg", "sales_last_14d_avg",
    "gross_margin_last_7d_avg", "food_cost_last_7d_avg",
    "labor_cost_last_7d_avg",
]


class KpiContextEngine:
    """
    Builds dynamic AI context for a given KPI click + location + date.
    
    Extensible context sources (Phase 2+):
        weather_enabled  = False  # add weather API
        events_enabled   = False  # add local events
        sentiment_enabled = False  # add review sentiment
    """

    # Phase 2+ context sources — disabled by default
    weather_enabled   = False
    events_enabled    = False
    sentiment_enabled = False

    def __init__(self, db_url: str):
        self.db_url = db_url.replace("postgresql+psycopg2", "postgresql")

    def build_context(
        self,
        *,
        kpi_code: str,
        location_id: Optional[int],
        day: str,
        tenant_id: str,
    ) -> dict:
        """
        Main entry point. Returns full context dict for AI prompt building.

        Args:
            kpi_code:    Clicked KPI code e.g. "REVENUE"
            location_id: None = all locations (portfolio view)
            day:         Date string e.g. "2026-04-15"
            tenant_id:   Tenant UUID string

        Returns:
            {
                "scope":         "single_location" | "portfolio",
                "location_name": str,
                "kpi_values":    dict of column → value,
                "active_risks":  list of risk dicts,
                "trend_context": dict of trend KPIs,
                "columns_used":  list of columns fetched,
                "as_of_date":    str,
            }
        """
        conn = psycopg2.connect(self.db_url)
        cur  = conn.cursor()

        try:
            scope = "single_location" if location_id else "portfolio"

            # ── Step 1: Get active risks ──────────────────────────────────
            active_risks = self._get_active_risks(
                cur, tenant_id, location_id, day
            )
            risk_types = [r["risk_type"] for r in active_risks]

            # ── Step 2: Build column set ──────────────────────────────────
            columns = self._build_column_set(kpi_code, risk_types)

            # ── Step 3: Fetch KPI values ──────────────────────────────────
            kpi_values, location_name = self._fetch_kpi_values(
                cur, tenant_id, location_id, day, columns
            )

            # ── Step 4: Portfolio comparison (if single location) ─────────
            portfolio_context = {}
            if scope == "single_location" and location_id:
                portfolio_context = self._get_portfolio_comparison(
                    cur, tenant_id, location_id, day,
                    ["revenue", "gross_margin", "food_cost_pct", "labor_cost_pct"]
                )

            # ── Phase 2+: Optional context sources ───────────────────────
            weather_context = {}
            if self.weather_enabled:
                weather_context = self._get_weather_context(day, location_id)

            return {
                "scope":               scope,
                "location_name":       location_name,
                "location_id":         location_id,
                "as_of_date":          day,
                "kpi_code":            kpi_code,
                "kpi_values":          kpi_values,
                "active_risks":        active_risks,
                "portfolio_context":   portfolio_context,
                "columns_used":        list(columns),
                # Phase 2+ placeholders
                "weather_context":     weather_context,
                "events_context":      {},
                "sentiment_context":   {},
            }

        finally:
            cur.close()
            conn.close()

    def _build_column_set(
        self,
        kpi_code: str,
        risk_types: list[str],
    ) -> set[str]:
        """Build the minimal but complete set of KPI columns needed."""
        columns: set[str] = set()

        # Primary KPI columns
        primary = KPI_CONTEXT_MAP.get(kpi_code.upper(), ["revenue", "gross_margin"])
        columns.update(primary)

        # Risk-driven columns
        for risk_type in risk_types:
            risk_cols = RISK_CONTEXT_MAP.get(risk_type, [])
            columns.update(risk_cols)

        # Always include trend columns
        columns.update(TREND_COLUMNS)

        # Filter to valid columns only
        columns = columns.intersection(set(ALL_FEATURE_COLUMNS))

        return columns

    def _get_active_risks(
        self,
        cur,
        tenant_id: str,
        location_id: Optional[int],
        day: str,
    ) -> list[dict]:
        """Fetch active risk signals for this location/date."""
        cur.execute("""
            SELECT risk_type, severity_band, severity_score,
                   impact_estimate, location_id
            FROM ml.location_risk_daily
            WHERE tenant_id = %s::uuid
              AND day <= %s::date
              AND day >= %s::date - INTERVAL '7 days'
              AND (%s::bigint IS NULL OR location_id = %s::bigint)
            ORDER BY severity_score DESC NULLS LAST
            LIMIT 10
        """, (tenant_id, day, day, location_id, location_id))

        rows = cur.fetchall()
        return [
            {
                "risk_type":      r[0],
                "severity_band":  r[1],
                "severity_score": float(r[2] or 0),
                "impact_estimate": float(r[3] or 0),
                "location_id":    r[4],
            }
            for r in rows
        ]

    def _fetch_kpi_values(
        self,
        cur,
        tenant_id: str,
        location_id: Optional[int],
        day: str,
        columns: set[str],
    ) -> tuple[dict, str]:
        """Fetch KPI values for the given columns."""
        # Build safe column list
        safe_cols = [c for c in columns if c in set(ALL_FEATURE_COLUMNS)]
        if not safe_cols:
            return {}, "Unknown"

        if location_id:
            # Single location — get latest row
            col_list = ", ".join(safe_cols)
            cur.execute(f"""
                SELECT {col_list}, location_name
                FROM restaurant.f_location_daily_features
                WHERE tenant_id = %s::uuid
                  AND location_id = %s
                  AND day <= %s::date
                ORDER BY day DESC
                LIMIT 1
            """, (tenant_id, location_id, day))
            row = cur.fetchone()
            if not row:
                return {}, "Unknown"
            values = {
                col: (float(row[i]) if row[i] is not None and col != "location_name"
                      else row[i])
                for i, col in enumerate(safe_cols)
            }
            location_name = row[-1] or "Unknown"
        else:
            # Portfolio — aggregate across all locations
            agg_exprs = []
            for col in safe_cols:
                if col in ("day_of_week", "is_weekend", "is_holiday",
                           "location_name"):
                    continue
                if col.endswith("_pct") or col.endswith("_avg") or col in (
                    "gross_margin", "aov", "revenue_per_customer",
                    "contribution_margin_pct"
                ):
                    agg_exprs.append(f"AVG({col}) AS {col}")
                else:
                    agg_exprs.append(f"SUM({col}) AS {col}")

            col_sql = ", ".join(agg_exprs) if agg_exprs else "COUNT(*)"
            cur.execute(f"""
                SELECT {col_sql}
                FROM restaurant.f_location_daily_features
                WHERE tenant_id = %s::uuid
                  AND day <= %s::date
                  AND day >= %s::date - INTERVAL '29 days'
            """, (tenant_id, day, day))
            row = cur.fetchone()
            col_names = [desc[0] for desc in cur.description]
            values = {
                col: float(row[i]) if row[i] is not None else None
                for i, col in enumerate(col_names)
            }
            location_name = "All Locations"

        return values, location_name

    def _get_portfolio_comparison(
        self,
        cur,
        tenant_id: str,
        location_id: int,
        day: str,
        compare_cols: list[str],
    ) -> dict:
        """
        Compare this location vs portfolio average.
        Returns dict: {col: {location: x, portfolio_avg: y, delta: z}}
        """
        col_list = ", ".join(f"AVG({c}) AS {c}" for c in compare_cols)
        cur.execute(f"""
            SELECT {col_list}
            FROM restaurant.f_location_daily_features
            WHERE tenant_id = %s::uuid
              AND day <= %s::date
              AND day >= %s::date - INTERVAL '29 days'
        """, (tenant_id, day, day))
        portfolio_row = cur.fetchone()
        portfolio_vals = {
            c: float(portfolio_row[i]) if portfolio_row[i] is not None else None
            for i, c in enumerate(compare_cols)
        }

        cur.execute(f"""
            SELECT {', '.join(f'AVG({c}) AS {c}' for c in compare_cols)}
            FROM restaurant.f_location_daily_features
            WHERE tenant_id = %s::uuid
              AND location_id = %s
              AND day <= %s::date
              AND day >= %s::date - INTERVAL '29 days'
        """, (tenant_id, location_id, day, day))
        loc_row = cur.fetchone()
        loc_vals = {
            c: float(loc_row[i]) if loc_row[i] is not None else None
            for i, c in enumerate(compare_cols)
        }

        comparison = {}
        for col in compare_cols:
            loc_v = loc_vals.get(col)
            port_v = portfolio_vals.get(col)
            delta = None
            if loc_v is not None and port_v is not None and port_v != 0:
                delta = ((loc_v - port_v) / port_v) * 100
            comparison[col] = {
                "location":      round(loc_v, 4) if loc_v is not None else None,
                "portfolio_avg": round(port_v, 4) if port_v is not None else None,
                "delta_pct":     round(delta, 2) if delta is not None else None,
            }
        return comparison

    # ── Phase 2+ placeholder methods ─────────────────────────────────────────

    def _get_weather_context(self, day: str, location_id: Optional[int]) -> dict:
        """
        Phase 2: Fetch weather data for the location/date.
        Correlate temperature, precipitation with order volume.
        Integration: OpenWeatherMap API or similar.
        """
        # TODO: implement in Phase 2
        return {}

    def _get_events_context(self, day: str, location_id: Optional[int]) -> dict:
        """
        Phase 2: Fetch local events (sports, concerts, holidays).
        Correlate with cover count spikes/drops.
        Integration: Ticketmaster API, Google Calendar public events.
        """
        # TODO: implement in Phase 2
        return {}

    def _get_sentiment_context(self, location_id: Optional[int]) -> dict:
        """
        Phase 3: Fetch recent review sentiment from Google/Yelp.
        Correlate negative sentiment with revenue decline.
        Integration: Google Places API, Yelp Fusion API.
        """
        # TODO: implement in Phase 3
        return {}
