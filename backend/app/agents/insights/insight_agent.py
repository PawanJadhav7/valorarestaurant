"""
Valora AI — InsightHandler
Handles all AI insight generation:
  - KPI click analysis (attention + action queries)
  - Daily insight briefs
  - Risk narrative generation

Engine: Gemini 2.5 Flash Lite (primary)
Framework: Direct API call (Phase 2: LangChain)
Logs every run to: ai.handler_run_log
"""
from __future__ import annotations
import json
import logging
import os
import time
from typing import Any, Optional
import psycopg2

from app.agents.base.base_agent import BaseAgent, AgentResult
from app.ml.kpi_context_engine import KpiContextEngine

logger = logging.getLogger(__name__)


class InsightHandler(BaseAgent):
    """
    Handles KPI click queries and insight generation.
    Logs every execution to ai.handler_run_log with:
      - engine_id (Gemini)
      - handler_id (InsightHandler)
      - tokens + cost
      - duration
    """
    name   = "insight_handler"
    domain = "insights"

    # Registry IDs — loaded once at startup
    _engine_id:  Optional[str] = None
    _handler_id: Optional[str] = None

    def __init__(self):
        super().__init__()
        self.db_url = os.environ.get("DATABASE_URL", "").replace(
            "postgresql+psycopg2", "postgresql"
        )
        self._load_registry_ids()

    def _load_registry_ids(self):
        """Load engine_id and handler_id from ai.* registry tables."""
        if not self.db_url:
            return
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor()

            cur.execute("""
                SELECT engine_id::text FROM ai.engine_registry
                WHERE engine_code = 'gemini-2.5-flash-lite' LIMIT 1
            """)
            row = cur.fetchone()
            self._engine_id = row[0] if row else None

            cur.execute("""
                SELECT handler_id::text FROM ai.handler_registry
                WHERE handler_code = 'insight_handler' LIMIT 1
            """)
            row = cur.fetchone()
            self._handler_id = row[0] if row else None

            cur.close()
            conn.close()
            logger.info(
                "InsightHandler registry loaded — engine=%s handler=%s",
                self._engine_id[:8] if self._engine_id else None,
                self._handler_id[:8] if self._handler_id else None,
            )
        except Exception as e:
            logger.warning("Failed to load registry IDs: %s", str(e))

    def run(
        self,
        tenant_id: str,
        location_id: int,
        context: dict[str, Any],
    ) -> AgentResult:
        """
        Required by BaseAgent. Runs a KPI insight query.
        context must include: kpi_code, day, query_type
        """
        kpi_code   = context.get("kpi_code", "REVENUE")
        day        = context.get("day", "")
        query_type = context.get("query_type", "attention")

        result = self.query_kpi(
            tenant_id=tenant_id,
            location_id=location_id,
            kpi_code=kpi_code,
            day=day,
            query_type=query_type,
        )
        return self.build_result(
            tenant_id=tenant_id,
            location_id=location_id,
            status="success" if result.get("ok") else "failed",
            outputs=result,
            signals_used=result.get("context", {}).get("columns_used", []),
        )

    def query_kpi(
        self,
        *,
        tenant_id: str,
        location_id: Optional[int],
        kpi_code: str,
        day: str,
        query_type: str = "attention",
    ) -> dict:
        """
        Main entry point for KPI queries.
        Builds context → calls Gemini → logs to ai.handler_run_log
        → stores in ai.kpi_query_log → returns response.
        """
        start_ms = int(time.time() * 1000)

        try:
            # ── Step 1: Build dynamic context ────────────────────────────
            engine = KpiContextEngine(self.db_url)
            context = engine.build_context(
                kpi_code=kpi_code,
                location_id=location_id,
                day=day,
                tenant_id=tenant_id,
            )

            if not context["kpi_values"]:
                return {
                    "ok": False,
                    "error": f"No KPI data for location {location_id} on {day}"
                }

            # ── Step 2: Build prompt ──────────────────────────────────────
            prompt = self._build_prompt(query_type, kpi_code, context)

            # ── Step 3: Call Gemini ───────────────────────────────────────
            response_text, input_tokens, output_tokens = self._call_gemini(prompt)
            duration_ms = int(time.time() * 1000) - start_ms

            # Cost: Gemini 2.5 Flash Lite pricing
            cost_usd = (input_tokens * 0.000075 + output_tokens * 0.000300) / 1000

            # ── Step 4: Log to ai.handler_run_log + ai.kpi_query_log ─────
            query_id = self._log_run(
                tenant_id=tenant_id,
                location_id=location_id,
                day=day,
                kpi_code=kpi_code,
                query_type=query_type,
                context=context,
                prompt=prompt,
                response_text=response_text,
                input_tokens=input_tokens,
                output_tokens=output_tokens,
                cost_usd=cost_usd,
                duration_ms=duration_ms,
            )

            logger.info(
                "InsightHandler.query_kpi — tenant=%s loc=%s kpi=%s "
                "tokens=%d cost=$%.6f duration=%dms",
                tenant_id[:8], location_id, kpi_code,
                input_tokens + output_tokens, cost_usd, duration_ms
            )

            return {
                "ok":           True,
                "query_id":     query_id,
                "scope":        context["scope"],
                "location_name": context["location_name"],
                "kpi_code":     kpi_code,
                "context":      context,
                "response":     response_text,
                "query_type":   query_type,
                "duration_ms":  duration_ms,
                "cost_usd":     round(cost_usd, 6),
            }

        except Exception as e:
            duration_ms = int(time.time() * 1000) - start_ms
            logger.error("InsightHandler.query_kpi failed: %s", str(e))
            self._log_failed_run(
                tenant_id=tenant_id,
                location_id=location_id,
                day=day,
                error=str(e),
                duration_ms=duration_ms,
            )
            return {"ok": False, "error": str(e)}

    def _build_prompt(
        self,
        query_type: str,
        kpi_code: str,
        context: dict,
    ) -> str:
        location_name = context["location_name"]
        day           = context["as_of_date"]
        kpi_values    = context["kpi_values"]
        active_risks  = context["active_risks"]
        portfolio     = context.get("portfolio_context", {})
        scope         = context["scope"]

        kpi_lines = "\n".join(
            f"  {k.replace('_', ' ').title()}: "
            f"{round(v, 4) if isinstance(v, float) else v}"
            for k, v in kpi_values.items()
            if v is not None
        )

        risk_lines = "\n".join(
            f"  {r['risk_type'].replace('_', ' ').title()} — "
            f"{r['severity_band']} severity, "
            f"impact ${r['impact_estimate']:,.2f}"
            for r in active_risks
        ) if active_risks else "  No active risks detected"

        portfolio_lines = ""
        if portfolio:
            portfolio_lines = (
                "\nPortfolio Comparison (this location vs portfolio avg):\n" +
                "\n".join(
                    f"  {k.replace('_', ' ').title()}: "
                    f"this={v['location']:.4f} "
                    f"avg={v['portfolio_avg']:.4f} "
                    f"delta={v['delta_pct']:+.1f}%"
                    for k, v in portfolio.items()
                    if v.get("delta_pct") is not None
                )
            )

        scope_label = (
            "Single Location" if scope == "single_location"
            else "Portfolio View"
        )

        if query_type == "attention":
            question = (
                f"The owner clicked on the "
                f"{kpi_code.replace('_', ' ').title()} metric. "
                f"What are the top 2-3 issues requiring immediate attention? "
                f"Be specific, reference actual numbers. Max 150 words."
            )
        else:
            question = (
                f"The owner clicked on the "
                f"{kpi_code.replace('_', ' ').title()} metric. "
                f"What are the top 2-3 recommended actions to improve "
                f"performance? For each: what to do, expected impact with "
                f"numbers, timeframe. Max 200 words."
            )

        return (
            f"You are Valora AI, a restaurant intelligence system.\n"
            f"Restaurant: {location_name}\n"
            f"Date: {day}\n"
            f"Scope: {scope_label}\n\n"
            f"Current KPI Values:\n{kpi_lines}\n\n"
            f"Active Risk Signals:\n{risk_lines}\n"
            f"{portfolio_lines}\n\n"
            f"{question}"
        )

    def _call_gemini(self, prompt: str) -> tuple[str, int, int]:
        """Call Gemini API. Returns (response_text, input_tokens, output_tokens)."""
        try:
            import google.generativeai as genai
            genai.configure(api_key=os.environ.get("GEMINI_API_KEY", ""))
            model    = genai.GenerativeModel("gemini-2.5-flash-lite")
            response = model.generate_content(prompt)
            text     = response.text or "No response generated."
            # Estimate tokens
            input_tokens  = len(prompt.split()) * 4 // 3
            output_tokens = len(text.split()) * 4 // 3
            return text, input_tokens, output_tokens
        except Exception as e:
            logger.error("Gemini call failed: %s", str(e))
            return f"Unable to generate AI response: {str(e)}", 0, 0

    def _log_run(
        self,
        *,
        tenant_id: str,
        location_id: Optional[int],
        day: str,
        kpi_code: str,
        query_type: str,
        context: dict,
        prompt: str,
        response_text: str,
        input_tokens: int,
        output_tokens: int,
        cost_usd: float,
        duration_ms: int,
    ) -> str:
        """Log to ai.handler_run_log and ai.kpi_query_log. Returns query_id."""
        if not self.db_url:
            return "no-db"

        conn = psycopg2.connect(self.db_url)
        cur  = conn.cursor()
        query_id = "unknown"

        try:
            # Log to ai.handler_run_log
            cur.execute("""
                INSERT INTO ai.handler_run_log (
                    handler_id, engine_id, tenant_id, location_id,
                    as_of_date, status, input_tokens, output_tokens,
                    total_cost_usd, duration_ms, signals_used,
                    actions_generated
                ) VALUES (
                    %s::uuid, %s::uuid, %s::uuid, %s,
                    %s::date, 'success', %s, %s,
                    %s, %s, %s, 0
                )
            """, (
                self._handler_id,
                self._engine_id,
                tenant_id,
                location_id,
                day,
                input_tokens,
                output_tokens,
                cost_usd,
                duration_ms,
                list(context.get("columns_used", [])),
            ))

            # Log to ai.kpi_query_log
            cur.execute("""
                INSERT INTO ai.kpi_query_log (
                    tenant_id, location_id, as_of_date,
                    kpi_code, domain_group, query_type,
                    engine_id, prompt_text, kpi_context_json,
                    risk_context_json, response_text,
                    input_tokens, output_tokens, cost_usd, duration_ms
                ) VALUES (
                    %s::uuid, %s, %s::date,
                    %s, %s, %s,
                    %s::uuid, %s, %s::jsonb,
                    %s::jsonb, %s,
                    %s, %s, %s, %s
                ) RETURNING query_id
            """, (
                tenant_id,
                location_id,
                day,
                kpi_code,
                context["scope"],
                query_type,
                self._engine_id,
                prompt,
                json.dumps(context["kpi_values"]),
                json.dumps(context["active_risks"]),
                response_text,
                input_tokens,
                output_tokens,
                cost_usd,
                duration_ms,
            ))
            row = cur.fetchone()
            query_id = str(row[0]) if row else "unknown"
            conn.commit()

        except Exception as e:
            conn.rollback()
            logger.warning("Failed to log handler run: %s", str(e))
        finally:
            cur.close()
            conn.close()

        return query_id

    def _log_failed_run(
        self,
        *,
        tenant_id: str,
        location_id: Optional[int],
        day: str,
        error: str,
        duration_ms: int,
    ):
        """Log failed run to ai.handler_run_log."""
        if not self.db_url or not self._handler_id:
            return
        try:
            conn = psycopg2.connect(self.db_url)
            cur  = conn.cursor()
            cur.execute("""
                INSERT INTO ai.handler_run_log (
                    handler_id, engine_id, tenant_id, location_id,
                    as_of_date, status, input_tokens, output_tokens,
                    total_cost_usd, duration_ms, error_message
                ) VALUES (
                    %s::uuid, %s::uuid, %s::uuid, %s,
                    %s::date, 'failed', 0, 0,
                    0, %s, %s
                )
            """, (
                self._handler_id,
                self._engine_id,
                tenant_id,
                location_id,
                day,
                duration_ms,
                error[:500],
            ))
            conn.commit()
            cur.close()
            conn.close()
        except Exception as e:
            logger.warning("Failed to log failed run: %s", str(e))
