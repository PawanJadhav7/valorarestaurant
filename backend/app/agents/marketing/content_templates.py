"""
Valora AI — ContentTemplates
STATUS: Placeholder — builds alongside SocialAgent + PromoAgent

Versioned content templates per restaurant brand voice.
Each tenant can define their brand tone:
  formal | casual | playful | premium

Templates are filled by LangChain with real data
(item names, prices, dates, location name).
"""

TEMPLATES = {
    "social_post_casual": "Hey {city} foodies! {item_name} is back "
        "and better than ever at {location_name}. "
        "Come in this {day} and treat yourself. "
        "Tag a friend who needs this!",

    "social_post_premium": "Introducing {item_name} at {location_name}. "
        "Crafted with {key_ingredient}, available {availability}. "
        "Reserve your table: {booking_link}",

    "winback_email_subject": "We miss you, {first_name} — "
        "here's something special from {location_name}",

    "winback_email_body": "Hi {first_name}, it's been a while! "
        "We'd love to see you back at {location_name}. "
        "As a thank you for being a loyal guest, "
        "enjoy {offer} on your next visit. "
        "Valid until {expiry_date}. See you soon!",

    "reorder_alert": "Low stock alert for {location_name}: "
        "{item_name} has {days_remaining} days of stock remaining "
        "based on current demand. Suggested reorder: {quantity} {unit}.",
}
