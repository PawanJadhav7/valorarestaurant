from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.valora_dashboard import router as dashboard_router
from app.api.stripe_webhook import router as stripe_router
from app.api.stripe_checkout import router as stripe_checkout_router
from app.api.auth_me import router as auth_me_router



app = FastAPI(title="Valora AI API")
app.include_router(stripe_router)
app.include_router(auth_me_router)
app.include_router(stripe_checkout_router)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "https://valorarestaurant.vercel.app",
        "http://localhost:8000/api/stripe/webhook"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(dashboard_router)

@app.get("/")
def root():
    print("This is a github test")
    return {"status": "Valora AI backend running"}
