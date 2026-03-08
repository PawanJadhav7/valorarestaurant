# app/main.py
from fastapi import FastAPI
from app.api.valora_dashboard import router as dashboard_router
from app.api.valora_location import router as location_router

app = FastAPI(title="Valora AI API")

app.include_router(dashboard_router)
app.include_router(location_router)


@app.get("/health")
def health():
    return {"status": "ok"}


# @app.get("/")
# def root():
#     return {"message": "Valora AI backend running"}