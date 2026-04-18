"""
Valora AI — Alert Scoring Model
Phase 1: Mathematical ranking (live today)
Phase 2: XGBoost learned ranking (after 90 days of feedback data)

Phase 2 Checklist:
------------------
Pre-conditions:
  □ ai.alert_feedback has 500+ records
  □ At least 100 records per active tenant
  □ outcome_status populated for 70%+ of records

Training features (X):
  - severity_band (encoded: critical=1.0, high=0.7, watch=0.4)
  - impact_estimate (normalized 0-1, cap $10,000)
  - risk_type (one-hot encoded)
  - day_of_week (0-6)
  - hour_of_day (0-23)
  - location_revenue_trend (7d avg delta %)
  - location_avg_margin (30d avg)
  - days_since_last_alert (recency)
  - previous_response_rate (per tenant)

Target (y):
  - was_actioned (binary: 1 if response_status = 'actioned', 0 otherwise)

Model:
  - XGBoost classifier (xgboost library)
  - Train/test split: 80/20
  - Evaluation metric: AUC-ROC
  - Retrain: weekly via Celery beat task (Sunday 6am UTC)
  - Log to: ml.model_training_run (table already exists)

Output:
  - Probability score 0.0-1.0 replaces current final_rank
  - Delivery threshold same: 0.7=immediate, 0.5=standard, 0.3=digest

Personalization (Phase 3):
  - Train separate model per tenant once 100+ per-tenant records exist
  - Some owners act on waste alerts, others only care about revenue
  - Per-tenant models stored in ml.model_registry (table already exists)
"""
from __future__ import annotations
import logging
from typing import Any

logger = logging.getLogger(__name__)


def compute_rank_v1(
    severity_band: str,
    impact_estimate: float,
    days_old: int = 0,
) -> dict[str, Any]:
    """
    Phase 1 — Mathematical ranking.
    Replace with compute_rank_v2 (XGBoost) in Phase 2.

    final_rank = (severity × 0.4) + (impact × 0.35) + (recency × 0.25)
    """
    severity_map = {"critical": 1.0, "high": 0.7, "watch": 0.4, "info": 0.1}
    severity_score = severity_map.get(severity_band, 0.1)
    impact_score   = min(float(impact_estimate or 0) / 10_000, 1.0)
    recency_score  = max(0.0, 1.0 - (days_old / 7))
    final_rank     = (severity_score * 0.4) + (impact_score * 0.35) + (recency_score * 0.25)

    if final_rank >= 0.7:
        threshold = "immediate"     # Email + WhatsApp + SMS
    elif final_rank >= 0.5:
        threshold = "standard"      # Email + WhatsApp
    elif final_rank >= 0.3:
        threshold = "digest"        # Email only
    else:
        threshold = "dashboard"     # Dashboard only

    return {
        "version":        "v1_mathematical",
        "severity_score": round(severity_score, 3),
        "impact_score":   round(impact_score, 3),
        "recency_score":  round(recency_score, 3),
        "final_rank":     round(final_rank, 3),
        "threshold":      threshold,
    }


def compute_rank_v2(features: dict[str, Any]) -> dict[str, Any]:
    """
    Phase 2 — XGBoost learned ranking.
    TODO: Implement after 500+ ai.alert_feedback records exist.

    Args:
        features: dict with keys matching Phase 2 training features above

    Returns:
        Same format as compute_rank_v1 for backward compatibility
    """
    raise NotImplementedError(
        "Phase 2 scoring model not yet implemented. "
        "Use compute_rank_v1 until ai.alert_feedback has 500+ records."
    )


# Active scoring function — swap to compute_rank_v2 in Phase 2
def compute_rank(severity_band: str, impact_estimate: float, days_old: int = 0) -> dict:
    return compute_rank_v1(severity_band, impact_estimate, days_old)
