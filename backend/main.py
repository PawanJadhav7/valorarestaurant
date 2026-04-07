from dotenv import load_dotenv
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.pos import router as pos_router
from app.api.valora_dashboard import router as dashboard_router
from app.api.stripe_webhook import router as stripe_router
from app.api.stripe_checkout import router as stripe_checkout_router
from app.api.auth_me import router as auth_me_router
from app.api.ai_generate import router as ai_generate_router
from app.api.ai_read import router as ai_read_router
from app.api.ai_chat import router as ai_chat_router
from app.api.kpi import router as kpi_router
from app.api.insights import router as insights_router
from app.api.onboarding_tenant import router as onboarding_tenant_router
from app.api.onboarding_pos import router as onboarding_pos_router
from app.api.onboarding_subscription import router as onboarding_subscription_router
from app.api.user_tenants import router as user_tenants_router
from app.api.switch_tenant import router as switch_tenant_router
from dotenv import load_dotenv
from app.api.stripe_verify_session import router as stripe_verify_router
from app.api.subscription_change import router as subscription_change_router
from app.api.subscription_change_job import router as subscription_change_job_router
from app.api.subscription_summary import router as subscription_summary_router
from app.api import alerts
from app.api.alerts import router as alerts_router
from app.api.ai_actions import router as ai_actions_router
from app.api.onboarding_pos_connect import router as onboarding_pos_connect_router
# Add this line with the other imports
from app.integrations.pos.registry_instance import pos_registry
from app.api.onboarding_square_callback import router as square_callback_router
from app.api.onboarding_clover_callback import router as clover_callback_router
from app.api.onboarding_pos_locations import router as onboarding_pos_locations_router
# With other imports at top
from app.api.square_sync import router as square_sync_router
from app.api.clover_sync import router as clover_sync_router
import logging

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Valora AI API")

app.include_router(stripe_router)
app.include_router(auth_me_router)
app.include_router(stripe_checkout_router)
app.include_router(pos_router)
app.include_router(kpi_router)
app.include_router(insights_router)
app.include_router(onboarding_tenant_router)
app.include_router(onboarding_pos_router)
app.include_router(onboarding_subscription_router)
app.include_router(user_tenants_router)
app.include_router(switch_tenant_router)
app.include_router(clover_callback_router)
app.include_router(square_callback_router)
app.include_router(stripe_verify_router)
app.include_router(subscription_change_router)
app.include_router(subscription_change_job_router)
app.include_router(subscription_summary_router)
app.include_router(alerts_router)
app.include_router(ai_actions_router)
app.include_router(onboarding_pos_locations_router)
app.include_router(onboarding_pos_connect_router)

load_dotenv()
load_dotenv(".env.local")
load_dotenv("backend/.env.local")

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://valorarestaurant.vercel.app",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)
app.include_router(ai_generate_router)
app.include_router(ai_read_router)
app.include_router(ai_chat_router)
# Register (with other app.include_router calls)
app.include_router(square_callback_router)
# With other app.include_router() calls
app.include_router(square_sync_router)

app.include_router(clover_sync_router)

@app.get("/")
def root():
    print("This is a github test")
    return {"status": "Valora AI backend running"}
