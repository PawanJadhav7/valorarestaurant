from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import os
import requests

router = APIRouter()

PERPLEXITY_API_URL = "https://api.perplexity.ai/chat/completions"
api_key = os.getenv("PERPLEXITY_API_KEY")

class AIPromptRequest(BaseModel):
    prompt: str

class AIPromptResponse(BaseModel):
    answer: str

@router.post("/ai-prompt", response_model=AIPromptResponse)
def ai_prompt(payload: AIPromptRequest):
    print("DEBUG api_key prefix:", api_key[:8] if api_key else None)

    if not api_key:
        raise HTTPException(status_code=500, detail="AI backend not configured")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    body = {
        "model": "sonar",
        "messages": [
            {"role": "user", "content": payload.prompt},
        ],
        "stream": False,
    }

    try:
        resp = requests.post(PERPLEXITY_API_URL, headers=headers, json=body, timeout=20)
        print("DEBUG perplexity status:", resp.status_code, resp.text[:200])
    except requests.RequestException as e:
        raise HTTPException(status_code=502, detail=f"AI provider error: {e}")

    if resp.status_code != 200:
        # surface real error
        raise HTTPException(status_code=502, detail=f"AI provider returned {resp.status_code}: {resp.text}")

    data = resp.json()
    answer = data["choices"][0]["message"]["content"]
    return AIPromptResponse(answer=answer)
