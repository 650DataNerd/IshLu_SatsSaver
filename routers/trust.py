from fastapi import APIRouter, Depends
from pydantic import BaseModel
from services.trust_score_service import calculate_trust_score, get_score_history
from services.ai_service import get_score_explanation, chat_with_akili
from routers.dependencies import get_current_user

router = APIRouter(prefix="/trust", tags=["trust"])

class ChatRequest(BaseModel):
    message: str

@router.get("/score")
async def get_trust_score(user=Depends(get_current_user)):
    score_data = calculate_trust_score(user["id"])

    # AI explanation is best-effort — score works without it
    try:
        explanation = await get_score_explanation(
            score_data["score"],
            score_data["tier"],
            score_data["breakdown"]
        )
    except Exception as e:
        explanation = f"Trust Score: {score_data['score']} ({score_data['tier']} tier). Add Anthropic API credits to unlock AI coaching."

    return {**score_data, "ai_explanation": explanation}

@router.get("/history")
async def trust_score_history(user=Depends(get_current_user)):
    return get_score_history(user["id"])

@router.post("/chat")
async def akili_chat(req: ChatRequest, user=Depends(get_current_user)):
    score_data = calculate_trust_score(user["id"])
    context = {
        "score": score_data["score"],
        "tier": score_data["tier"],
        "total_sats": 0,
    }
    try:
        reply = await chat_with_akili(req.message, context)
    except Exception:
        reply = "Akili is unavailable right now. Please add Anthropic API credits to enable AI coaching."
    return {"reply": reply}
