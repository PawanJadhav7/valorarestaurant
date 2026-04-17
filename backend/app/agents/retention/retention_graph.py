"""
Valora AI — RetentionGraph
STATUS: Placeholder — LangGraph stateful workflow
TIMELINE: Option 4
FRAMEWORK: LangGraph

The full customer retention loop as a stateful graph.
Nodes:
  load_guests      → fetch all guests with orders in last 90d
  score_churn      → ChurnAgent scores each guest
  filter_at_risk   → guests with churn_score > threshold
  generate_message → WinbackAgent generates personalized offer
  dispatch         → send via email/SMS/push
  wait             → pause 7 days
  check_return     → did guest visit? if yes → mark retained
                     if no → escalate offer or stop

This loop runs continuously — not a one-shot Celery task.
LangGraph manages the state between each node execution.
"""

RETENTION_GRAPH_DEFINITION = {
    "nodes": [
        "load_guests",
        "score_churn",
        "filter_at_risk",
        "generate_message",
        "dispatch",
        "wait_7_days",
        "check_return",
    ],
    "edges": {
        "load_guests": "score_churn",
        "score_churn": "filter_at_risk",
        "filter_at_risk": "generate_message",
        "generate_message": "dispatch",
        "dispatch": "wait_7_days",
        "wait_7_days": "check_return",
        "check_return": {
            "returned": "load_guests",        # loop back
            "not_returned": "generate_message",  # escalate
            "max_attempts": "stop",
        }
    },
    "framework": "LangGraph",
    "status": "placeholder",
}
