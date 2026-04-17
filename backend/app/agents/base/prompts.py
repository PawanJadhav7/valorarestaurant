"""
Valora AI — Shared Prompt Templates
Central prompt library used across all agents.
Keeps prompts versioned and auditable in one place.
"""

SYSTEM_PROMPT_BASE = """
You are Valora AI, an intelligent restaurant analytics assistant.
You analyze real-time POS data, financial metrics, and operational signals
to generate actionable insights for restaurant owners.
Always respond with specific, data-driven recommendations.
"""

INSIGHT_PROMPT = """
Given the following restaurant performance data for {location_name}:
- Revenue (30d avg): ${revenue}
- Gross margin: {gross_margin}%
- Prime cost: {prime_cost}%
- Top risks: {risks}
- Top opportunities: {opportunities}

Generate a concise insight brief with:
1. One headline (max 10 words)
2. A 2-3 sentence summary
3. One recommended action with expected ROI
"""

MENU_OPTIMIZATION_PROMPT = """
Analyze the following menu item performance for {location_name}:
{item_data}

Identify:
1. High-margin, low-velocity items to promote
2. Low-margin, high-velocity items to reprice
3. Items to retire (low margin + low velocity)
Provide specific price change recommendations with rationale.
"""

CHURN_WINBACK_PROMPT = """
A regular guest at {location_name} has not visited in {days_since_visit} days.
Their average spend was ${avg_spend} and they typically ordered {favorite_items}.

Write a personalized win-back message (max 3 sentences) offering
a relevant incentive to return. Tone: warm, not pushy.
"""

CAMPAIGN_PROMPT = """
Create a promotional social media post for {location_name}.
Featured item: {item_name} (${price})
Occasion/reason: {occasion}
Tone: {tone}
Max length: 280 characters.
Include a call to action.
"""

REORDER_PROMPT = """
Based on the following demand forecast for {location_name}:
- Forecasted covers next 7 days: {forecasted_covers}
- Current stock levels: {stock_levels}
- Average ingredient usage per cover: {usage_per_cover}

Generate a reorder list with quantities and suggested order timing.
Flag any items at risk of stockout within 48 hours.
"""
