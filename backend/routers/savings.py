from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from core.database import supabase
from services.wallet_service import create_invoice, check_invoice_paid, get_wallet_balance
from services.trust_score_service import calculate_trust_score
from routers.dependencies import get_current_user

router = APIRouter(prefix="/savings", tags=["savings"])

class CreateGoalRequest(BaseModel):
    name: str
    target_sats: int
    deadline: str | None = None

class DepositRequest(BaseModel):
    goal_id: str
    amount_sats: int

@router.post("/goals")
async def create_goal(req: CreateGoalRequest, user=Depends(get_current_user)):
    goal = supabase.table("savings_goals").insert({
        "user_id": user["id"],
        "name": req.name,
        "target_sats": req.target_sats,
        "deadline": req.deadline,
    }).execute()
    return goal.data[0]

@router.get("/goals")
async def list_goals(user=Depends(get_current_user)):
    return supabase.table("savings_goals").select("*").eq("user_id", user["id"]).execute().data

@router.post("/deposit/lightning")
async def lightning_deposit(req: DepositRequest, user=Depends(get_current_user)):
    goal = supabase.table("savings_goals").select("*").eq("id", req.goal_id).eq("user_id", user["id"]).execute()
    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    invoice_data = await create_invoice(
        user["id"],
        req.amount_sats,
        f"SatsSaver: {goal.data[0]['name']}"
    )

    supabase.table("transactions").insert({
        "user_id": user["id"],
        "goal_id": req.goal_id,
        "type": "deposit",
        "amount_sats": req.amount_sats,
        "payment_hash": invoice_data["payment_hash"],
        "bolt11": invoice_data["payment_request"],
        "status": "pending"
    }).execute()

    return {
        "bolt11": invoice_data["payment_request"],
        "payment_hash": invoice_data["payment_hash"],
        "amount_sats": req.amount_sats,
        "expires_in": 3600
    }

@router.post("/verify/{payment_hash}")
async def verify_payment(payment_hash: str, user=Depends(get_current_user)):
    is_paid = await check_invoice_paid(user["id"], payment_hash)

    if is_paid:
        txn = supabase.table("transactions").update({"status": "settled"}).eq("payment_hash", payment_hash).eq("user_id", user["id"]).execute()

        if txn.data:
            t = txn.data[0]
            if t.get("goal_id"):
                supabase.rpc("increment_goal_sats", {
                    "goal_id": t["goal_id"],
                    "amount": t["amount_sats"]
                }).execute()

            trust = calculate_trust_score(user["id"])
            return {"paid": True, "transaction": t, "new_trust_score": trust["score"]}

    return {"paid": False}

@router.get("/balance")
async def get_balance(user=Depends(get_current_user)):
    balance_msat = await get_wallet_balance(user["id"])
    goals = supabase.table("savings_goals").select("current_sats").eq("user_id", user["id"]).eq("status", "active").execute().data
    total_saved = sum(g["current_sats"] for g in goals)
    return {
        "wallet_balance_sats": balance_msat // 1000,
        "total_in_goals_sats": total_saved,
    }

class MpesaDepositRequest(BaseModel):
    goal_id: str
    amount_kes: int

@router.post("/deposit/mpesa")
async def mpesa_deposit(req: MpesaDepositRequest, user=Depends(get_current_user)):
    from services.mpesa_service import initiate_stk_push
    
    goal = supabase.table("savings_goals").select("*")\
        .eq("id", req.goal_id).eq("user_id", user["id"]).execute()
    if not goal.data:
        raise HTTPException(status_code=404, detail="Goal not found")

    mpesa_phone = user.get("mpesa_phone") or user["phone"]

    try:
        stk_resp = await initiate_stk_push(
            phone=mpesa_phone,
            amount_kes=req.amount_kes,
            account_ref=req.goal_id[:12]
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"M-Pesa error: {str(e)}")

    if stk_resp.get("ResponseCode") != "0":
        raise HTTPException(
            status_code=400,
            detail=stk_resp.get("errorMessage", "M-Pesa request failed")
        )

    return {
        "checkout_request_id": stk_resp["CheckoutRequestID"],
        "message": "Check your phone for M-Pesa prompt",
        "amount_kes": req.amount_kes
    }

class MpesaQueryRequest(BaseModel):
    checkout_request_id: str
    goal_id: str
    amount_kes: int

@router.post("/deposit/mpesa/verify")
async def verify_mpesa_payment(req: MpesaQueryRequest, user=Depends(get_current_user)):
    from services.mpesa_service import query_stk_status
    KES_TO_SATS = 7.5
    result = await query_stk_status(req.checkout_request_id)
    result_code = str(result.get("ResultCode", ""))
    if result_code == "0":
        amount_sats = int(req.amount_kes * KES_TO_SATS)
        supabase.table("transactions").insert({
            "user_id": user["id"],
            "goal_id": req.goal_id,
            "type": "deposit",
            "amount_sats": amount_sats,
            "status": "settled",
        }).execute()
        supabase.rpc("increment_goal_sats", {
            "goal_id": req.goal_id,
            "amount": amount_sats
        }).execute()
        trust = calculate_trust_score(user["id"])
        return {"paid": True, "amount_sats": amount_sats, "new_trust_score": trust["score"]}
    elif result_code == "1032":
        return {"paid": False, "message": "Cancelled by user"}
    else:
        return {"paid": False, "message": result.get("ResultDesc", "Not confirmed yet")}
